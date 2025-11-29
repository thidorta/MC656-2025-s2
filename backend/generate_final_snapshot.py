"""
Generate final /tree snapshot JSON from normalized user_curriculum.

Produces complete snapshot with both raw and normalized fields.
"""

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
USER_AUTH_DB = DATA_DIR / "user_auth.db"


def generate_tree_snapshot(user_id: int, completa: bool = False) -> Dict[str, Any]:
    """
    Generate final /tree snapshot from user_curriculum.
    
    Args:
        user_id: User ID to generate snapshot for
        completa: Filter for completed disciplines only if True
    
    Returns:
        Complete snapshot JSON with raw + normalized fields
    """
    conn = sqlite3.connect(str(USER_AUTH_DB))
    conn.row_factory = sqlite3.Row
    
    # Get user info
    user_row = conn.execute(
        "SELECT id, username, planner_id FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    
    if not user_row:
        raise ValueError(f"User {user_id} not found")
    
    # Get all disciplines
    query = "SELECT * FROM user_curriculum WHERE user_id = ? ORDER BY codigo"
    disciplines_rows = conn.execute(query, (user_id,)).fetchall()
    
    disciplinas = []
    for row in disciplines_rows:
        # Apply completa filter if requested
        if completa and not row["tem"]:
            continue
        
        # Parse JSON fields
        pre_req_raw = json.loads(row["pre_req_raw"]) if row["pre_req_raw"] else []
        offers_raw = json.loads(row["offers_raw"]) if row["offers_raw"] else []
        pre_req_real = json.loads(row["pre_req_real"]) if row["pre_req_real"] else []
        offers_real = json.loads(row["offers_real"]) if row["offers_real"] else []
        
        disc = {
            # Catalog fields
            "codigo": row["codigo"],
            "nome": row["nome"],
            "creditos": row["creditos"],
            "tipo": row["tipo"],
            "semestre_sugerido": row["semestre_sugerido"],
            "cp_group": row["cp_group"],
            "catalogo": row["catalogo"],
            
            # Raw GDE overlay fields
            "disciplina_id": row["disciplina_id"],
            "missing": bool(row["missing"]),
            "tem": bool(row["tem"]),
            "raw_status": row["raw_status"],
            "raw_can_enroll": bool(row["pode"]) if row["pode"] is not None else None,
            "color": row["color"],
            "obs": row["obs"],
            "pre_req_raw": pre_req_raw,
            "offers_raw": offers_raw,
            
            # Phase 2 normalized fields
            "pre_req_real": pre_req_real,
            "offers_real": offers_real,
            "concluida": bool(row["tem"]),
            "can_enroll_final": bool(row["can_enroll_final"]),
            "ofertada_final": bool(row["ofertada_final"]),
            "status_final": row["status_final"],
        }
        
        disciplinas.append(disc)
    
    # Build final snapshot
    snapshot = {
        "user_id": user_id,
        "username": user_row["username"],
        "planner_id": user_row["planner_id"],
        "completa": completa,
        "total_disciplinas": len(disciplinas),
        "disciplinas": disciplinas,
    }
    
    conn.close()
    return snapshot


def main() -> None:
    user_id = 1000
    
    # Generate full snapshot
    print(f"Generating full snapshot for user_id={user_id}")
    snapshot = generate_tree_snapshot(user_id, completa=False)
    
    output_path = BACKEND_DIR / "snapshot_final.json"
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Wrote {snapshot['total_disciplinas']} disciplines to {output_path}")
    
    # Generate completed-only snapshot
    snapshot_completed = generate_tree_snapshot(user_id, completa=True)
    output_completed = BACKEND_DIR / "snapshot_completed.json"
    with output_completed.open("w", encoding="utf-8") as f:
        json.dump(snapshot_completed, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Wrote {snapshot_completed['total_disciplinas']} completed disciplines to {output_completed}")
    
    # Validation summary
    print("\n=== Validation Summary ===")
    status_counts = {}
    for disc in snapshot["disciplinas"]:
        status = disc["status_final"]
        status_counts[status] = status_counts.get(status, 0) + 1
    
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")
    
    # Check key samples
    print("\n=== Key Samples ===")
    samples = ["MC358", "MC458", "MC558"]
    for code in samples:
        disc = next((d for d in snapshot["disciplinas"] if d["codigo"] == code), None)
        if disc:
            print(f"\n{code}:")
            print(f"  status_final: {disc['status_final']}")
            print(f"  tem: {disc['tem']}, can_enroll: {disc['can_enroll_final']}, ofertada: {disc['ofertada_final']}")
            print(f"  prereqs: {disc['pre_req_real']}")


if __name__ == "__main__":
    main()
