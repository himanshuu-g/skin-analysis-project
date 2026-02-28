from datetime import datetime, timezone

from database.db import get_db, to_object_id

ALLOWED_UPDATE_FIELDS = {
    "title",
    "event_type",
    "priority",
    "event_datetime",
    "description",
    "reminder_minutes",
    "is_completed",
}


def _serialize_schedule_event_document(document):
    if document is None:
        return None

    return {
        "id": str(document.get("_id")),
        "title": document.get("title"),
        "type": document.get("event_type"),
        "priority": document.get("priority"),
        "datetime": document.get("event_datetime"),
        "description": document.get("description") or "",
        "reminder_minutes": int(document.get("reminder_minutes") or 0),
        "completed": bool(document.get("is_completed", False)),
        "created_at": document.get("created_at"),
        "updated_at": document.get("updated_at"),
    }


def _current_timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_schedule_events_for_user(user_id):
    user_object_id = to_object_id(user_id)
    if user_object_id is None:
        return []

    db = get_db()
    documents = (
        db["schedule_events"]
        .find({"user_id": user_object_id})
        .sort([("is_completed", 1), ("event_datetime", 1), ("_id", 1)])
    )
    return [_serialize_schedule_event_document(document) for document in documents]


def get_schedule_event_for_user(user_id, event_id):
    user_object_id = to_object_id(user_id)
    event_object_id = to_object_id(event_id)
    if user_object_id is None or event_object_id is None:
        return None

    db = get_db()
    document = db["schedule_events"].find_one(
        {"_id": event_object_id, "user_id": user_object_id}
    )
    return _serialize_schedule_event_document(document)


def create_schedule_event_for_user(
    user_id,
    title,
    event_type,
    priority,
    event_datetime,
    description="",
    reminder_minutes=30,
    is_completed=False,
):
    user_object_id = to_object_id(user_id)
    if user_object_id is None:
        return None

    now_text = _current_timestamp()
    event_document = {
        "user_id": user_object_id,
        "title": title,
        "event_type": event_type,
        "priority": priority,
        "event_datetime": event_datetime,
        "description": description or "",
        "reminder_minutes": int(reminder_minutes),
        "is_completed": bool(is_completed),
        "created_at": now_text,
        "updated_at": now_text,
    }

    db = get_db()
    insert_result = db["schedule_events"].insert_one(event_document)
    return get_schedule_event_for_user(user_id, str(insert_result.inserted_id))


def update_schedule_event_for_user(user_id, event_id, updates):
    existing_event = get_schedule_event_for_user(user_id, event_id)
    if existing_event is None:
        return None

    safe_updates = {
        key: value for key, value in (updates or {}).items() if key in ALLOWED_UPDATE_FIELDS
    }
    if not safe_updates:
        return existing_event

    if "reminder_minutes" in safe_updates:
        safe_updates["reminder_minutes"] = int(safe_updates["reminder_minutes"])
    if "is_completed" in safe_updates:
        safe_updates["is_completed"] = bool(safe_updates["is_completed"])

    safe_updates["updated_at"] = _current_timestamp()

    user_object_id = to_object_id(user_id)
    event_object_id = to_object_id(event_id)
    if user_object_id is None or event_object_id is None:
        return None

    db = get_db()
    db["schedule_events"].update_one(
        {"_id": event_object_id, "user_id": user_object_id},
        {"$set": safe_updates},
    )
    return get_schedule_event_for_user(user_id, event_id)


def delete_schedule_event_for_user(user_id, event_id):
    user_object_id = to_object_id(user_id)
    event_object_id = to_object_id(event_id)
    if user_object_id is None or event_object_id is None:
        return False

    db = get_db()
    delete_result = db["schedule_events"].delete_one(
        {"_id": event_object_id, "user_id": user_object_id}
    )
    return delete_result.deleted_count > 0
