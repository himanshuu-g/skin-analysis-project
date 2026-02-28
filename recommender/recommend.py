from database.db import get_db


def recommend_products(skin_type):
    products = []

    try:
        db = get_db()
        rows = db["products"].find(
            {"skin_type": skin_type},
            {"name": 1, "category": 1},
        )

        for row in rows:
            name = str(row.get("name") or "").strip()
            category = str(row.get("category") or "").strip()
            if not name:
                continue
            if category:
                products.append(f"{name} ({category})")
            else:
                products.append(name)

    except Exception as err:
        print(f"[WARN] Product recommendation error: {err}")

    return products
