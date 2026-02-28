import argparse
import json
import os
import sqlite3
from datetime import datetime, timezone

from database.db import ensure_indexes, get_db


def _current_timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _read_rows(connection, query):
    cursor = connection.execute(query)
    return [dict(row) for row in cursor.fetchall()]


def _has_table(connection, table_name):
    row = connection.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
        LIMIT 1
        """,
        (table_name,),
    ).fetchone()
    return bool(row)


def _load_class_probabilities(raw_value):
    if isinstance(raw_value, dict):
        return raw_value
    if not raw_value:
        return {}
    try:
        loaded = json.loads(raw_value)
        return loaded if isinstance(loaded, dict) else {}
    except json.JSONDecodeError:
        return {}


def _to_bool(raw_value):
    try:
        return bool(int(raw_value))
    except (TypeError, ValueError):
        return False


def migrate(sqlite_path, drop_existing=False):
    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"SQLite file not found: {sqlite_path}")

    connection = sqlite3.connect(sqlite_path)
    connection.row_factory = sqlite3.Row

    db = get_db()
    users_collection = db["users"]
    results_collection = db["results"]
    schedule_collection = db["schedule_events"]
    products_collection = db["products"]
    result_products_collection = db["result_products"]

    if drop_existing:
        users_collection.drop()
        results_collection.drop()
        schedule_collection.drop()
        products_collection.drop()
        result_products_collection.drop()

    # Ensure indexes are recreated after potential drops.
    db = ensure_indexes(db)
    users_collection = db["users"]
    results_collection = db["results"]
    schedule_collection = db["schedule_events"]
    products_collection = db["products"]
    result_products_collection = db["result_products"]

    user_id_map = {}
    summary = {
        "users": 0,
        "results": 0,
        "schedule_events": 0,
        "products": 0,
        "result_products": 0,
        "results_skipped_missing_user": 0,
        "events_skipped_missing_user": 0,
        "missing_tables": [],
    }

    has_users_table = _has_table(connection, "users")
    if not has_users_table:
        summary["missing_tables"].append("users")
    users_rows = (
        _read_rows(
            connection,
            """
            SELECT id, name, email, contact_number, password_hash, created_at
            FROM users
            ORDER BY id ASC
            """,
        )
        if has_users_table
        else []
    )
    for row in users_rows:
        email = str(row.get("email") or "").strip().lower()
        existing_user = users_collection.find_one({"email": email}, {"_id": 1})
        if existing_user is not None:
            inserted_user_id = existing_user["_id"]
        else:
            insert_result = users_collection.insert_one(
                {
                    "legacy_id": row.get("id"),
                    "name": row.get("name"),
                    "email": email,
                    "contact_number": row.get("contact_number") or "",
                    "password_hash": row.get("password_hash"),
                    "created_at": row.get("created_at") or _current_timestamp(),
                }
            )
            inserted_user_id = insert_result.inserted_id
            summary["users"] += 1

        user_id_map[row.get("id")] = inserted_user_id

    has_results_table = _has_table(connection, "results")
    if not has_results_table:
        summary["missing_tables"].append("results")
    results_rows = (
        _read_rows(
            connection,
            """
            SELECT
                id,
                user_id,
                skin_type,
                confidence,
                image_path,
                gradcam_image_path,
                model_version,
                class_probabilities_json,
                is_low_confidence,
                inference_ms,
                created_at
            FROM results
            ORDER BY id ASC
            """,
        )
        if has_results_table
        else []
    )
    for row in results_rows:
        mapped_user_id = user_id_map.get(row.get("user_id"))
        if mapped_user_id is None:
            summary["results_skipped_missing_user"] += 1
            continue

        upsert_result = results_collection.update_one(
            {"legacy_id": row.get("id")},
            {
                "$set": {
                    "legacy_id": row.get("id"),
                    "user_id": mapped_user_id,
                    "skin_type": row.get("skin_type"),
                    "confidence": row.get("confidence"),
                    "image_path": row.get("image_path"),
                    "gradcam_image_path": row.get("gradcam_image_path"),
                    "model_version": row.get("model_version"),
                    "class_probabilities": _load_class_probabilities(
                        row.get("class_probabilities_json")
                    ),
                    "is_low_confidence": _to_bool(row.get("is_low_confidence")),
                    "inference_ms": row.get("inference_ms"),
                    "created_at": row.get("created_at") or _current_timestamp(),
                }
            },
            upsert=True,
        )
        if upsert_result.upserted_id is not None:
            summary["results"] += 1

    has_schedule_events_table = _has_table(connection, "schedule_events")
    if not has_schedule_events_table:
        summary["missing_tables"].append("schedule_events")
    schedule_rows = (
        _read_rows(
            connection,
            """
            SELECT
                id,
                user_id,
                title,
                event_type,
                priority,
                event_datetime,
                description,
                reminder_minutes,
                is_completed,
                created_at,
                updated_at
            FROM schedule_events
            ORDER BY id ASC
            """,
        )
        if has_schedule_events_table
        else []
    )
    for row in schedule_rows:
        mapped_user_id = user_id_map.get(row.get("user_id"))
        if mapped_user_id is None:
            summary["events_skipped_missing_user"] += 1
            continue

        upsert_result = schedule_collection.update_one(
            {"legacy_id": row.get("id")},
            {
                "$set": {
                    "legacy_id": row.get("id"),
                    "user_id": mapped_user_id,
                    "title": row.get("title"),
                    "event_type": row.get("event_type"),
                    "priority": row.get("priority"),
                    "event_datetime": row.get("event_datetime"),
                    "description": row.get("description") or "",
                    "reminder_minutes": int(row.get("reminder_minutes") or 30),
                    "is_completed": _to_bool(row.get("is_completed")),
                    "created_at": row.get("created_at") or _current_timestamp(),
                    "updated_at": row.get("updated_at") or _current_timestamp(),
                }
            },
            upsert=True,
        )
        if upsert_result.upserted_id is not None:
            summary["schedule_events"] += 1

    has_products_table = _has_table(connection, "products")
    if not has_products_table:
        summary["missing_tables"].append("products")
    products_rows = (
        _read_rows(
            connection,
            """
            SELECT id, name, skin_type, category, description
            FROM products
            ORDER BY id ASC
            """,
        )
        if has_products_table
        else []
    )
    for row in products_rows:
        upsert_result = products_collection.update_one(
            {"legacy_id": row.get("id")},
            {
                "$set": {
                    "legacy_id": row.get("id"),
                    "name": row.get("name"),
                    "skin_type": row.get("skin_type"),
                    "category": row.get("category"),
                    "description": row.get("description"),
                }
            },
            upsert=True,
        )
        if upsert_result.upserted_id is not None:
            summary["products"] += 1

    # Optional legacy table; skip quietly if it does not exist.
    has_result_products_table = _has_table(connection, "result_products")
    if not has_result_products_table:
        summary["missing_tables"].append("result_products")
    if has_result_products_table:
        result_products_rows = _read_rows(
            connection,
            """
            SELECT id, skin_type, products, created_at
            FROM result_products
            ORDER BY id ASC
            """,
        )
        for row in result_products_rows:
            upsert_result = result_products_collection.update_one(
                {"legacy_id": row.get("id")},
                {
                    "$set": {
                        "legacy_id": row.get("id"),
                        "skin_type": row.get("skin_type"),
                        "products": row.get("products"),
                        "created_at": row.get("created_at") or _current_timestamp(),
                    }
                },
                upsert=True,
            )
            if upsert_result.upserted_id is not None:
                summary["result_products"] += 1

    connection.close()
    return summary


def main():
    default_sqlite_path = os.path.join(os.path.dirname(__file__), "skin_care.db")
    parser = argparse.ArgumentParser(description="Migrate SQLite data to MongoDB.")
    parser.add_argument(
        "--sqlite-path",
        default=default_sqlite_path,
        help=f"Path to SQLite database file (default: {default_sqlite_path})",
    )
    parser.add_argument(
        "--drop-existing",
        action="store_true",
        help="Drop existing Mongo collections before import.",
    )
    args = parser.parse_args()

    summary = migrate(args.sqlite_path, drop_existing=args.drop_existing)
    print("SQLite -> MongoDB migration complete:")
    print(f"- users inserted: {summary['users']}")
    print(f"- results inserted: {summary['results']}")
    print(f"- schedule events inserted: {summary['schedule_events']}")
    print(f"- products inserted: {summary['products']}")
    print(f"- legacy result_products inserted: {summary['result_products']}")
    print(f"- results skipped (missing user): {summary['results_skipped_missing_user']}")
    print(f"- events skipped (missing user): {summary['events_skipped_missing_user']}")
    missing_tables = summary.get("missing_tables") or []
    if missing_tables:
        print(f"- skipped missing SQLite tables: {', '.join(sorted(missing_tables))}")


if __name__ == "__main__":
    main()
