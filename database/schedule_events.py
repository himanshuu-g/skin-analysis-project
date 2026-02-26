from datetime import datetime, timezone

from database.db import get_db

ALLOWED_UPDATE_FIELDS = {
    "title",
    "event_type",
    "priority",
    "event_datetime",
    "description",
    "reminder_minutes",
    "is_completed",
}


def _serialize_schedule_event_row(row):
    if row is None:
        return None

    return {
        "id": row["id"],
        "title": row["title"],
        "type": row["event_type"],
        "priority": row["priority"],
        "datetime": row["event_datetime"],
        "description": row["description"] or "",
        "reminder_minutes": int(row["reminder_minutes"] or 0),
        "completed": bool(row["is_completed"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _current_timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def get_schedule_events_for_user(user_id):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                id,
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
            WHERE user_id = ?
            ORDER BY is_completed ASC, event_datetime ASC, id ASC
            """,
            (int(user_id),),
        )
        rows = cursor.fetchall()
        return [_serialize_schedule_event_row(row) for row in rows]
    finally:
        conn.close()


def get_schedule_event_for_user(user_id, event_id):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                id,
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
            WHERE user_id = ? AND id = ?
            LIMIT 1
            """,
            (int(user_id), int(event_id)),
        )
        row = cursor.fetchone()
        return _serialize_schedule_event_row(row)
    finally:
        conn.close()


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
    conn = get_db()
    try:
        cursor = conn.cursor()
        now_text = _current_timestamp()
        cursor.execute(
            """
            INSERT INTO schedule_events (
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
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                int(user_id),
                title,
                event_type,
                priority,
                event_datetime,
                description or "",
                int(reminder_minutes),
                1 if is_completed else 0,
                now_text,
                now_text,
            ),
        )
        conn.commit()
        event_id = cursor.lastrowid
    finally:
        conn.close()

    return get_schedule_event_for_user(user_id, event_id)


def update_schedule_event_for_user(user_id, event_id, updates):
    existing_event = get_schedule_event_for_user(user_id, event_id)
    if existing_event is None:
        return None

    safe_updates = {
        key: value for key, value in (updates or {}).items() if key in ALLOWED_UPDATE_FIELDS
    }
    if not safe_updates:
        return existing_event

    safe_updates["updated_at"] = _current_timestamp()

    assignments = ", ".join(f"{column_name} = ?" for column_name in safe_updates.keys())
    values = list(safe_updates.values())
    values.extend((int(user_id), int(event_id)))

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            UPDATE schedule_events
            SET {assignments}
            WHERE user_id = ? AND id = ?
            """,
            values,
        )
        conn.commit()
    finally:
        conn.close()

    return get_schedule_event_for_user(user_id, event_id)


def delete_schedule_event_for_user(user_id, event_id):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            DELETE FROM schedule_events
            WHERE user_id = ? AND id = ?
            """,
            (int(user_id), int(event_id)),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
