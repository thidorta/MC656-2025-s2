"""
Phase 0: STRICT RAW LEFT JOIN (catalog.db ← left, GDE user_db ← right)

Requirements Recap:
 - NO business logic (no status/eligibility/offers/prereq normalization).
 - Preserve ALL 2022 catalog rows (expected 108) regardless of user overlay.
 - Rename GDE (right-side) fields ONLY BEFORE JOIN:
     tem           → has_completed_gde
     pode          → can_enroll_gde
     missing       → missing_in_gde_snapshot
     status        → status_gde_raw
     color         → color_gde_raw
     obs           → note_gde_raw
     prereqs       → prereqs_gde_raw
     offers        → offers_gde_raw
     disciplina_id → discipline_id_gde
 - Catalog fields MUST use original names from catalog.db tables (code, name, credits, tipo, semester, cp_group, modality_id, catalogo).
 - RIGHT side overrides on column name collision (handled via COALESCE for code).
 - Final table: user_curriculum_raw with PRIMARY KEY (user_id, code).
 - GDE columns remain NULL when user has no overlay row (e.g., MC358).

Outputs:
 - Creates/replaces table user_curriculum_raw.
 - Prints JSON rows for MC358, MC458, MC558 EXACTLY as stored (raw merge only).
 - Prints confirmation line: "Loaded 108 catalog rows for user 183611 into user_curriculum_raw." once row count validated.
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


def prepare_gde_overlay(user_db: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Rename GDE fields (pre-join only) producing right-side rows keyed by code."""
    overlay: List[Dict[str, Any]] = []
    for item in user_db.get("curriculum", []):
        code = item.get("codigo")
        if not code:
            continue
        overlay.append(
            {
                "code": code,  # join key
                "discipline_id_gde": item.get("disciplina_id"),
                "has_completed_gde": 1 if item.get("tem") else 0 if item.get("tem") is not None else None,
                "can_enroll_gde": 1 if item.get("pode") is True else 0 if item.get("pode") is False else None,
                "missing_in_gde_snapshot": 1 if item.get("missing") else 0 if item.get("missing") is not None else None,
                "status_gde_raw": item.get("status"),
                "color_gde_raw": item.get("color"),
                "note_gde_raw": item.get("obs"),
                "prereqs_gde_raw": json.dumps(item.get("prereqs", []), ensure_ascii=False),
                "offers_gde_raw": json.dumps(item.get("offers", []), ensure_ascii=False),
            }
        )
    return overlay


def ensure_overlay_temp_table(conn: sqlite3.Connection, rows: List[Dict[str, Any]]):
    conn.execute("DROP TABLE IF EXISTS gde_overlay_raw")
    conn.execute(
        """
        CREATE TABLE gde_overlay_raw (
            code TEXT PRIMARY KEY,
            discipline_id_gde TEXT,
            has_completed_gde INTEGER,
            can_enroll_gde INTEGER,
            missing_in_gde_snapshot INTEGER,
            status_gde_raw TEXT,
            color_gde_raw TEXT,
            note_gde_raw TEXT,
            prereqs_gde_raw TEXT,
            offers_gde_raw TEXT
        )
        """
    )
    for r in rows:
        conn.execute(
            """
            INSERT INTO gde_overlay_raw (
                code, discipline_id_gde, has_completed_gde, can_enroll_gde,
                missing_in_gde_snapshot, status_gde_raw, color_gde_raw, note_gde_raw,
                prereqs_gde_raw, offers_gde_raw
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                r["code"],
                r["discipline_id_gde"],
                r["has_completed_gde"],
                r["can_enroll_gde"],
                r["missing_in_gde_snapshot"],
                r["status_gde_raw"],
                r["color_gde_raw"],
                r["note_gde_raw"],
                r["prereqs_gde_raw"],
                r["offers_gde_raw"],
            ),
        )
    conn.commit()


def rebuild_user_curriculum_raw(catalog_conn: sqlite3.Connection, user_auth_conn: sqlite3.Connection, user_id: int, course_id: int, catalog_year: int):
    # Drop + recreate final table (strict schema)
    user_auth_conn.execute("DROP TABLE IF EXISTS user_curriculum_raw")
    user_auth_conn.execute(
        """
        CREATE TABLE user_curriculum_raw (
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            name TEXT,
            credits INTEGER,
            tipo TEXT,
            semester INTEGER,
            cp_group TEXT,
            modality_id INTEGER,
            catalogo INTEGER,
            discipline_id_gde TEXT,
            has_completed_gde INTEGER,
            can_enroll_gde INTEGER,
            missing_in_gde_snapshot INTEGER,
            status_gde_raw TEXT,
            color_gde_raw TEXT,
            note_gde_raw TEXT,
            prereqs_gde_raw TEXT,
            offers_gde_raw TEXT,
            PRIMARY KEY(user_id, code)
        )
        """
    )

    # Perform LEFT JOIN (catalog ← left, gde_overlay_raw ← right). RIGHT side overrides code if present.
    # COALESCE ensures right-side (gde) code wins when both exist.
    # Attach catalog.db to user_auth_conn to perform LEFT JOIN across DBs
    user_auth_conn.execute(f"ATTACH DATABASE '{str(CATALOG_DB).replace('\\', '/')}' AS catalog")

    insert_sql = (
        """
        WITH ce1 AS (
            SELECT ce.rowid AS ce_rowid, ce.*, d.code AS d_code, d.name AS d_name, cc.modality_id AS cc_modality_id
            FROM catalog.curriculum_entry ce
            JOIN catalog.catalog_curriculum cc ON ce.curriculum_id = cc.curriculum_id
            JOIN catalog.discipline d ON ce.discipline_id = d.discipline_id
            JOIN catalog.catalog_modality cm ON cc.modality_id = cm.modality_id
            WHERE cm.course_id = ? AND cc.year = ?
        ), picked AS (
            SELECT * FROM ce1 WHERE ce_rowid IN (
                SELECT MIN(ce_rowid) FROM ce1 GROUP BY d_code
            )
        )
        INSERT INTO user_curriculum_raw (
            user_id, code, name, credits, tipo, semester, cp_group, modality_id, catalogo,
            discipline_id_gde, has_completed_gde, can_enroll_gde, missing_in_gde_snapshot,
            status_gde_raw, color_gde_raw, note_gde_raw, prereqs_gde_raw, offers_gde_raw
        )
        SELECT
            ? AS user_id,
            COALESCE(g.code, p.d_code) AS code,
            p.d_name AS name,
            p.credits,
            p.tipo,
            p.semester,
            p.cp_group,
            p.cc_modality_id AS modality_id,
            p.catalogo,
            g.discipline_id_gde,
            g.has_completed_gde,
            g.can_enroll_gde,
            g.missing_in_gde_snapshot,
            g.status_gde_raw,
            g.color_gde_raw,
            g.note_gde_raw,
            g.prereqs_gde_raw,
            g.offers_gde_raw
        FROM picked p
        LEFT JOIN gde_overlay_raw g ON p.d_code = g.code
        """
    )

    user_auth_conn.execute(insert_sql, (course_id, catalog_year, user_id))
    user_auth_conn.commit()

    # Count rows for validation
    count = user_auth_conn.execute(
        "SELECT COUNT(*) FROM user_curriculum_raw WHERE user_id = ?", (user_id,)
    ).fetchone()[0]
    return count


def fetch_row_json(conn: sqlite3.Connection, user_id: int, code: str) -> str:
    cur = conn.execute(
        """
        SELECT code, name, credits, tipo, semester, cp_group, modality_id, catalogo,
               discipline_id_gde, has_completed_gde, can_enroll_gde, missing_in_gde_snapshot,
               status_gde_raw, color_gde_raw, note_gde_raw, prereqs_gde_raw, offers_gde_raw
        FROM user_curriculum_raw
        WHERE user_id = ? AND code = ?
        """,
        (user_id, code),
    )
    row = cur.fetchone()
    if not row:
        return json.dumps({"code": code, "error": "NOT FOUND"}, ensure_ascii=False)
    cols = [d[0] for d in cur.description]
    data = {cols[i]: row[i] for i in range(len(cols))}
    return json.dumps(data, ensure_ascii=False)


def main():
    if not CATALOG_DB.exists():
        print(f"Missing catalog.db at {CATALOG_DB}")
        return
    if not USER_AUTH_DB.exists():
        print(f"Missing user_auth.db at {USER_AUTH_DB}")
        return
    if not LOGIN_JSON.exists():
        print(f"Missing login.json at {LOGIN_JSON}")
        return

    gde_login = load_login_json(LOGIN_JSON)
    user_db = gde_login.get("user_db", {})
    user_meta = user_db.get("user", {})
    course_meta = user_db.get("course", {})
    ra = str(user_meta.get("ra"))
    course_id = int(course_meta.get("id", 0))
    catalog_year = int(user_db.get("year", 0))

    if not (course_id and catalog_year and ra):
        print("Missing required user_db identifiers (course_id/year/ra).")
        return

    catalog_conn = sqlite3.connect(str(CATALOG_DB))
    user_auth_conn = sqlite3.connect(str(USER_AUTH_DB))
    user_auth_conn.row_factory = sqlite3.Row

    user_id = get_user_id(user_auth_conn, ra)
    if user_id is None:
        print(f"User RA {ra} not found in users table.")
        catalog_conn.close()
        user_auth_conn.close()
        return

    # Prepare right-side overlay (renamed fields only)
    overlay_rows = prepare_gde_overlay(user_db)
    ensure_overlay_temp_table(user_auth_conn, overlay_rows)

    # Build raw left-join table
    count = rebuild_user_curriculum_raw(catalog_conn, user_auth_conn, user_id, course_id, catalog_year)

    # Strict validation prints (raw rows) MC358, MC458, MC558
    targets = ["MC358", "MC458", "MC558"]
    for t in targets:
        print(fetch_row_json(user_auth_conn, user_id, t))

    # Confirmation line (must indicate 108 rows loaded)
    print(f"Loaded {count} catalog rows for user {ra} into user_curriculum_raw.")

    catalog_conn.close()
    user_auth_conn.close()


if __name__ == "__main__":
    main()
