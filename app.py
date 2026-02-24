import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
from hmac import compare_digest
from sqlite3 import IntegrityError
from uuid import uuid4

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from PIL import Image, UnidentifiedImageError
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from database.auth import create_user, get_user_by_email, get_user_by_id
from database.db import get_db
from database.save_result import (
    delete_result_for_user,
    get_result_for_user,
    get_results_for_user,
    save_result as save_analysis_result,
)
from preprocessing.image_preprocess import preprocess_image
from recommender.products import get_recommendations

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "dev-insecure-secret-change-me"
    print("[WARN] SECRET_KEY not set. Using insecure development fallback.")

app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("SESSION_COOKIE_SECURE", "0") == "1"
# Avoid stale template/static caching during active UI edits.
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
app.jinja_env.auto_reload = True

UPLOAD_FOLDER = "static/uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/webp"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "BMP", "WEBP"}
MAX_UPLOAD_SIZE_MB = 5
DEFAULT_RESULTS_LIMIT = 20
MAX_RESULTS_LIMIT = 100
CSRF_SESSION_KEY = "csrf_token"
AUTH_NOTICE_SESSION_KEY = "auth_notice"
CONTACT_NUMBER_REGEX = re.compile(r"^\+?\d{10,15}$")
AUTH_NOTICE_MESSAGES = {
    "login_success": "Login successful.",
    "logout_success": "Logout successful.",
}

app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_SIZE_MB * 1024 * 1024
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def _json_error(message, status=400):
    return jsonify({"error": message}), status


def _build_upload_path(filename):
    safe_name = secure_filename(filename or "")
    if not safe_name:
        raise ValueError("Invalid filename.")

    extension = os.path.splitext(safe_name)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Use JPG, JPEG, PNG, BMP, or WEBP.")

    unique_name = f"{uuid4().hex}{extension}"
    return os.path.join(UPLOAD_FOLDER, unique_name)


def _is_safe_next_url(next_url):
    return bool(next_url) and next_url.startswith("/")


def _is_api_request():
    return request.path.startswith("/api/")


def _normalize_contact_number(raw_contact_number):
    contact_number = str(raw_contact_number or "").strip()
    if not contact_number:
        return ""

    keep_plus_prefix = contact_number.startswith("+")
    digits_only = re.sub(r"\D", "", contact_number)
    if keep_plus_prefix:
        return f"+{digits_only}"
    return digits_only


def _is_valid_contact_number(contact_number):
    return bool(CONTACT_NUMBER_REGEX.fullmatch(str(contact_number or "")))


def _get_or_create_csrf_token():
    token = session.get(CSRF_SESSION_KEY)
    if not token:
        token = secrets.token_urlsafe(32)
        session[CSRF_SESSION_KEY] = token
    return token


def _set_auth_notice(notice_key):
    if notice_key in AUTH_NOTICE_MESSAGES:
        session[AUTH_NOTICE_SESSION_KEY] = notice_key


def _pop_auth_notice():
    notice_key = str(session.pop(AUTH_NOTICE_SESSION_KEY, "")).strip()
    return AUTH_NOTICE_MESSAGES.get(notice_key, "")


def _is_valid_csrf_token():
    expected_token = session.get(CSRF_SESSION_KEY)
    submitted_token = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
    if not expected_token or not submitted_token:
        return False
    return compare_digest(expected_token, submitted_token)


def _get_payload():
    json_payload = request.get_json(silent=True)
    if isinstance(json_payload, dict):
        return json_payload
    return request.form


def _serialize_user(user_row):
    created_at = user_row["created_at"] if "created_at" in user_row.keys() else None
    return {
        "id": user_row["id"],
        "name": user_row["name"],
        "email": user_row["email"],
        "contact_number": user_row["contact_number"] if "contact_number" in user_row.keys() else "",
        "created_at": created_at,
    }


def _parse_results_limit(raw_limit):
    if raw_limit is None:
        return DEFAULT_RESULTS_LIMIT
    try:
        limit = int(raw_limit)
    except ValueError:
        return DEFAULT_RESULTS_LIMIT
    return max(1, min(limit, MAX_RESULTS_LIMIT))


def _get_user_first_name(full_name):
    name = str(full_name or "").strip()
    if not name:
        return "User"
    return name.split()[0]


def _get_user_initials(full_name):
    name = str(full_name or "").strip()
    if not name:
        return "U"

    parts = [part for part in name.split() if part]
    if len(parts) == 1:
        return parts[0][0].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


def _get_day_period_greeting(current_hour):
    if current_hour < 12:
        return "Good Morning"
    if current_hour < 17:
        return "Good Afternoon"
    return "Good Evening"


def _build_auth_header_context():
    user_name = session.get("user_name", "User")
    local_now = datetime.now().astimezone()
    date_label = f"{local_now.strftime('%A')}, {local_now.strftime('%B')} {local_now.day}, {local_now.year}"

    return {
        "auth_user_name": user_name,
        "auth_user_first_name": _get_user_first_name(user_name),
        "auth_user_initials": _get_user_initials(user_name),
        "auth_greeting": _get_day_period_greeting(local_now.hour),
        "auth_date_label": date_label,
        "auth_notification_count": 3,
    }


def _format_result_timestamp(raw_timestamp):
    parsed_time = _parse_result_datetime(raw_timestamp)
    if parsed_time is not None:
        return parsed_time.strftime("%d %b %Y, %I:%M:%S %p")
    return str(raw_timestamp or "").strip()


def _parse_result_datetime(raw_timestamp):
    if not raw_timestamp:
        return None

    timestamp_text = str(raw_timestamp).strip()
    normalized_text = timestamp_text.replace("Z", "+00:00")

    try:
        parsed_time = datetime.fromisoformat(normalized_text)
        if parsed_time.tzinfo is None:
            parsed_time = parsed_time.replace(tzinfo=timezone.utc)
        return parsed_time.astimezone()
    except ValueError:
        pass

    formats = (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    )
    for time_format in formats:
        try:
            parsed_time = datetime.strptime(timestamp_text, time_format)
            parsed_time = parsed_time.replace(tzinfo=timezone.utc)
            return parsed_time.astimezone()
        except ValueError:
            continue

    return None


def _format_score_value(score):
    rounded = round(float(score), 1)
    if rounded.is_integer():
        return str(int(rounded))
    return f"{rounded:.1f}"


def _extract_routine_steps(raw_steps, max_steps=4):
    cleaned_steps = []
    for raw_step in raw_steps or []:
        text = re.sub(r"^\s*\d+\s*[\).:-]?\s*", "", str(raw_step or "").strip())
        if not text:
            continue
        cleaned_steps.append({"label": text, "time_hint": ""})
        if len(cleaned_steps) >= max_steps:
            break
    return cleaned_steps


def _build_dashboard_stats(user_id):
    local_now = datetime.now().astimezone()
    next_checkup_in_days = 5
    next_checkup_date = local_now + timedelta(days=next_checkup_in_days)

    stats = {
        "total_scans": 0,
        "scans_this_month": 0,
        "avg_score": "0",
        "avg_score_change_text": "No scans yet",
        "active_days": 0,
        "active_days_subtext": "Start with your first scan",
        "next_checkup_date": f"{next_checkup_date.strftime('%b')} {next_checkup_date.day}",
        "next_checkup_in_days": next_checkup_in_days,
        "overall_health_score": 0,
        "overall_health_score_label": "0",
        "overall_health_skin_type_label": "No Scan",
        "dry_signal": "0",
        "normal_signal": "0",
        "oily_signal": "0",
        "routine_has_data": False,
        "routine_badge": "0/0",
        "routine_skin_type_label": "",
        "routine_morning_steps": [],
        "routine_evening_steps": [],
        "routine_empty_message": "Start your first analysis to get personalized skincare steps.",
    }

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT confidence, created_at, skin_type, class_probabilities_json
            FROM results
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (int(user_id),),
        )
        rows = cursor.fetchall()
    finally:
        conn.close()

    if not rows:
        return stats

    stats["total_scans"] = len(rows)
    latest_row = rows[0]

    current_year = local_now.year
    current_month = local_now.month
    if current_month == 1:
        previous_month = 12
        previous_month_year = current_year - 1
    else:
        previous_month = current_month - 1
        previous_month_year = current_year

    all_confidences = []
    current_month_confidences = []
    previous_month_confidences = []
    active_dates = set()

    for row in rows:
        confidence_value = None
        raw_confidence = row["confidence"]
        if raw_confidence is not None:
            try:
                confidence_value = float(raw_confidence)
            except (TypeError, ValueError):
                confidence_value = None

        if confidence_value is not None:
            all_confidences.append(confidence_value)

        parsed_time = _parse_result_datetime(row["created_at"])
        if parsed_time is None:
            continue

        active_dates.add(parsed_time.date())

        if parsed_time.year == current_year and parsed_time.month == current_month:
            stats["scans_this_month"] += 1
            if confidence_value is not None:
                current_month_confidences.append(confidence_value)

        if parsed_time.year == previous_month_year and parsed_time.month == previous_month:
            if confidence_value is not None:
                previous_month_confidences.append(confidence_value)

    if all_confidences:
        overall_avg_score = sum(all_confidences) / len(all_confidences)
        stats["avg_score"] = _format_score_value(overall_avg_score)

    stats["active_days"] = len(active_dates)
    if stats["active_days"] > 0:
        stats["active_days_subtext"] = "Days with at least one scan"

    if current_month_confidences and previous_month_confidences:
        current_month_avg = sum(current_month_confidences) / len(current_month_confidences)
        previous_month_avg = sum(previous_month_confidences) / len(previous_month_confidences)
        delta = current_month_avg - previous_month_avg
        delta_label = _format_score_value(abs(delta))
        if delta > 0:
            stats["avg_score_change_text"] = f"+{delta_label} from last month"
        elif delta < 0:
            stats["avg_score_change_text"] = f"-{delta_label} from last month"
        else:
            stats["avg_score_change_text"] = "No change from last month"
    elif current_month_confidences:
        stats["avg_score_change_text"] = "No last month data"
    elif previous_month_confidences:
        stats["avg_score_change_text"] = "No scans this month"

    latest_confidence_value = None
    if latest_row["confidence"] is not None:
        try:
            latest_confidence_value = float(latest_row["confidence"])
        except (TypeError, ValueError):
            latest_confidence_value = None

    if latest_confidence_value is not None:
        clamped_score = max(0.0, min(100.0, latest_confidence_value))
        stats["overall_health_score"] = round(clamped_score, 1)
        stats["overall_health_score_label"] = _format_score_value(clamped_score)

    latest_skin_type = str(latest_row["skin_type"] or "").strip().lower()
    if latest_skin_type:
        stats["overall_health_skin_type_label"] = latest_skin_type.capitalize()

        recommendations = get_recommendations(latest_skin_type)
        routine = recommendations.get("routine", {}) if isinstance(recommendations, dict) else {}
        morning_steps = _extract_routine_steps(routine.get("morning", []))
        evening_steps = _extract_routine_steps(routine.get("evening", []))
        routine_total_steps = max(len(morning_steps), len(evening_steps))

        if routine_total_steps > 0:
            stats["routine_has_data"] = True
            stats["routine_skin_type_label"] = latest_skin_type.capitalize()
            stats["routine_morning_steps"] = morning_steps
            stats["routine_evening_steps"] = evening_steps
            stats["routine_badge"] = f"0/{routine_total_steps}"

    raw_probabilities = latest_row["class_probabilities_json"] or "{}"
    try:
        parsed_probabilities = json.loads(raw_probabilities)
    except json.JSONDecodeError:
        parsed_probabilities = {}

    has_probability_signal = False
    if isinstance(parsed_probabilities, dict):
        for signal_key, result_key in (
            ("dry", "dry_signal"),
            ("normal", "normal_signal"),
            ("oily", "oily_signal"),
        ):
            raw_probability = parsed_probabilities.get(signal_key, 0)
            try:
                probability_percent = max(0.0, min(100.0, float(raw_probability) * 100))
            except (TypeError, ValueError):
                probability_percent = 0.0
            if probability_percent > 0:
                has_probability_signal = True
            stats[result_key] = _format_score_value(probability_percent)

    if not has_probability_signal and latest_skin_type in {"dry", "normal", "oily"}:
        stats[f"{latest_skin_type}_signal"] = "100"

    return stats


def _build_dashboard_history_items(user_id, limit=MAX_RESULTS_LIMIT):
    results = get_results_for_user(user_id, limit=limit)
    history_items = []

    for index, row in enumerate(results):
        parsed_time = _parse_result_datetime(row.get("created_at"))
        if parsed_time is not None:
            display_date = parsed_time.strftime("%b %d, %Y")
        else:
            display_date = str(row.get("created_at") or "").strip()

        raw_skin_type = str(row.get("skin_type") or "").strip().lower()
        skin_type_label = raw_skin_type.capitalize() if raw_skin_type else "Unknown"
        if raw_skin_type == "normal":
            status_label = "Healthy"
            status_class = "is-healthy"
        elif raw_skin_type in {"dry", "oily"}:
            status_label = "Attention"
            status_class = "is-attention"
        else:
            status_label = "Review"
            status_class = "is-neutral"

        confidence_label = "0"
        confidence_value = None
        raw_confidence = row.get("confidence")
        if raw_confidence is not None:
            try:
                confidence_value = float(raw_confidence)
                confidence_label = _format_score_value(confidence_value)
            except (TypeError, ValueError):
                confidence_label = "0"

        trend_text = "Baseline"
        trend_class = "is-neutral"
        if confidence_value is not None and index + 1 < len(results):
            next_raw_confidence = results[index + 1].get("confidence")
            try:
                previous_confidence = float(next_raw_confidence)
            except (TypeError, ValueError):
                previous_confidence = None

            if previous_confidence is not None:
                delta = round(confidence_value - previous_confidence, 1)
                if abs(delta) < 0.1:
                    trend_text = "No change"
                    trend_class = "is-neutral"
                elif delta > 0:
                    trend_text = f"+{_format_score_value(delta)}"
                    trend_class = "is-up"
                else:
                    trend_text = _format_score_value(delta)
                    trend_class = "is-down"

        summary_text = f"{skin_type_label} skin profile - confidence {confidence_label}%"
        image_url = row.get("image_url") or url_for("static", filename="uploads/IMAGE 2 SCP.jpg")

        history_items.append(
            {
                "id": row["id"],
                "display_date": display_date,
                "summary_text": summary_text,
                "score": confidence_label,
                "image_url": image_url,
                "status_label": status_label,
                "status_class": status_class,
                "trend_text": trend_text,
                "trend_class": trend_class,
            }
        )

    return history_items


def _build_history_overview(history_items):
    overview = {
        "total_scans": "0",
        "since_label": "No scans yet",
        "average_score": "0",
        "average_score_note": "No scans available",
        "best_score": "0",
        "best_score_date": "No scans available",
    }

    if not history_items:
        return overview

    overview["total_scans"] = str(len(history_items))
    overview["since_label"] = f"Since {history_items[-1].get('display_date', 'N/A')}"

    scores = []
    best_item = None
    for item in history_items:
        raw_score = item.get("score")
        try:
            score_value = float(raw_score)
        except (TypeError, ValueError):
            continue

        scores.append(score_value)
        if best_item is None or score_value > best_item[0]:
            best_item = (score_value, item)

    if scores:
        average_score = sum(scores) / len(scores)
        overview["average_score"] = _format_score_value(average_score)
        overview["average_score_note"] = "Across all scans"

    if best_item:
        overview["best_score"] = _format_score_value(best_item[0])
        overview["best_score_date"] = best_item[1].get("display_date", "N/A")

    return overview


def csrf_protect(view_func):
    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"} and not _is_valid_csrf_token():
            if _is_api_request():
                return _json_error("Invalid or missing CSRF token.", 400)
            return "Invalid or missing CSRF token.", 400
        return view_func(*args, **kwargs)

    return wrapped_view


def _validate_image_file(image_file):
    if image_file.mimetype not in ALLOWED_MIME_TYPES:
        raise ValueError("Unsupported image MIME type. Use JPG, JPEG, PNG, BMP, or WEBP.")

    try:
        image_file.stream.seek(0)
        pil_image = Image.open(image_file.stream)
        pil_image.verify()
        detected_format = (pil_image.format or "").upper()
    except (UnidentifiedImageError, OSError):
        raise ValueError("Uploaded file is not a valid image.") from None
    finally:
        image_file.stream.seek(0)

    if detected_format not in ALLOWED_IMAGE_FORMATS:
        raise ValueError("Unsupported image content. Use JPG, JPEG, PNG, BMP, or WEBP.")


def _analyze_uploaded_image(image_file):
    if not image_file or not image_file.filename:
        raise ValueError("No image selected.")

    _validate_image_file(image_file)
    image_path = _build_upload_path(image_file.filename)
    image_file.save(image_path)

    try:
        img_result = preprocess_image(image_path)
    except Exception:
        if os.path.exists(image_path):
            os.remove(image_path)
        raise

    skin_type = img_result["skin_type"]
    recommendations = get_recommendations(skin_type)
    confidence_percent = round(float(img_result["confidence"]) * 100, 2)
    image_path_for_ui = image_path.replace("\\", "/")
    gradcam_image_for_ui = img_result["gradcam"].replace("\\", "/")
    class_probabilities = img_result.get("class_probabilities", {})
    is_low_confidence = bool(img_result.get("is_low_confidence", False))
    model_version = img_result.get("model_version")
    inference_ms = img_result.get("inference_ms")

    result_id = save_analysis_result(
        user_id=session.get("user_id"),
        skin_type=skin_type,
        confidence=confidence_percent,
        image_path=image_path_for_ui,
        gradcam_image_path=gradcam_image_for_ui,
        model_version=model_version,
        class_probabilities=class_probabilities,
        is_low_confidence=is_low_confidence,
        inference_ms=inference_ms,
    )

    return {
        "result_id": result_id,
        "skin_type": skin_type,
        "confidence": confidence_percent,
        "image_path": image_path_for_ui,
        "image_url": f"/{image_path_for_ui}",
        "gradcam_image": gradcam_image_for_ui,
        "gradcam_url": f"/{gradcam_image_for_ui}",
        "recommendations": recommendations,
        "is_low_confidence": is_low_confidence,
        "class_probabilities": class_probabilities,
        "model_version": model_version,
        "inference_ms": inference_ms,
    }


def _build_fallback_gradcam_path(image_path):
    if not image_path:
        return ""

    normalized_path = str(image_path).replace("\\", "/").lstrip("/")
    file_name = os.path.basename(normalized_path)
    if not file_name:
        return normalized_path

    fallback_path = os.path.join("static", "gradcam", f"gradcam_{file_name}").replace("\\", "/")
    if os.path.exists(fallback_path):
        return fallback_path
    return normalized_path


def _remove_result_artifacts(*paths):
    for raw_path in {path for path in paths if path}:
        normalized_path = str(raw_path).replace("\\", "/").lstrip("/")
        if not normalized_path.startswith(("static/uploads/", "static/gradcam/")):
            continue

        file_path = os.path.normpath(normalized_path)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except OSError:
                continue


def login_required(view_func):
    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if not session.get("user_id"):
            if _is_api_request():
                return _json_error("Authentication required.", 401)
            return redirect(url_for("login", next=request.path))
        return view_func(*args, **kwargs)

    return wrapped_view


@app.context_processor
def inject_csrf_token():
    context = {"csrf_token": _get_or_create_csrf_token}
    if session.get("user_id"):
        context.update(_build_auth_header_context())
    return context


@app.errorhandler(413)
def request_entity_too_large(_err):
    message = f"Uploaded file is too large. Maximum size is {MAX_UPLOAD_SIZE_MB} MB."
    if _is_api_request():
        return _json_error(message, 413)
    return message, 413


@app.route("/", methods=["GET"])
def home():
    if session.get("user_id"):
        return redirect(url_for("analyzer"))
    return render_template("home.html", auth_notice=_pop_auth_notice())


@app.route("/signup", methods=["GET", "POST"])
@csrf_protect
def signup():
    if session.get("user_id"):
        return redirect(url_for("analyzer"))

    error = ""
    form_name = ""
    form_email = ""
    form_contact_number = ""

    if request.method == "POST":
        form_name = request.form.get("name", "").strip()
        form_email = request.form.get("email", "").strip().lower()
        form_contact_number = _normalize_contact_number(request.form.get("contact_number", ""))
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not form_name:
            error = "Name is required."
        elif not form_email:
            error = "Email is required."
        elif not form_contact_number:
            error = "Contact number is required."
        elif not _is_valid_contact_number(form_contact_number):
            error = "Enter a valid contact number (10 to 15 digits, optional + prefix)."
        elif not password:
            error = "Password is required."
        elif len(password) < 8:
            error = "Password must be at least 8 characters."
        elif password != confirm_password:
            error = "Passwords do not match."
        elif get_user_by_email(form_email):
            error = "An account with this email already exists."
        else:
            try:
                user_id = create_user(
                    name=form_name,
                    email=form_email,
                    contact_number=form_contact_number,
                    password_hash=generate_password_hash(password),
                )
            except IntegrityError:
                error = "An account with this email already exists."
            else:
                session.clear()
                session["user_id"] = user_id
                session["user_name"] = form_name
                session["user_email"] = form_email
                session["user_contact_number"] = form_contact_number
                session["show_onboarding"] = True
                return redirect(url_for("analyzer"))

    return render_template(
        "signup.html",
        error=error,
        form_name=form_name,
        form_email=form_email,
        form_contact_number=form_contact_number,
    )


@app.route("/login", methods=["GET", "POST"])
@csrf_protect
def login():
    if session.get("user_id"):
        return redirect(url_for("analyzer"))

    error = ""
    form_email = ""
    next_url = request.args.get("next", "")

    if request.method == "POST":
        form_email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        next_url = request.form.get("next", "")

        user = get_user_by_email(form_email) if form_email else None
        if not user or not check_password_hash(user["password_hash"], password):
            error = "Invalid email or password."
        else:
            session.clear()
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["user_email"] = user["email"]
            session["user_contact_number"] = user["contact_number"]
            session["show_onboarding"] = True
            _set_auth_notice("login_success")
            if _is_safe_next_url(next_url):
                return redirect(next_url)
            return redirect(url_for("analyzer"))

    return render_template(
        "login.html",
        error=error,
        form_email=form_email,
        next_url=next_url,
    )


@app.route("/logout", methods=["GET"])
def logout():
    session.clear()
    _set_auth_notice("logout_success")
    return redirect(url_for("home"))


@app.route("/analyzer", methods=["GET"])
@login_required
def analyzer():
    user_name = session.get("user_name", "")
    name_parts = user_name.strip().split(None, 1)
    first_name = name_parts[0] if name_parts else ""
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    show_onboarding = bool(session.pop("show_onboarding", False))
    auth_notice = _pop_auth_notice()
    dashboard_stats = _build_dashboard_stats(session["user_id"])
    history_items = _build_dashboard_history_items(session["user_id"], limit=MAX_RESULTS_LIMIT)
    history_overview = _build_history_overview(history_items)
    return render_template(
        "index.html",
        dashboard_stats=dashboard_stats,
        history_items=history_items,
        history_overview=history_overview,
        settings_first_name=first_name,
        settings_last_name=last_name,
        settings_email=session.get("user_email", ""),
        settings_contact_number=session.get("user_contact_number", ""),
        show_onboarding=show_onboarding,
        auth_notice=auth_notice,
    )


@app.route("/settings", methods=["GET"])
@login_required
def settings():
    return redirect(url_for("analyzer", _anchor="dashboard-settings"))


@app.route("/history", methods=["GET"])
@login_required
def history():
    return redirect(url_for("analyzer", _anchor="dashboard-history-view"))


@app.route("/history/<int:result_id>", methods=["GET"])
@login_required
def history_detail(result_id):
    result = get_result_for_user(session["user_id"], result_id)
    if result is None:
        return redirect(url_for("analyzer"))

    gradcam_image = result.get("gradcam_image_path") or _build_fallback_gradcam_path(
        result.get("image_path")
    )

    return render_template(
        "result.html",
        skin=result["skin_type"],
        image_path=result["image_path"],
        cnn_confidence=result.get("confidence", 0.0) or 0.0,
        gradcam_image=gradcam_image,
        recommendations=get_recommendations(result["skin_type"]),
        is_low_confidence=result.get("is_low_confidence", False),
        class_probabilities=result.get("class_probabilities", {}),
        from_history=True,
        history_timestamp=_format_result_timestamp(result.get("created_at")),
    )


@app.route("/history/<int:result_id>/delete", methods=["POST"])
@login_required
@csrf_protect
def history_delete(result_id):
    deleted_result = delete_result_for_user(session["user_id"], result_id)
    if deleted_result:
        _remove_result_artifacts(
            deleted_result.get("image_path"),
            deleted_result.get("gradcam_image_path"),
        )
    return redirect(url_for("analyzer", _anchor="dashboard-history-view"))


@app.route("/analyze", methods=["POST"])
@login_required
@csrf_protect
def analyze():
    if "image" not in request.files:
        return "No image file found in request.", 400

    try:
        analysis = _analyze_uploaded_image(request.files["image"])
    except ValueError as err:
        return str(err), 400

    return render_template(
        "result.html",
        skin=analysis["skin_type"],
        image_path=analysis["image_path"],
        cnn_confidence=analysis["confidence"],
        gradcam_image=analysis["gradcam_image"],
        recommendations=analysis["recommendations"],
        is_low_confidence=analysis["is_low_confidence"],
        class_probabilities=analysis["class_probabilities"],
    )


@app.route("/api/csrf-token", methods=["GET"])
def api_csrf_token():
    return jsonify({"csrf_token": _get_or_create_csrf_token()})


@app.route("/api/auth/signup", methods=["POST"])
@csrf_protect
def api_signup():
    payload = _get_payload()
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    contact_number = _normalize_contact_number(payload.get("contact_number", ""))
    password = str(payload.get("password", ""))
    confirm_password = str(payload.get("confirm_password", ""))

    if not name:
        return _json_error("Name is required.")
    if not email:
        return _json_error("Email is required.")
    if not contact_number:
        return _json_error("Contact number is required.")
    if not _is_valid_contact_number(contact_number):
        return _json_error("Enter a valid contact number (10 to 15 digits, optional + prefix).")
    if not password:
        return _json_error("Password is required.")
    if len(password) < 8:
        return _json_error("Password must be at least 8 characters.")
    if password != confirm_password:
        return _json_error("Passwords do not match.")
    if get_user_by_email(email):
        return _json_error("An account with this email already exists.", 409)

    try:
        user_id = create_user(
            name=name,
            email=email,
            contact_number=contact_number,
            password_hash=generate_password_hash(password),
        )
    except IntegrityError:
        return _json_error("An account with this email already exists.", 409)

    user = get_user_by_id(user_id)
    session.clear()
    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    session["user_email"] = user["email"]
    session["user_contact_number"] = user["contact_number"]
    session["show_onboarding"] = True
    _set_auth_notice("login_success")

    return (
        jsonify(
            {
                "message": "Account created.",
                "user": _serialize_user(user),
                "csrf_token": _get_or_create_csrf_token(),
            }
        ),
        201,
    )


@app.route("/api/auth/login", methods=["POST"])
@csrf_protect
def api_login():
    payload = _get_payload()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    user = get_user_by_email(email) if email else None
    if not user or not check_password_hash(user["password_hash"], password):
        return _json_error("Invalid email or password.", 401)

    session.clear()
    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    session["user_email"] = user["email"]
    session["user_contact_number"] = user["contact_number"]
    session["show_onboarding"] = True
    _set_auth_notice("login_success")

    return jsonify(
        {
            "message": "Logged in.",
            "user": _serialize_user(user),
            "csrf_token": _get_or_create_csrf_token(),
        }
    )


@app.route("/api/auth/me", methods=["GET"])
@login_required
def api_me():
    user = get_user_by_id(session["user_id"])
    if not user:
        session.clear()
        return _json_error("Session expired.", 401)
    return jsonify({"user": _serialize_user(user)})


@app.route("/api/auth/logout", methods=["POST"])
@login_required
@csrf_protect
def api_logout():
    session.clear()
    _set_auth_notice("logout_success")
    return jsonify({"message": "Logged out.", "auth_notice": AUTH_NOTICE_MESSAGES["logout_success"]})


@app.route("/api/results", methods=["GET"])
@login_required
def api_results():
    limit = _parse_results_limit(request.args.get("limit"))
    results = get_results_for_user(session["user_id"], limit=limit)
    return jsonify({"results": results, "count": len(results)})


@app.route("/api/analyze", methods=["POST"])
@login_required
@csrf_protect
def api_analyze():
    if "image" not in request.files:
        return _json_error("No image file found in request.")

    try:
        analysis = _analyze_uploaded_image(request.files["image"])
    except ValueError as err:
        return _json_error(str(err))

    analysis["dashboard_stats"] = _build_dashboard_stats(session["user_id"])
    return jsonify(analysis), 200


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "0") == "1")
