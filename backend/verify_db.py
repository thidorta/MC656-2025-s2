import sqlite3

conn = sqlite3.connect('data/user_auth.db')
cursor = conn.cursor()

print("=== TABLES ===")
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
for table in tables:
    print(f"  {table[0]}")

print("\n=== INDICES ===")
indices = cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()
for idx in indices:
    print(f"  {idx[0]}")

print(f"\n=== TOTAL: {len(tables)} tables, {len(indices)} indices ===")

conn.close()
