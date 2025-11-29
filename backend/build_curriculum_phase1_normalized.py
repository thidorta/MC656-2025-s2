"""
Phase 1: Academic Status Engine

Input: user_curriculum_raw_standardized (raw catalog + GDE overlay)
Output: user_curriculum_normalized (academic state with computed fields)

Computes:
- is_completed: derived from gde_has_completed (null → 1, else use value)
- prereq_status: mapped from gde_prereqs_raw (null → done_or_irrelevant, 0 → satisfied, 1 → missing)
- is_eligible: based on completion + prereq status
- is_offered: based on gde_offers_raw presence
- final_status: decision tree combining all factors

This is a PURE academic normalization engine.
Does NOT:
- Generate tree snapshots
- Compute planner overlays
- Merge catalog prerequisites
- Infer missing data
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

BACKEND_DIR = Path(__file__).resolve().parent
USER_AUTH_DB = BACKEND_DIR / "data" / "user_auth.db"


def compute_is_completed(gde_has_completed: int | None) -> int:
    """
    Determine if course is completed.
    
    Rules:
    - null -> 1 (historically completed)
    - 1 -> 1 (completed)
    - 0 -> 0 (not completed)
    """
    if gde_has_completed is None:
        return 1
    return gde_has_completed


def compute_prereq_status(gde_prereqs_raw: int | None) -> str:
    """
    Map prerequisite raw status to human-readable status.
    
    Mapping:
    - null -> done_or_irrelevant
    - 0 -> satisfied
    - 1 -> missing
    """
    if gde_prereqs_raw is None:
        return "done_or_irrelevant"
    elif gde_prereqs_raw == 0:
        return "satisfied"
    else:
        return "missing"


def compute_is_offered(gde_offers_raw: str | None) -> int:
    """
    Determine if course is currently offered.
    
    Rules:
    - null -> 0 (not offered)
    - non-null -> 1 (offered)
    """
    return 0 if gde_offers_raw is None else 1


def compute_is_eligible(is_completed: int, prereq_status: str) -> int:
    """
    Determine academic eligibility.
    
    Rules:
    - if completed -> 0 (cannot enroll again)
    - if prereq_status == "missing" -> 0
    - else -> 1
    """
    if is_completed == 1:
        return 0
    elif prereq_status == "missing":
        return 0
    else:
        return 1


def compute_final_status(is_completed: int, is_eligible: int, is_offered: int) -> str:
    """
    Determine final academic status using decision tree.
    
    Decision tree:
    - if completed -> "completed"
    - elif not eligible -> "not_eligible"
    - elif eligible and offered -> "eligible_and_offered"
    - else -> "eligible_not_offered"
    """
    if is_completed == 1:
        return "completed"
    elif is_eligible == 0:
        return "not_eligible"
    elif is_eligible == 1 and is_offered == 1:
        return "eligible_and_offered"
    else:
        return "eligible_not_offered"


def rebuild_user_curriculum_normalized(conn: sqlite3.Connection):
    """
    Create normalized curriculum table with computed academic fields.
    
    Strategy: DELETE + INSERT (idempotent)
    """
    # Drop and recreate table
    conn.execute("DROP TABLE IF EXISTS user_curriculum_normalized")
    conn.execute(
        """
        CREATE TABLE user_curriculum_normalized (
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
            
            is_completed INTEGER NOT NULL,
            prereq_status TEXT NOT NULL,
            is_eligible INTEGER NOT NULL,
            is_offered INTEGER NOT NULL,
            final_status TEXT NOT NULL,
            
            PRIMARY KEY (user_id, code)
        )
        """
    )
    
    # Read all rows from raw table
    cur = conn.execute(
        """
        SELECT 
            user_id, code, name, credits, course_type, recommended_semester,
            cp_group, catalog_year, modality_id,
            gde_discipline_id, gde_has_completed, gde_plan_status,
            gde_can_enroll, gde_prereqs_raw, gde_offers_raw,
            gde_color_raw, gde_plan_status_raw
        FROM user_curriculum_raw_standardized
        """
    )
    
    rows = cur.fetchall()
    
    # Process each row and insert into normalized table
    for row in rows:
        (
            user_id, code, name, credits, course_type, recommended_semester,
            cp_group, catalog_year, modality_id,
            gde_discipline_id, gde_has_completed, gde_plan_status,
            gde_can_enroll, gde_prereqs_raw, gde_offers_raw,
            gde_color_raw, gde_plan_status_raw
        ) = row
        
        # Compute Phase 1 fields
        is_completed = compute_is_completed(gde_has_completed)
        prereq_status = compute_prereq_status(gde_prereqs_raw)
        is_offered = compute_is_offered(gde_offers_raw)
        is_eligible = compute_is_eligible(is_completed, prereq_status)
        final_status = compute_final_status(is_completed, is_eligible, is_offered)
        
        # Insert into normalized table
        conn.execute(
            """
            INSERT INTO user_curriculum_normalized (
                user_id, code, name, credits, course_type, recommended_semester,
                cp_group, catalog_year, modality_id,
                gde_discipline_id, gde_has_completed, gde_plan_status,
                gde_can_enroll, gde_prereqs_raw, gde_offers_raw,
                gde_color_raw, gde_plan_status_raw,
                is_completed, prereq_status, is_eligible, is_offered, final_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id, code, name, credits, course_type, recommended_semester,
                cp_group, catalog_year, modality_id,
                gde_discipline_id, gde_has_completed, gde_plan_status,
                gde_can_enroll, gde_prereqs_raw, gde_offers_raw,
                gde_color_raw, gde_plan_status_raw,
                is_completed, prereq_status, is_eligible, is_offered, final_status
            )
        )
    
    conn.commit()
    return len(rows)


def fetch_validation_row(conn: sqlite3.Connection, user_id: str, code: str) -> Dict[str, Any]:
    """Fetch a single row for validation and return as dict."""
    cur = conn.execute(
        """
        SELECT 
            code, name,
            gde_has_completed, gde_prereqs_raw, gde_offers_raw,
            is_completed, prereq_status, is_eligible, is_offered, final_status
        FROM user_curriculum_normalized
        WHERE user_id = ? AND code = ?
        """,
        (user_id, code),
    )
    row = cur.fetchone()
    if not row:
        return {"code": code, "error": "NOT FOUND"}
    
    cols = [d[0] for d in cur.description]
    return {cols[i]: row[i] for i in range(len(cols))}


def main():
    if not USER_AUTH_DB.exists():
        print(f"❌ Missing user_auth.db at {USER_AUTH_DB}")
        return
    
    # Connect to database
    conn = sqlite3.connect(str(USER_AUTH_DB))
    
    # Verify source table exists
    try:
        count_check = conn.execute(
            "SELECT COUNT(*) FROM user_curriculum_raw_standardized"
        ).fetchone()[0]
        print(f"📦 Input: {count_check} rows in user_curriculum_raw_standardized")
    except sqlite3.OperationalError:
        print("❌ Table user_curriculum_raw_standardized does not exist. Run Phase 0.5 first.")
        conn.close()
        return
    
    # Build normalized table
    print("🔨 Building user_curriculum_normalized...")
    count = rebuild_user_curriculum_normalized(conn)
    
    print(f"\n✅ Phase 1 Complete: Normalized {count} rows\n")
    
    # Validation: print MC358, MC458, MC558
    print("🔍 Validation Rows:\n")
    
    # Get user_id from first row
    user_id = conn.execute(
        "SELECT DISTINCT user_id FROM user_curriculum_normalized LIMIT 1"
    ).fetchone()[0]
    
    for code in ["MC358", "MC458", "MC558"]:
        row = fetch_validation_row(conn, user_id, code)
        print(f"--- {code} ---")
        print(json.dumps(row, ensure_ascii=False, indent=2))
        print()
    
    conn.close()
    
    print(f"📊 Total rows normalized: {count}")
    print(f"✅ user_curriculum_normalized is ready for Phase 2 (tree snapshot generation)")


if __name__ == "__main__":
    main()
