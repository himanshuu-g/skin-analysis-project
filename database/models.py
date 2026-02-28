from datetime import datetime, timezone

from database.db import get_db


def save_result(skin_type, products):
    """
    Legacy helper that stores generated product lists for a skin type.
    Uses the same MongoDB database as the rest of the app.
    """
    try:
        db = get_db()

        if isinstance(products, (list, tuple)):
            products_text = ", ".join(str(item) for item in products)
        else:
            products_text = str(products)

        db["result_products"].insert_one(
            {
                "skin_type": skin_type,
                "products": products_text,
                "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            }
        )

    except Exception as err:
        print(f"[WARN] Database save skipped: {err}")
