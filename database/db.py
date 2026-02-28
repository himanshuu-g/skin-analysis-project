import os
from threading import Lock

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING, MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "skin_analysis")
MONGO_SERVER_SELECTION_TIMEOUT_MS = int(
    os.environ.get("MONGO_SERVER_SELECTION_TIMEOUT_MS", "5000")
)

_client_lock = Lock()
_client = None
_indexes_ready = False


def _build_client():
    return MongoClient(
        MONGO_URI,
        tz_aware=True,
        serverSelectionTimeoutMS=MONGO_SERVER_SELECTION_TIMEOUT_MS,
    )


def _ensure_indexes(db):
    db["users"].create_index("email", unique=True, name="idx_users_email_unique")
    db["results"].create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_results_user_id_created_at",
    )
    db["schedule_events"].create_index(
        [("user_id", ASCENDING), ("is_completed", ASCENDING), ("event_datetime", ASCENDING)],
        name="idx_schedule_events_user_datetime",
    )
    db["schedule_events"].create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_schedule_events_user_created_at",
    )
    db["products"].create_index(
        [("skin_type", ASCENDING), ("name", ASCENDING)],
        name="idx_products_skin_type_name",
    )
    db["admin_audit"].create_index(
        [("admin_user_id", ASCENDING), ("created_at", DESCENDING)],
        name="idx_admin_audit_admin_user_created_at",
    )


def get_db():
    global _client, _indexes_ready
    with _client_lock:
        if _client is None:
            _client = _build_client()
        db = _client[MONGO_DB_NAME]
        if not _indexes_ready:
            _ensure_indexes(db)
            _indexes_ready = True
        return db


def ensure_indexes(db=None):
    global _client, _indexes_ready
    with _client_lock:
        if db is None:
            if _client is None:
                _client = _build_client()
            db = _client[MONGO_DB_NAME]
        _ensure_indexes(db)
        _indexes_ready = True
        return db


def to_object_id(raw_value):
    if isinstance(raw_value, ObjectId):
        return raw_value

    raw_text = str(raw_value or "").strip()
    if not raw_text:
        return None

    try:
        return ObjectId(raw_text)
    except Exception:
        return None
