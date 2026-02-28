import os
from datetime import datetime, timezone

from bson import ObjectId

from database.db import get_db, to_object_id


def _current_timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _object_id_text(raw_value):
    if isinstance(raw_value, ObjectId):
        return str(raw_value)
    if raw_value is None:
        return ""
    return str(raw_value)


def _admin_email_set():
    raw_value = str(os.environ.get("ADMIN_EMAILS", "") or "")
    return {entry.strip().lower() for entry in raw_value.split(",") if entry.strip()}


def _resolve_role(email, role=None):
    role_text = str(role or "").strip().lower()
    if role_text in {"admin", "user"}:
        return role_text

    email_text = str(email or "").strip().lower()
    if email_text and email_text in _admin_email_set():
        return "admin"
    return "user"


def get_admin_overview():
    db = get_db()
    return {
        "users": int(db["users"].count_documents({})),
        "results": int(db["results"].count_documents({})),
        "schedule_events": int(db["schedule_events"].count_documents({})),
        "products": int(db["products"].count_documents({})),
        "generated_at": _current_timestamp(),
    }


def get_recent_users(limit=20):
    db = get_db()
    cursor = (
        db["users"]
        .find(
            {},
            {
                "name": 1,
                "email": 1,
                "contact_number": 1,
                "role": 1,
                "created_at": 1,
            },
        )
        .sort([("_id", -1)])
        .limit(max(1, int(limit)))
    )

    users = []
    for document in cursor:
        email = document.get("email", "")
        users.append(
            {
                "id": str(document.get("_id")),
                "name": document.get("name", ""),
                "email": email,
                "contact_number": document.get("contact_number", ""),
                "role": _resolve_role(email, document.get("role")),
                "created_at": document.get("created_at"),
            }
        )
    return users


def _build_user_lookup(db, object_ids):
    if not object_ids:
        return {}

    cursor = db["users"].find(
        {"_id": {"$in": list(object_ids)}},
        {"name": 1, "email": 1},
    )
    return {
        str(document.get("_id")): {
            "name": document.get("name", ""),
            "email": document.get("email", ""),
        }
        for document in cursor
    }


def get_recent_results(limit=20):
    db = get_db()
    documents = list(
        db["results"]
        .find(
            {},
            {
                "user_id": 1,
                "skin_type": 1,
                "confidence": 1,
                "is_low_confidence": 1,
                "model_version": 1,
                "inference_ms": 1,
                "created_at": 1,
            },
        )
        .sort([("_id", -1)])
        .limit(max(1, int(limit)))
    )

    user_object_ids = {
        raw_value
        for raw_value in (document.get("user_id") for document in documents)
        if isinstance(raw_value, ObjectId)
    }
    user_lookup = _build_user_lookup(db, user_object_ids)

    results = []
    for document in documents:
        user_id = _object_id_text(document.get("user_id"))
        user_meta = user_lookup.get(user_id, {})
        results.append(
            {
                "id": str(document.get("_id")),
                "user_id": user_id or None,
                "user_name": user_meta.get("name", ""),
                "user_email": user_meta.get("email", ""),
                "skin_type": document.get("skin_type"),
                "confidence": document.get("confidence"),
                "is_low_confidence": bool(document.get("is_low_confidence", False)),
                "model_version": document.get("model_version"),
                "inference_ms": document.get("inference_ms"),
                "created_at": document.get("created_at"),
            }
        )
    return results


def get_recent_schedule_events(limit=20):
    db = get_db()
    documents = list(
        db["schedule_events"]
        .find(
            {},
            {
                "user_id": 1,
                "title": 1,
                "event_type": 1,
                "priority": 1,
                "event_datetime": 1,
                "description": 1,
                "reminder_minutes": 1,
                "is_completed": 1,
                "created_at": 1,
                "updated_at": 1,
            },
        )
        .sort([("_id", -1)])
        .limit(max(1, int(limit)))
    )

    user_object_ids = {
        raw_value
        for raw_value in (document.get("user_id") for document in documents)
        if isinstance(raw_value, ObjectId)
    }
    user_lookup = _build_user_lookup(db, user_object_ids)

    events = []
    for document in documents:
        user_id = _object_id_text(document.get("user_id"))
        user_meta = user_lookup.get(user_id, {})
        events.append(
            {
                "id": str(document.get("_id")),
                "user_id": user_id or None,
                "user_name": user_meta.get("name", ""),
                "user_email": user_meta.get("email", ""),
                "title": document.get("title"),
                "event_type": document.get("event_type"),
                "priority": document.get("priority"),
                "event_datetime": document.get("event_datetime"),
                "description": document.get("description") or "",
                "reminder_minutes": int(document.get("reminder_minutes") or 0),
                "is_completed": bool(document.get("is_completed", False)),
                "created_at": document.get("created_at"),
                "updated_at": document.get("updated_at"),
            }
        )
    return events


def log_admin_audit(admin_user_id, action, request_path="", metadata=None):
    db = get_db()
    user_object_id = to_object_id(admin_user_id)
    db["admin_audit"].insert_one(
        {
            "admin_user_id": user_object_id,
            "action": str(action or "").strip() or "unknown",
            "request_path": str(request_path or "").strip(),
            "metadata": metadata if isinstance(metadata, dict) else {},
            "created_at": _current_timestamp(),
        }
    )
