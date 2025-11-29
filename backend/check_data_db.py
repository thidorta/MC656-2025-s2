import sqlite3

conn = sqlite3.connect('data/user_auth.db')
cur = conn.cursor()

count = cur.execute("SELECT COUNT(*) FROM user_curriculum_snapshot WHERE user_id='1000'").fetchone()[0]
print(f'Rows for user 1000 in data/user_auth.db: {count}')

if count > 0:
    sample = cur.execute("SELECT code, name, final_status, color_hex FROM user_curriculum_snapshot WHERE user_id='1000' LIMIT 3").fetchall()
    print("\nSample courses:")
    for row in sample:
        print(f"  {row[0]}: {row[1]} | {row[2]} | {row[3]}")

conn.close()
