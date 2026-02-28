from database.db import get_db

# -----------------------------
# Product data
# -----------------------------
products = [
    # DRY SKIN
    ("Cetaphil Moisturizing Cream", "Moisturizer", "dry"),
    ("Neutrogena Hydro Boost", "Moisturizer", "dry"),
    ("Minimalist Hyaluronic Acid", "Serum", "dry"),
    # OILY SKIN
    ("La Roche-Posay Effaclar", "Cleanser", "oily"),
    ("Minimalist Salicylic Acid", "Serum", "oily"),
    ("Neutrogena Oil-Free Moisturizer", "Moisturizer", "oily"),
    # NORMAL SKIN
    ("Cetaphil Gentle Cleanser", "Cleanser", "normal"),
    ("Simple Hydrating Light Moisturizer", "Moisturizer", "normal"),
    ("The Ordinary Niacinamide", "Serum", "normal"),
]


def main():
    db = get_db()
    products_collection = db["products"]

    inserted_count = 0
    for name, category, skin_type in products:
        update_result = products_collection.update_one(
            {
                "name": name,
                "category": category,
                "skin_type": skin_type,
            },
            {
                "$setOnInsert": {
                    "description": "",
                }
            },
            upsert=True,
        )
        if update_result.upserted_id is not None:
            inserted_count += 1

    print(f"Inserted {inserted_count} new products into MongoDB.")


if __name__ == "__main__":
    main()
