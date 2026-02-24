import sqlite3

from database.db import DB_PATH


def recommend_products(skin_type):
    products = []

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT name, category FROM products WHERE skin_type = ?",
            (skin_type,),
        )
        rows = cursor.fetchall()
        conn.close()

        for name, category in rows:
            products.append(f"{name} ({category})")

    except Exception as err:
        print(f"[WARN] Product recommendation error: {err}")

    return products
