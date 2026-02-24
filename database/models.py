from database.db import get_db


def save_result(skin_type, products):
    """
    Legacy helper that stores generated product lists for a skin type.
    Uses the same database connection as the rest of the app.
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS result_products (
                id BIGSERIAL PRIMARY KEY,
                skin_type TEXT NOT NULL,
                products TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
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
            VALUES (%s, %s)
            """,
            (skin_type, products_text),
        )

        conn.commit()

    except Exception as err:
        print(f"[WARN] Database save skipped: {err}")
    finally:
        if conn is not None:
            conn.close()
