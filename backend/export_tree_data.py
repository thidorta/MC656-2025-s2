import sqlite3
import json

c = sqlite3.connect('data/user_auth.db')
cur = c.cursor()
rows = cur.execute("select * from user_curriculum_snapshot where final_status != 'completed'").fetchall()
columns = [desc[0] for desc in cur.description]
data = [dict(zip(columns, row)) for row in rows]
with open('tree_data.json', 'w', encoding='utf-8') as f:
    json.dump({'user_id': 1000, 'curriculum': data}, f, indent=2, ensure_ascii=False)
c.close()