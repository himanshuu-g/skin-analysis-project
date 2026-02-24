import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "skin_care.db")


def _table_has_column(conn, table_name, column_name):
    cursor = conn.execute(f"PRAGMA table_info({table_name})")
    return any(row[1] == column_name for row in cursor.fetchall())


def _add_column_if_missing(conn, table_name, column_name, column_definition):
    if not _table_has_column(conn, table_name, column_name):
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_definition}")


def _ensure_results_schema(conn):
    _add_column_if_missing(conn, "results", "user_id", "user_id INTEGER REFERENCES users(id)")
    _add_column_if_missing(conn, "results", "model_version", "model_version TEXT")
    _add_column_if_missing(conn, "results", "class_probabilities_json", "class_probabilities_json TEXT")
    _add_column_if_missing(conn, "results", "is_low_confidence", "is_low_confidence INTEGER NOT NULL DEFAULT 0")
    _add_column_if_missing(conn, "results", "inference_ms", "inference_ms REAL")
    _add_column_if_missing(conn, "results", "gradcam_image_path", "gradcam_image_path TEXT")
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_results_user_id_created_at
        ON results (user_id, created_at DESC)
        """
    )


def _ensure_users_schema(conn):
    _add_column_if_missing(conn, "users", "contact_number", "contact_number TEXT NOT NULL DEFAULT ''")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            skin_type TEXT NOT NULL,
            category TEXT,
            description TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            skin_type TEXT NOT NULL,
            confidence REAL,
            image_path TEXT,
            gradcam_image_path TEXT,
            model_version TEXT,
            class_probabilities_json TEXT,
            is_low_confidence INTEGER NOT NULL DEFAULT 0,
            inference_ms REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            contact_number TEXT NOT NULL DEFAULT '',
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    _ensure_users_schema(conn)
    _ensure_results_schema(conn)
    conn.commit()
    return conn
