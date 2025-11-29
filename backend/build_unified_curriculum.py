"""
Phase 1: Unified Snapshot Builder (Catalog + User Overlay)

This script implements the correct architecture:
1. Read full curriculum from catalog.db (course + catalog year)
2. Overlay user-specific fields from raw GDE user_db JSON
3. Write unified result to user_auth.db.user_curriculum

Rules:
- catalog.db defines the complete tree (all disciplines)
- user_db overlays user-specific data onto matching disciplines
- Missing user data is filled with safe defaults (tem=false, missing=true, etc.)
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parent
WORKSPACE = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"

CATALOG_DB = WORKSPACE / "crawler" / "data" / "db" / "catalog.db"
USER_AUTH_DB = DATA_DIR / "user_auth.db"
LOGIN_JSON = BACKEND_DIR / "login.json"


def load_gde_login(path: Path) -> Dict[str, Any]:
    """Load raw GDE login JSON with BOM handling."""
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def get_user_id(user_auth_conn: sqlite3.Connection, ra: str) -> Optional[int]:
    """Get user_id from users table by RA (username)."""
    cur = user_auth_conn.execute("SELECT id FROM users WHERE username = ?", (ra,))
    row = cur.fetchone()
    return row[0] if row else None


def get_catalog_curriculum(
    catalog_conn: sqlite3.Connection, course_id: int, catalog_year: int
) -> List[Dict[str, Any]]:
    """
    Fetch full curriculum tree from catalog.db for a given course + catalog year.
    
    Returns list of disciplines with:
    - codigo, nome, creditos, tipo, semestre_sugerido, cp_group, curso_id, catalogo
    """
    query = """
    SELECT
        d.code AS codigo,
        d.name AS nome,
        ce.credits AS creditos,
        ce.tipo,
        ce.semester AS semestre_sugerido,
        ce.cp_group,
        cc.modality_id AS curso_id,
        ce.catalogo
    FROM curriculum_entry ce
    JOIN catalog_curriculum cc ON ce.curriculum_id = cc.curriculum_id
    JOIN discipline d ON ce.discipline_id = d.discipline_id
    JOIN catalog_modality cm ON cc.modality_id = cm.modality_id
    WHERE cm.course_id = ? AND cc.year = ?
    """
    
    catalog_conn.row_factory = sqlite3.Row
    cur = catalog_conn.execute(query, (course_id, catalog_year))
    return [dict(row) for row in cur.fetchall()]


def build_user_overlay_map(user_db: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Extract user-specific overlay from raw GDE user_db.
    
    Returns map: codigo -> {disciplina_id, tem, pode, missing, raw_status, color, obs, pre_req_raw, offers_raw}
    """
    curriculum = user_db.get("curriculum", [])
    overlay_map: Dict[str, Dict[str, Any]] = {}
    
    for item in curriculum:
        codigo = item.get("codigo")
        if not codigo:
            continue
        
        overlay_map[codigo] = {
            "disciplina_id": item.get("disciplina_id"),
            "tem": bool(item.get("tem", False)),
            "pode": item.get("pode"),  # may be None
            "missing": bool(item.get("missing", True)),
            "raw_status": item.get("status"),
            "color": item.get("color"),
            "obs": item.get("obs"),
            "pre_req_raw": json.dumps(item.get("prereqs", [])),
            "offers_raw": json.dumps(item.get("offers", [])),
        }
    
    return overlay_map


def merge_catalog_with_user(
    catalog_disciplines: List[Dict[str, Any]],
    user_overlay: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Merge catalog skeleton with user overlay.
    
    For each catalog discipline:
    - If user has overlay → merge fields
    - If not → use defaults (tem=false, missing=true, etc.)
    
    Deduplicates by codigo (keeps first occurrence).
    """
    unified = []
    seen_codes = set()
    
    for disc in catalog_disciplines:
        codigo = disc["codigo"]
        
        # Skip duplicates
        if codigo in seen_codes:
            continue
        seen_codes.add(codigo)
        
        overlay = user_overlay.get(codigo, {})
        
        unified.append({
            # Catalog fields (always present)
            "codigo": codigo,
            "nome": disc["nome"],
            "creditos": disc["creditos"],
            "tipo": disc.get("tipo"),
            "semestre_sugerido": disc.get("semestre_sugerido"),
            "cp_group": disc.get("cp_group"),
            "curso_id": disc.get("curso_id"),
            "catalogo": disc["catalogo"],
            
            # User overlay (with defaults when missing)
            "disciplina_id": overlay.get("disciplina_id"),
            "tem": overlay.get("tem", False),
            "pode": overlay.get("pode"),
            "missing": overlay.get("missing", True),
            "raw_status": overlay.get("raw_status"),
            "color": overlay.get("color"),
            "obs": overlay.get("obs"),
            "pre_req_raw": overlay.get("pre_req_raw", "[]"),
            "offers_raw": overlay.get("offers_raw", "[]"),
        })
    
    return unified


def write_user_curriculum(
    user_auth_conn: sqlite3.Connection,
    user_id: int,
    snapshot_id: Optional[int],
    unified_disciplines: List[Dict[str, Any]],
) -> None:
    """
    Write unified disciplines to user_curriculum table.
    
    Clears existing rows for this user, then inserts fresh unified data.
    """
    from datetime import datetime, UTC
    now = datetime.now(UTC).isoformat()
    
    # Clear existing
    user_auth_conn.execute("DELETE FROM user_curriculum WHERE user_id = ?", (user_id,))
    
    # Insert unified rows
    for disc in unified_disciplines:
        user_auth_conn.execute(
            """
            INSERT INTO user_curriculum (
                user_id, snapshot_id,
                codigo, nome, creditos, tipo, semestre_sugerido, cp_group, curso_id, catalogo,
                disciplina_id, tem, pode, missing, raw_status, color, obs,
                pre_req_raw, offers_raw,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                snapshot_id,
                disc["codigo"],
                disc["nome"],
                disc["creditos"],
                disc["tipo"],
                disc["semestre_sugerido"],
                disc["cp_group"],
                disc["curso_id"],
                disc["catalogo"],
                disc["disciplina_id"],
                1 if disc["tem"] else 0,
                1 if disc["pode"] is True else (0 if disc["pode"] is False else None),
                1 if disc["missing"] else 0,
                disc["raw_status"],
                disc["color"],
                disc["obs"],
                disc["pre_req_raw"],
                disc["offers_raw"],
                now,
                now,
            ),
        )
    
    user_auth_conn.commit()


def main() -> None:
    if not LOGIN_JSON.exists():
        print(f"Missing login JSON at {LOGIN_JSON}")
        return
    
    # Load raw GDE data
    gde_login = load_gde_login(LOGIN_JSON)
    user_db = gde_login.get("user_db", {})
    user = user_db.get("user", {})
    course = user_db.get("course", {})
    catalog_year = user_db.get("year")
    ra = str(user.get("ra", "unknown"))
    course_id = int(course.get("id", 0))
    
    if not course_id or not catalog_year:
        print(f"Missing course_id or catalog_year in user_db")
        return
    
    # Connect to DBs
    catalog_conn = sqlite3.connect(str(CATALOG_DB))
    user_auth_conn = sqlite3.connect(str(USER_AUTH_DB))
    
    # Get user_id
    user_id = get_user_id(user_auth_conn, ra)
    if not user_id:
        print(f"User {ra} not found in user_auth.db")
        catalog_conn.close()
        user_auth_conn.close()
        return
    
    print(f"Building unified curriculum for user_id={user_id}, RA={ra}")
    print(f"  Course ID: {course_id}, Catalog Year: {catalog_year}")
    
    # Step 1: Read catalog curriculum (full tree)
    catalog_disciplines = get_catalog_curriculum(catalog_conn, course_id, catalog_year)
    print(f"  Catalog: {len(catalog_disciplines)} disciplines")
    
    # Step 2: Build user overlay map
    user_overlay = build_user_overlay_map(user_db)
    print(f"  User overlay: {len(user_overlay)} disciplines from GDE")
    
    # Step 3: Merge
    unified = merge_catalog_with_user(catalog_disciplines, user_overlay)
    print(f"  Unified: {len(unified)} disciplines")
    
    # Step 4: Write to user_curriculum
    snapshot_id = None  # could link to gde_snapshots if needed
    write_user_curriculum(user_auth_conn, user_id, snapshot_id, unified)
    
    print(f"✅ Wrote {len(unified)} rows to user_curriculum for user_id={user_id}")
    
    # Validation: sample a few codes
    sample_codes = ["MC358", "MC458", "MC558"]
    for code in sample_codes:
        row = user_auth_conn.execute(
            "SELECT codigo, tem, pode, missing, raw_status FROM user_curriculum WHERE user_id = ? AND codigo = ?",
            (user_id, code),
        ).fetchone()
        if row:
            print(f"  {code}: tem={row[1]}, pode={row[2]}, missing={row[3]}, raw_status={row[4]}")
        else:
            print(f"  {code}: NOT FOUND")
    
    catalog_conn.close()
    user_auth_conn.close()


if __name__ == "__main__":
    main()
