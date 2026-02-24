import os

import psycopg2
from psycopg2.extras import RealDictCursor


def _normalize_database_url(database_url):
    cleaned = str(database_url or "").strip()
    if cleaned.startswith("postgres://"):
        return cleaned.replace("postgres://", "postgresql://", 1)
    return cleaned


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL"))


def _add_column_if_missing(conn, table_name, _column_name, column_definition):
    with conn.cursor() as cursor:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_definition}")


def _ensure_results_schema(conn):
    _add_column_if_missing(conn, "results", "user_id", "user_id BIGINT REFERENCES users(id)")
    _add_column_if_missing(conn, "results", "model_version", "model_version TEXT")
    _add_column_if_missing(conn, "results", "class_probabilities_json", "class_probabilities_json TEXT")
    _add_column_if_missing(
        conn,
        "results",
        "is_low_confidence",
        "is_low_confidence BOOLEAN NOT NULL DEFAULT FALSE",
    )
    _add_column_if_missing(conn, "results", "inference_ms", "inference_ms DOUBLE PRECISION")
    _add_column_if_missing(conn, "results", "gradcam_image_path", "gradcam_image_path TEXT")
    with conn.cursor() as cursor:
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_results_user_id_created_at
            ON results (user_id, created_at DESC)
            """
        )


def _ensure_users_schema(conn):
    _add_column_if_missing(conn, "users", "contact_number", "contact_number TEXT NOT NULL DEFAULT ''")


def get_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set. Configure a PostgreSQL connection string.")

    connect_kwargs = {"cursor_factory": RealDictCursor}
    db_sslmode = str(os.getenv("DB_SSLMODE", "")).strip()
    if db_sslmode:
        connect_kwargs["sslmode"] = db_sslmode

    conn = psycopg2.connect(DATABASE_URL, **connect_kwargs)

    with conn.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                contact_number TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                skin_type TEXT NOT NULL,
                category TEXT,
                description TEXT
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS results (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT REFERENCES users(id),
                skin_type TEXT NOT NULL,
                confidence DOUBLE PRECISION,
                image_path TEXT,
                gradcam_image_path TEXT,
                model_version TEXT,
                class_probabilities_json TEXT,
                is_low_confidence BOOLEAN NOT NULL DEFAULT FALSE,
                inference_ms DOUBLE PRECISION,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            """
        )

    _ensure_users_schema(conn)
    _ensure_results_schema(conn)
    conn.commit()
    return conn
