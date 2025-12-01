import sqlite3
import json

def export_table(table_name, filename):
    c = sqlite3.connect('data/user_auth.db')
    cur = c.cursor()
    rows = cur.execute(f"select * from {table_name} where user_id = '1000'").fetchall()
    columns = [desc[0] for desc in cur.description]
    data = [dict(zip(columns, row)) for row in rows]
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    c.close()

export_table('user_curriculum_raw', 'debug/0_raw_data.json')
export_table('user_curriculum_normalized', 'debug/1_normalized_data.json')
export_table('user_curriculum_tree', 'debug/2_tree_data.json')
export_table('user_curriculum_snapshot', 'debug/3_snapshot_data.json')