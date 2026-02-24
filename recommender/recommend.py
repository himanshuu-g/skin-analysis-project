from database.db import get_db


def recommend_products(skin_type):
    products = []
    conn = None

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT name, category FROM products WHERE skin_type = %s",
            (skin_type,),
        )
        rows = cursor.fetchall()

        for row in rows:
            products.append(f"{row['name']} ({row['category']})")

    except Exception as err:
        print(f"[WARN] Product recommendation error: {err}")
    finally:
        if conn is not None:
            conn.close()

    return products
