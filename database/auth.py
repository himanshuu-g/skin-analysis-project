import os
from datetime import datetime, timezone

from database.db import get_db, to_object_id


def _current_timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _serialize_user_document(document):
    if not document:
        return None

    resolved_role = _resolve_role(document.get("email"), document.get("role"))

    return {
        "id": str(document.get("_id")),
        "name": document.get("name", ""),
        "email": document.get("email", ""),
        "contact_number": document.get("contact_number", ""),
        "role": resolved_role,
        "password_hash": document.get("password_hash", ""),
        "created_at": document.get("created_at"),
    }


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


def get_user_by_email(email):
    normalized_email = str(email or "").strip().lower()
    if not normalized_email:
        return None

    db = get_db()
    user = db["users"].find_one({"email": normalized_email})
    return _serialize_user_document(user)


def get_user_by_id(user_id):
    object_id = to_object_id(user_id)
    if object_id is None:
        return None

    db = get_db()
    user = db["users"].find_one({"_id": object_id})
    return _serialize_user_document(user)


def create_user(name, email, contact_number, password_hash):
    normalized_email = str(email or "").strip().lower()
    resolved_role = _resolve_role(normalized_email)

    user_document = {
        "name": str(name or "").strip(),
        "email": normalized_email,
        "contact_number": str(contact_number or "").strip(),
        "role": resolved_role,
        "password_hash": password_hash,
        "created_at": _current_timestamp(),
    }

    db = get_db()
    insert_result = db["users"].insert_one(user_document)
    return str(insert_result.inserted_id)
