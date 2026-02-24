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

conn = get_db()
cursor = conn.cursor()

cursor.executemany(
    "INSERT INTO products (name, category, skin_type) VALUES (%s, %s, %s)",
    products,
)

conn.commit()
conn.close()

print("Products inserted successfully!")
