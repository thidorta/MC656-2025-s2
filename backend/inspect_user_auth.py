import sqlite3
from pathlib import Path

user_auth_path = Path(__file__).parent / "data" / "user_auth.db"
conn = sqlite3.connect(str(user_auth_path))
cur = conn.cursor()

print("=== user_auth.db schema ===\n")
for row in cur.execute("SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name").fetchall():
    if row[0]:
        print(row[0])
        print()

conn.close()
