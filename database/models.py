import sqlite3

from database.db import DB_PATH


def save_result(skin_type, products):
    """
    Legacy helper that stores generated product lists for a skin type.
    Uses the same database file as the rest of the app.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS result_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skin_type TEXT NOT NULL,
                products TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        if isinstance(products, (list, tuple)):
            products_text = ", ".join(str(item) for item in products)
        else:
            products_text = str(products)

        cursor.execute(
            """
            INSERT INTO result_products (skin_type, products)
            VALUES (?, ?)
            """,
            (skin_type, products_text),
        )

        conn.commit()
        conn.close()

    except Exception as err:
        print(f"[WARN] Database save skipped: {err}")
