import sqlite3
import os

# -----------------------------
# Database path
# -----------------------------
DB_PATH = os.path.join(os.path.dirname(__file__), "skin_care.db")

# -----------------------------
# Connect to DB
# -----------------------------
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

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

# -----------------------------
# Insert products
# -----------------------------
cursor.executemany(
    "INSERT INTO products (name, category, skin_type) VALUES (?, ?, ?)",
    products
)

conn.commit()
conn.close()

print("✅ Products inserted successfully!")
