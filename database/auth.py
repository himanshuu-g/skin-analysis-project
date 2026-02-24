from database.db import get_db


def get_user_by_email(email):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, name, email, contact_number, password_hash
            FROM users
            WHERE email = ?
            """,
            (email.lower().strip(),),
        )
        return cursor.fetchone()
    finally:
        conn.close()


def get_user_by_id(user_id):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, name, email, contact_number, password_hash, created_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        )
        return cursor.fetchone()
    finally:
        conn.close()


def create_user(name, email, contact_number, password_hash):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (name, email, contact_number, password_hash)
            VALUES (?, ?, ?, ?)
            """,
            (name.strip(), email.lower().strip(), contact_number.strip(), password_hash),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()
