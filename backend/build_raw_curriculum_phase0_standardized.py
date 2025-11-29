"""
Phase 0.5: STANDARDIZED RAW LEFT JOIN with Semantic Transforms

Architecture:
1. catalog.db (LEFT) → filtered by catalog_year + modality_id → complete base curriculum
2. GDE user_db (RIGHT) → renamed to gde_* fields → overlay onto catalog base
3. LEFT JOIN ensures all catalog rows appear (MC358 catalog-only, MC458/MC558 merged)
4. Semantic transforms:
   - gde_has_completed: NULL=completed (keep), 1=planned (convert to 0), 0=pending (keep)
   - gde_can_enroll: NEVER MODIFIED (preserve exactly)
   - gde_status_raw: if null → "pending", else preserve
   - Remove gde_missing_flag (meaningless with catalog as base)

Output Table: user_curriculum_raw_standardized
Columns:
- Catalog (English): code, name, credits, course_type, recommended_semester, cp_group, catalog_year, modality_id
- GDE overlay: gde_discipline_id, gde_has_completed, gde_can_enroll, gde_status_raw, gde_note_raw, gde_prereqs_raw, gde_offers_raw
- Primary Key: (user_id, code)
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

BACKEND_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BACKEND_DIR.parent

CATALOG_DB = WORKSPACE_DIR / "crawler" / "data" / "db" / "catalog.db"
USER_AUTH_DB = BACKEND_DIR / "data" / "user_auth.db"
LOGIN_JSON = BACKEND_DIR / "login.json"


def load_login_json(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def get_user_id(conn: sqlite3.Connection, ra: str) -> int | None:
    cur = conn.execute("SELECT id FROM users WHERE username = ?", (ra,))
    row = cur.fetchone()
    return row[0] if row else None


def detect_first_login(conn: sqlite3.Connection, user_id: int) -> bool:
    """
    Check if this is the user's first login.
    If user_curriculum_raw_standardized does not exist or is empty → first login.
    """
    try:
        count = conn.execute(
            "SELECT COUNT(*) FROM user_curriculum_raw_standardized WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]
        return count == 0
    except sqlite3.OperationalError:
        # Table doesn't exist yet
        return True


def prepare_gde_overlay(user_db: Dict[str, Any], is_first_login: bool) -> List[Dict[str, Any]]:
    """
    Rename GDE fields (pre-join) and apply NEW semantic transforms.
    
    NEW Semantic rules:
    - gde_has_completed_raw → gde_has_completed:
        - NULL → NULL (completed historically or unknown)
        - 1 → 0 (nobody starts with planned courses)
        - 0 → 0 (not completed)
    - gde_plan_status (new field):
        - All users start with NOTHING planned
        - NULL → NULL, 1 → 0, 0 → 0
    - gde_prereqs_raw normalization:
        - NULL → NULL (irrelevant/completed)
        - 0 → prereqs satisfied (can_enroll=1)
        - 1 → prereqs missing (can_enroll=0, falta_pre)
    - gde_can_enroll: NEVER MODIFIED (preserve exactly)
    - gde_plan_status_raw: if null → "pending", else preserve
    - Remove obs and missing (not propagated)
    """
    overlay: List[Dict[str, Any]] = []
    for item in user_db.get("curriculum", []):
        code = item.get("codigo")
        if not code:
            continue
        
        # Extract raw GDE fields
        tem = item.get("tem")  # true/false/null
        pode = item.get("pode")  # true/false/null
        status = item.get("status")
        prereqs = item.get("prereqs", [])
        offers = item.get("offers", [])
        
        # NEW: gde_has_completed semantic transform
        # null → null, 1 → 0, 0 → 0
        if tem is None:
            gde_has_completed = None
        elif tem is True:
            # Raw tem=true (completed) → convert to 0 (reset planning state)
            gde_has_completed = 0
        else:
            gde_has_completed = 0
        
        # NEW: gde_plan_status (all users start with nothing planned)
        # null → null, 1 → 0, 0 → 0
        if tem is None:
            gde_plan_status = None
        else:
            gde_plan_status = 0
        
        # gde_can_enroll: preserve exactly (never modify)
        if pode is None:
            gde_can_enroll = None
        elif pode is True:
            gde_can_enroll = 1
        elif pode is False:
            gde_can_enroll = 0
        else:
            gde_can_enroll = None
        
        # NEW: gde_prereqs_raw normalization (0/1/null instead of JSON)
        # null → irrelevant/completed (catalog-only courses)
        # 0 → satisfied (has GDE data, can enroll or already done)
        # 1 → missing (falta_pre)
        if tem is None:
            # Catalog-only course (not in GDE) → irrelevant
            gde_prereqs_raw = None
        elif tem is True:
            # Already completed → prereqs satisfied (0, not null)
            gde_prereqs_raw = 0
        elif gde_can_enroll == 1:
            # Can enroll → prereqs satisfied
            gde_prereqs_raw = 0
        elif gde_can_enroll == 0:
            # Cannot enroll → prereqs missing
            gde_prereqs_raw = 1
        else:
            # Default to satisfied
            gde_prereqs_raw = 0
        
        # gde_plan_status_raw: if null → "pending", else preserve
        gde_plan_status_raw = status if status is not None else "pending"
        
        # gde_offers_raw: keep as JSON or null
        if offers and len(offers) > 0:
            gde_offers_raw = json.dumps(offers, ensure_ascii=False)
        else:
            gde_offers_raw = None
        
        overlay.append({
            "code": code,
            "gde_discipline_id": item.get("disciplina_id"),
            "gde_has_completed": gde_has_completed,
            "gde_plan_status": gde_plan_status,
            "gde_can_enroll": gde_can_enroll,
            "gde_prereqs_raw": gde_prereqs_raw,
            "gde_offers_raw": gde_offers_raw,
            "gde_color_raw": item.get("color"),
            "gde_plan_status_raw": gde_plan_status_raw,
        })
    return overlay


def ensure_gde_overlay_temp_table(conn: sqlite3.Connection, rows: List[Dict[str, Any]]):
    """Create temporary table with GDE overlay (renamed fields)."""
    conn.execute("DROP TABLE IF EXISTS gde_overlay_temp")
    conn.execute(
        """
        CREATE TABLE gde_overlay_temp (
            code TEXT PRIMARY KEY,
            gde_discipline_id TEXT,
            gde_has_completed INTEGER,
            gde_plan_status INTEGER,
            gde_can_enroll INTEGER,
            gde_prereqs_raw INTEGER,
            gde_offers_raw TEXT,
            gde_color_raw TEXT,
            gde_plan_status_raw TEXT
        )
        """
    )
    for r in rows:
        conn.execute(
            """
            INSERT INTO gde_overlay_temp (
                code, gde_discipline_id, gde_has_completed, gde_plan_status,
                gde_can_enroll, gde_prereqs_raw, gde_offers_raw,
                gde_color_raw, gde_plan_status_raw
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                r["code"],
                r["gde_discipline_id"],
                r["gde_has_completed"],
                r["gde_plan_status"],
                r["gde_can_enroll"],
                r["gde_prereqs_raw"],
                r["gde_offers_raw"],
                r["gde_color_raw"],
                r["gde_plan_status_raw"],
            ),
        )
    conn.commit()


def rebuild_user_curriculum_standardized(
    user_auth_conn: sqlite3.Connection,
    user_id: int,
    course_id: int,
    catalog_year: int
):
    """
    Create standardized curriculum table with LEFT JOIN.
    
    LEFT: catalog.db (filtered by catalog_year + modality_id)
    RIGHT: gde_overlay_temp (renamed GDE fields)
    Result: user_curriculum_raw_standardized with English-friendly columns
    """
    # Attach catalog.db
    user_auth_conn.execute(f"ATTACH DATABASE '{str(CATALOG_DB).replace(chr(92), '/')}' AS catalog")
    
    # Drop and recreate final table
    user_auth_conn.execute("DROP TABLE IF EXISTS user_curriculum_raw_standardized")
    user_auth_conn.execute(
        """
        CREATE TABLE user_curriculum_raw_standardized (
            user_id TEXT NOT NULL,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            credits INTEGER,
            course_type TEXT,
            recommended_semester INTEGER,
            cp_group TEXT,
            catalog_year INTEGER,
            modality_id INTEGER,
            
            gde_discipline_id TEXT,
            gde_has_completed INTEGER,
            gde_plan_status INTEGER,
            gde_can_enroll INTEGER,
            gde_prereqs_raw INTEGER,
            gde_offers_raw TEXT,
            gde_color_raw TEXT,
            gde_plan_status_raw TEXT,
            
            PRIMARY KEY (user_id, code)
        )
        """
    )
    
    # LEFT JOIN catalog with GDE overlay
    # Deduplicate catalog by picking first occurrence per code
    # Default gde_has_completed=1 for catalog-only courses (not in GDE)
    insert_sql = """
        WITH catalog_base AS (
            SELECT 
                ce.rowid AS ce_rowid,
                d.code AS code,
                d.name AS name,
                ce.credits AS credits,
                ce.tipo AS course_type,
                ce.semester AS recommended_semester,
                ce.cp_group AS cp_group,
                ce.catalogo AS catalog_year,
                cc.modality_id AS modality_id
            FROM catalog.curriculum_entry ce
            JOIN catalog.catalog_curriculum cc ON ce.curriculum_id = cc.curriculum_id
            JOIN catalog.discipline d ON ce.discipline_id = d.discipline_id
            JOIN catalog.catalog_modality cm ON cc.modality_id = cm.modality_id
            WHERE cm.course_id = ? AND cc.year = ?
        ),
        catalog_deduplicated AS (
            SELECT * FROM catalog_base 
            WHERE ce_rowid IN (
                SELECT MIN(ce_rowid) FROM catalog_base GROUP BY code
            )
        )
        INSERT INTO user_curriculum_raw_standardized (
            user_id, code, name, credits, course_type, recommended_semester,
            cp_group, catalog_year, modality_id,
            gde_discipline_id, gde_has_completed, gde_plan_status,
            gde_can_enroll, gde_prereqs_raw, gde_offers_raw,
            gde_color_raw, gde_plan_status_raw
        )
        SELECT
            ? AS user_id,
            COALESCE(g.code, c.code) AS code,
            c.name,
            c.credits,
            c.course_type,
            c.recommended_semester,
            c.cp_group,
            c.catalog_year,
            c.modality_id,
            g.gde_discipline_id,
            COALESCE(g.gde_has_completed, 1) AS gde_has_completed,
            g.gde_plan_status,
            g.gde_can_enroll,
            g.gde_prereqs_raw,
            g.gde_offers_raw,
            g.gde_color_raw,
            g.gde_plan_status_raw
        FROM catalog_deduplicated c
        LEFT JOIN gde_overlay_temp g ON c.code = g.code
    """
    
    user_auth_conn.execute(insert_sql, (course_id, catalog_year, str(user_id)))
    user_auth_conn.commit()
    
    # Count rows
    count = user_auth_conn.execute(
        "SELECT COUNT(*) FROM user_curriculum_raw_standardized WHERE user_id = ?",
        (str(user_id),)
    ).fetchone()[0]
    
    return count


def fetch_validation_row(conn: sqlite3.Connection, user_id: int, code: str) -> Dict[str, Any]:
    """Fetch a single row for validation and return as dict."""
    cur = conn.execute(
        """
        SELECT user_id, code, name, credits, course_type, recommended_semester,
               cp_group, catalog_year, modality_id,
               gde_discipline_id, gde_has_completed, gde_plan_status,
               gde_can_enroll, gde_prereqs_raw, gde_offers_raw,
               gde_color_raw, gde_plan_status_raw
        FROM user_curriculum_raw_standardized
        WHERE user_id = ? AND code = ?
        """,
        (str(user_id), code),
    )
    row = cur.fetchone()
    if not row:
        return {"code": code, "error": "NOT FOUND"}
    
    cols = [d[0] for d in cur.description]
    return {cols[i]: row[i] for i in range(len(cols))}


def main():
    if not CATALOG_DB.exists():
        print(f"❌ Missing catalog.db at {CATALOG_DB}")
        return
    if not USER_AUTH_DB.exists():
        print(f"❌ Missing user_auth.db at {USER_AUTH_DB}")
        return
    if not LOGIN_JSON.exists():
        print(f"❌ Missing login.json at {LOGIN_JSON}")
        return
    
    # Load GDE login data
    gde_login = load_login_json(LOGIN_JSON)
    user_db = gde_login.get("user_db", {})
    user_meta = user_db.get("user", {})
    course_meta = user_db.get("course", {})
    ra = str(user_meta.get("ra"))
    course_id = int(course_meta.get("id", 0))
    catalog_year = int(user_db.get("year", 0))
    
    if not (course_id and catalog_year and ra):
        print("❌ Missing required identifiers (course_id/catalog_year/ra).")
        return
    
    # Connect to user_auth.db
    user_auth_conn = sqlite3.connect(str(USER_AUTH_DB))
    user_auth_conn.row_factory = sqlite3.Row
    
    user_id = get_user_id(user_auth_conn, ra)
    if user_id is None:
        print(f"❌ User RA {ra} not found in users table.")
        user_auth_conn.close()
        return
    
    # Detect first login
    is_first_login = detect_first_login(user_auth_conn, user_id)
    print(f"🔍 First login: {is_first_login}")
    
    # Prepare GDE overlay with semantic transforms
    overlay_rows = prepare_gde_overlay(user_db, is_first_login)
    print(f"📦 GDE overlay: {len(overlay_rows)} disciplines")
    
    # Create temp table for GDE overlay
    ensure_gde_overlay_temp_table(user_auth_conn, overlay_rows)
    
    # Build standardized curriculum table
    print(f"🔨 Building user_curriculum_raw_standardized...")
    count = rebuild_user_curriculum_standardized(
        user_auth_conn, user_id, course_id, catalog_year
    )
    
    print(f"\n✅ Phase 0.5 Complete: Loaded {count} catalog rows for user {ra}\n")
    
    # Validation: print MC358, MC458, MC558
    print("🔍 Validation Rows:\n")
    for code in ["MC358", "MC458", "MC558"]:
        row = fetch_validation_row(user_auth_conn, user_id, code)
        print(json.dumps(row, ensure_ascii=False, indent=2))
        print()
    
    # Cleanup
    user_auth_conn.execute("DROP TABLE IF EXISTS gde_overlay_temp")
    user_auth_conn.commit()
    user_auth_conn.close()
    
    print(f"📊 Total rows inserted: {count}")
    print(f"✅ user_curriculum_raw_standardized is ready for Phase 1 (status/eligibility engine)")


if __name__ == "__main__":
    main()
