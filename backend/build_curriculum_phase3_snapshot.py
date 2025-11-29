"""
Phase 3: Snapshot Builder

Input: user_curriculum_normalized (Phase 1) + user_curriculum_tree (Phase 2)
Output: user_curriculum_snapshot (unified denormalized table for API)

Assembles final snapshot with:
- Catalog fields
- GDE raw fields (EXACT names preserved)
- Normalized academic state (from Phase 1)
- Tree metadata (from Phase 2)

This is a PURE data merger.
Does NOT:
- Recompute any logic (uses Phase 1/2 results exactly)
- Modify field names
- Generate new values
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BACKEND_DIR.parent

USER_AUTH_DB = BACKEND_DIR / "data" / "user_auth.db"


def rebuild_user_curriculum_snapshot(conn: sqlite3.Connection):
    """
    Build unified snapshot from Phase 1 + Phase 2.
    
    Strategy: DELETE + INSERT (idempotent)
    """
    conn.row_factory = sqlite3.Row
    
    # Verify Phase 1 and Phase 2 tables exist and have data
    try:
        count_p1 = conn.execute(
            "SELECT COUNT(*) FROM user_curriculum_normalized"
        ).fetchone()[0]
        count_p2 = conn.execute(
            "SELECT COUNT(*) FROM user_curriculum_tree"
        ).fetchone()[0]
        
        print(f"📦 Input: {count_p1} rows from Phase 1, {count_p2} rows from Phase 2")
        
        if count_p1 == 0:
            print("❌ Phase 1 (user_curriculum_normalized) is empty. Run Phase 1 first.")
            return 0
        
        if count_p2 == 0:
            print("❌ Phase 2 (user_curriculum_tree) is empty. Run Phase 2 first.")
            return 0
        
    except sqlite3.OperationalError as e:
        print(f"❌ Missing input tables: {e}")
        print("   Run Phase 1 and Phase 2 first.")
        return 0
    
    # Drop and recreate snapshot table
    conn.execute("DROP TABLE IF EXISTS user_curriculum_snapshot")
    conn.execute(
        """
        CREATE TABLE user_curriculum_snapshot (
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
            
            prereq_list TEXT,
            children_list TEXT,
            depth INTEGER NOT NULL,
            color_hex TEXT NOT NULL,
            graph_position TEXT,
            order_index INTEGER,
            
            PRIMARY KEY (user_id, code)
        )
        """
    )
    
    # Join Phase 1 + Phase 2
    # Use Phase 1 as base (has all fields including catalog_year, modality_id)
    # Add tree metadata from Phase 2
    query = """
    SELECT
        p1.user_id,
        p1.code,
        p1.name,
        p1.credits,
        p1.course_type,
        p1.recommended_semester,
        p1.cp_group,
        p1.catalog_year,
        p1.modality_id,
        
        p1.gde_discipline_id,
        p1.gde_has_completed,
        p1.gde_plan_status,
        p1.gde_can_enroll,
        p1.gde_prereqs_raw,
        p1.gde_offers_raw,
        p1.gde_color_raw,
        p1.gde_plan_status_raw,
        
        p1.is_completed,
        p1.prereq_status,
        p1.is_eligible,
        p1.is_offered,
        p1.final_status,
        
        p2.parents AS prereq_list,
        p2.children AS children_list,
        p2.depth_level AS depth,
        p2.color_tree AS color_hex
    FROM user_curriculum_normalized p1
    LEFT JOIN user_curriculum_tree p2
        ON p1.user_id = p2.user_id AND p1.code = p2.code
    """
    
    cur = conn.execute(query)
    rows = cur.fetchall()
    
    if not rows:
        print("❌ JOIN returned no rows. Check Phase 1/2 data.")
        return 0
    
    # Insert into snapshot with graph_position and order_index
    insert_count = 0
    
    for idx, row in enumerate(rows):
        # Parse prerequisite list for auto-positioning (simplified)
        prereq_list_json = row['prereq_list'] or '[]'
        children_list_json = row['children_list'] or '[]'
        
        # Compute simple graph position (can be enhanced later)
        # For now: x = depth * 100, y = order_index * 80
        depth = row['depth'] if row['depth'] is not None else 0
        order_index = idx  # Use row index as topological order
        
        graph_position = json.dumps({"x": depth * 100, "y": order_index * 80})
        
        conn.execute(
            """
            INSERT INTO user_curriculum_snapshot (
                user_id, code, name, credits, course_type, recommended_semester, cp_group,
                catalog_year, modality_id,
                gde_discipline_id, gde_has_completed, gde_plan_status, gde_can_enroll,
                gde_prereqs_raw, gde_offers_raw, gde_color_raw, gde_plan_status_raw,
                is_completed, prereq_status, is_eligible, is_offered, final_status,
                prereq_list, children_list, depth, color_hex, graph_position, order_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row['user_id'],
                row['code'],
                row['name'],
                row['credits'],
                row['course_type'],
                row['recommended_semester'],
                row['cp_group'],
                row['catalog_year'],
                row['modality_id'],
                
                row['gde_discipline_id'],
                row['gde_has_completed'],
                row['gde_plan_status'],
                row['gde_can_enroll'],
                row['gde_prereqs_raw'],
                row['gde_offers_raw'],
                row['gde_color_raw'],
                row['gde_plan_status_raw'],
                
                row['is_completed'],
                row['prereq_status'],
                row['is_eligible'],
                row['is_offered'],
                row['final_status'],
                
                prereq_list_json,
                children_list_json,
                depth,
                row['color_hex'] if row['color_hex'] else '#CCCCCC',
                graph_position,
                order_index,
            )
        )
        insert_count += 1
    
    conn.commit()
    return insert_count


def fetch_validation_row(conn: sqlite3.Connection, user_id: str, code: str) -> Dict[str, Any]:
    """Fetch a single snapshot row for validation."""
    conn.row_factory = sqlite3.Row
    cur = conn.execute(
        """
        SELECT
            code, name, catalog_year, modality_id,
            gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
            gde_offers_raw, gde_discipline_id,
            is_completed, prereq_status, is_eligible, is_offered, final_status,
            prereq_list, children_list, depth, color_hex, graph_position, order_index
        FROM user_curriculum_snapshot
        WHERE user_id = ? AND code = ?
        """,
        (user_id, code),
    )
    row = cur.fetchone()
    
    if not row:
        return {"code": code, "error": "NOT FOUND"}
    
    # Convert to dict
    cols = [d[0] for d in cur.description]
    data = {cols[i]: row[i] for i in range(len(cols))}
    
    # Parse JSON fields
    for field in ['prereq_list', 'children_list', 'graph_position']:
        if data.get(field):
            try:
                data[field] = json.loads(data[field])
            except:
                pass
    
    return data


def main():
    if not USER_AUTH_DB.exists():
        print(f"❌ Missing user_auth.db at {USER_AUTH_DB}")
        return
    
    # Connect to database
    conn = sqlite3.connect(str(USER_AUTH_DB))
    conn.execute("PRAGMA foreign_keys = ON")
    
    # Build snapshot
    print("📸 Building user_curriculum_snapshot...")
    count = rebuild_user_curriculum_snapshot(conn)
    
    if count == 0:
        conn.close()
        return
    
    print(f"\n✅ Phase 3 Complete: Built snapshot with {count} nodes\n")
    
    # Validation: print MC358, MC458, MC558
    print("🔍 Validation Rows:\n")
    
    user_id = conn.execute(
        "SELECT DISTINCT user_id FROM user_curriculum_snapshot LIMIT 1"
    ).fetchone()[0]
    
    for code in ["MC358", "MC458", "MC558"]:
        row = fetch_validation_row(conn, user_id, code)
        print(f"--- {code} ---")
        print(json.dumps(row, ensure_ascii=False, indent=2))
        print()
    
    conn.close()
    
    print(f"📊 Total snapshot nodes: {count}")
    print(f"✅ user_curriculum_snapshot is ready for /tree API endpoint")


if __name__ == "__main__":
    main()
