import sqlite3

conn = sqlite3.connect('user_auth.db')
cur = conn.cursor()

# Check if table exists
tables = [row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print(f"user_curriculum_snapshot exists: {'user_curriculum_snapshot' in tables}")

if 'user_curriculum_snapshot' in tables:
    # Count rows
    count = cur.execute("SELECT COUNT(*) FROM user_curriculum_snapshot WHERE user_id='1000'").fetchone()[0]
    print(f"Rows for user 1000: {count}")
    
    if count > 0:
        # Show sample
        sample = cur.execute("SELECT code, name, final_status, color_hex FROM user_curriculum_snapshot WHERE user_id='1000' LIMIT 3").fetchall()
        print("\nSample courses:")
        for row in sample:
            print(f"  {row[0]}: {row[1]} | {row[2]} | {row[3]}")

conn.close()
