import sqlite3
from pathlib import Path

user_auth = Path(__file__).parent / "data" / "user_auth.db"
conn = sqlite3.connect(str(user_auth))
conn.row_factory = sqlite3.Row

# Count total
total = conn.execute("SELECT COUNT(*) FROM user_curriculum WHERE user_id = 1000").fetchone()[0]
print(f"Total disciplines in user_curriculum: {total}")

# Count with user overlay (tem=1 or has disciplina_id)
with_overlay = conn.execute(
    "SELECT COUNT(*) FROM user_curriculum WHERE user_id = 1000 AND (tem = 1 OR disciplina_id IS NOT NULL)"
).fetchone()[0]
print(f"Disciplines with user overlay: {with_overlay}")

# Count catalog-only (no user data)
catalog_only = conn.execute(
    "SELECT COUNT(*) FROM user_curriculum WHERE user_id = 1000 AND tem = 0 AND disciplina_id IS NULL"
).fetchone()[0]
print(f"Catalog-only disciplines: {catalog_only}")

print("\n=== Sample Validation ===")
samples = ["MC358", "MC458", "MC558", "MC102", "MC202"]
for code in samples:
    row = conn.execute(
        """
        SELECT codigo, nome, creditos, tipo, semestre_sugerido, cp_group,
               disciplina_id, tem, pode, missing, raw_status, obs
        FROM user_curriculum
        WHERE user_id = 1000 AND codigo = ?
        """,
        (code,),
    ).fetchone()
    
    if row:
        print(f"\n{code}: {row['nome']}")
        print(f"  Catalog: credits={row['creditos']}, tipo={row['tipo']}, sem={row['semestre_sugerido']}, cp_group={row['cp_group']}")
        print(f"  User: disciplina_id={row['disciplina_id']}, tem={row['tem']}, pode={row['pode']}, missing={row['missing']}")
        print(f"        raw_status={row['raw_status']}, obs={row['obs']}")
    else:
        print(f"\n{code}: NOT FOUND")

conn.close()
