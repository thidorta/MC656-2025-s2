import sqlite3
from pathlib import Path

catalog_path = Path(__file__).parent.parent / "crawler" / "data" / "db" / "catalog.db"
conn = sqlite3.connect(str(catalog_path))
cur = conn.cursor()

print("=== catalog.db schema ===\n")
for row in cur.execute("SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name").fetchall():
    if row[0]:
        print(row[0])
        print()

conn.close()
