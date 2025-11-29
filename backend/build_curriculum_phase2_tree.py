"""
Phase 2: Tree Builder

Input: user_curriculum_normalized (Phase 1 academic state)
Output: user_curriculum_tree (structured tree with graph + metadata)

Computes:
- Prerequisite graph (parents/children) from catalog.db
- Depth levels using BFS/topological sort
- Tree colors based on final_status
- is_planned flag from gde_plan_status

This is a PURE structural tree builder.
Does NOT:
- Recompute eligibility or offers
- Modify Phase 1 data
- Generate planner suggestions
"""

from __future__ import annotations

import json
import sqlite3
from collections import deque
from pathlib import Path
from typing import Any, Dict, List, Set

BACKEND_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BACKEND_DIR.parent

CATALOG_DB = WORKSPACE_DIR / "crawler" / "data" / "db" / "catalog.db"
USER_AUTH_DB = BACKEND_DIR / "data" / "user_auth.db"


# Status -> Color mapping for tree visualization
STATUS_COLORS = {
    "completed": "#55CC55",  # green
    "eligible_and_offered": "#FFFF66",  # yellow
    "eligible_not_offered": "#DDDDDD",  # gray
    "not_eligible": "#FF6666",  # red
}


def load_catalog_prerequisites(catalog_conn: sqlite3.Connection, course_id: int, catalog_year: int) -> Dict[str, List[str]]:
    """
    Load prerequisite graph from catalog.db.
    
    Returns: {code: [list of prerequisite codes]}
    """
    # Attach catalog.db if not already attached
    catalog_conn.row_factory = sqlite3.Row
    
    query = """
    SELECT
        d.code AS course_code,
        pr.required_code AS prereq_code
    FROM prereq_requirement pr
    JOIN prereq_group pg ON pr.group_id = pg.group_id
    JOIN curriculum_entry ce ON pg.entry_id = ce.entry_id
    JOIN catalog_curriculum cc ON ce.curriculum_id = cc.curriculum_id
    JOIN catalog_modality cm ON cc.modality_id = cm.modality_id
    JOIN discipline d ON ce.discipline_id = d.discipline_id
    WHERE cm.course_id = ? AND cc.year = ?
    ORDER BY d.code, pr.required_code
    """
    
    prereqs: Dict[str, List[str]] = {}
    cur = catalog_conn.execute(query, (course_id, catalog_year))
    
    for row in cur.fetchall():
        course_code = row['course_code']
        prereq_code = row['prereq_code']
        
        if course_code not in prereqs:
            prereqs[course_code] = []
        
        if prereq_code and prereq_code not in prereqs[course_code]:
            prereqs[course_code].append(prereq_code)
    
    return prereqs


def build_children_map(prereqs: Dict[str, List[str]], all_codes: Set[str]) -> Dict[str, List[str]]:
    """
    Build reverse prerequisite map (children).
    
    If A requires B, then B.children includes A.
    """
    children: Dict[str, List[str]] = {code: [] for code in all_codes}
    
    for course, course_prereqs in prereqs.items():
        for prereq in course_prereqs:
            if prereq in children:
                children[prereq].append(course)
    
    return children


def compute_depth_levels(prereqs: Dict[str, List[str]], all_codes: Set[str]) -> Dict[str, int]:
    """
    Compute depth using BFS/topological layering.
    
    depth = 0: courses with no prerequisites
    depth = n: max(parent_depths) + 1
    """
    depths: Dict[str, int] = {}
    
    # Find courses with no prerequisites (depth 0)
    queue = deque()
    for code in all_codes:
        course_prereqs = prereqs.get(code, [])
        if not course_prereqs:
            depths[code] = 0
            queue.append(code)
    
    # BFS to assign depths
    while queue:
        current = queue.popleft()
        current_depth = depths[current]
        
        # Find all courses that depend on current
        for code in all_codes:
            if code in depths:
                continue  # Already processed
            
            course_prereqs = prereqs.get(code, [])
            if current in course_prereqs:
                # Check if all prerequisites have been assigned depths
                all_prereqs_done = all(p in depths for p in course_prereqs)
                
                if all_prereqs_done:
                    # Depth is max of parent depths + 1
                    max_prereq_depth = max(depths[p] for p in course_prereqs)
                    depths[code] = max_prereq_depth + 1
                    queue.append(code)
    
    # Handle any remaining courses (cycles or disconnected)
    for code in all_codes:
        if code not in depths:
            depths[code] = 0  # Default depth for orphans
    
    return depths


def rebuild_user_curriculum_tree(user_auth_conn: sqlite3.Connection, catalog_conn: sqlite3.Connection):
    """
    Build tree structure from Phase 1 normalized data + catalog prerequisites.
    
    Strategy: DELETE + INSERT (idempotent)
    """
    # Get course/catalog info from first row
    row = user_auth_conn.execute(
        "SELECT user_id, catalog_year, modality_id FROM user_curriculum_normalized LIMIT 1"
    ).fetchone()
    
    if not row:
        print("❌ No data in user_curriculum_normalized")
        return 0
    
    user_id, catalog_year, modality_id = row[0], row[1], row[2]
    
    # We need course_id for catalog query - get it from catalog_curriculum
    course_id_row = catalog_conn.execute(
        """
        SELECT cm.course_id
        FROM catalog_curriculum cc
        JOIN catalog_modality cm ON cc.modality_id = cm.modality_id
        WHERE cc.year = ? AND cm.modality_id = ?
        LIMIT 1
        """,
        (catalog_year, modality_id)
    ).fetchone()
    
    if not course_id_row:
        print(f"❌ Could not find course_id for modality_id={modality_id}, catalog_year={catalog_year}")
        return 0
    
    course_id = course_id_row[0]
    
    # Load prerequisite graph from catalog
    prereqs = load_catalog_prerequisites(catalog_conn, course_id, catalog_year)
    
    # Get all course codes from Phase 1
    all_codes_result = user_auth_conn.execute(
        "SELECT code FROM user_curriculum_normalized WHERE user_id = ?",
        (user_id,)
    ).fetchall()
    all_codes = {row[0] for row in all_codes_result}
    
    # Build children map
    children_map = build_children_map(prereqs, all_codes)
    
    # Compute depths
    depth_map = compute_depth_levels(prereqs, all_codes)
    
    # Drop and recreate tree table
    user_auth_conn.execute("DROP TABLE IF EXISTS user_curriculum_tree")
    user_auth_conn.execute(
        """
        CREATE TABLE user_curriculum_tree (
            user_id TEXT NOT NULL,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            credits INTEGER,
            course_type TEXT,
            recommended_semester INTEGER,
            cp_group TEXT,
            
            is_completed INTEGER NOT NULL,
            prereq_status TEXT NOT NULL,
            is_eligible INTEGER NOT NULL,
            is_offered INTEGER NOT NULL,
            final_status TEXT NOT NULL,
            
            children TEXT,
            parents TEXT,
            depth_level INTEGER NOT NULL,
            color_tree TEXT NOT NULL,
            is_planned INTEGER NOT NULL,
            
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
    
    # Read all Phase 1 rows and insert into tree
    cur = user_auth_conn.execute(
        """
        SELECT
            user_id, code, name, credits, course_type, recommended_semester, cp_group,
            is_completed, prereq_status, is_eligible, is_offered, final_status,
            gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
            gde_offers_raw, gde_color_raw, gde_plan_status_raw
        FROM user_curriculum_normalized
        WHERE user_id = ?
        """,
        (user_id,)
    )
    
    rows = cur.fetchall()
    
    for row in rows:
        (
            user_id, code, name, credits, course_type, recommended_semester, cp_group,
            is_completed, prereq_status, is_eligible, is_offered, final_status,
            gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
            gde_offers_raw, gde_color_raw, gde_plan_status_raw
        ) = row
        
        # Get graph data for this course
        parents = prereqs.get(code, [])
        children = children_map.get(code, [])
        depth = depth_map.get(code, 0)
        
        # Compute tree metadata
        color_tree = STATUS_COLORS.get(final_status, "#CCCCCC")
        is_planned = 1 if gde_plan_status == 1 else 0
        
        # Serialize parents/children as JSON
        parents_json = json.dumps(parents, ensure_ascii=False)
        children_json = json.dumps(children, ensure_ascii=False)
        
        # Insert into tree table
        user_auth_conn.execute(
            """
            INSERT INTO user_curriculum_tree (
                user_id, code, name, credits, course_type, recommended_semester, cp_group,
                is_completed, prereq_status, is_eligible, is_offered, final_status,
                children, parents, depth_level, color_tree, is_planned,
                gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
                gde_offers_raw, gde_color_raw, gde_plan_status_raw
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id, code, name, credits, course_type, recommended_semester, cp_group,
                is_completed, prereq_status, is_eligible, is_offered, final_status,
                children_json, parents_json, depth, color_tree, is_planned,
                gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
                gde_offers_raw, gde_color_raw, gde_plan_status_raw
            )
        )
    
    user_auth_conn.commit()
    return len(rows)


def fetch_validation_row(conn: sqlite3.Connection, user_id: str, code: str) -> Dict[str, Any]:
    """Fetch a single tree row for validation."""
    cur = conn.execute(
        """
        SELECT
            code, name, final_status, prereq_status, is_completed, is_eligible, is_offered,
            parents, children, depth_level, color_tree, is_planned
        FROM user_curriculum_tree
        WHERE user_id = ? AND code = ?
        """,
        (user_id, code),
    )
    row = cur.fetchone()
    if not row:
        return {"code": code, "error": "NOT FOUND"}
    
    cols = [d[0] for d in cur.description]
    data = {cols[i]: row[i] for i in range(len(cols))}
    
    # Parse JSON fields
    if data.get('parents'):
        data['parents'] = json.loads(data['parents'])
    if data.get('children'):
        data['children'] = json.loads(data['children'])
    
    return data


def main():
    if not USER_AUTH_DB.exists():
        print(f"❌ Missing user_auth.db at {USER_AUTH_DB}")
        return
    if not CATALOG_DB.exists():
        print(f"❌ Missing catalog.db at {CATALOG_DB}")
        return
    
    # Connect to databases
    user_auth_conn = sqlite3.connect(str(USER_AUTH_DB))
    catalog_conn = sqlite3.connect(str(CATALOG_DB))
    
    # Verify Phase 1 data exists
    try:
        count_check = user_auth_conn.execute(
            "SELECT COUNT(*) FROM user_curriculum_normalized"
        ).fetchone()[0]
        print(f"📦 Input: {count_check} rows in user_curriculum_normalized")
    except sqlite3.OperationalError:
        print("❌ Table user_curriculum_normalized does not exist. Run Phase 1 first.")
        user_auth_conn.close()
        catalog_conn.close()
        return
    
    # Build tree
    print("🌳 Building user_curriculum_tree...")
    count = rebuild_user_curriculum_tree(user_auth_conn, catalog_conn)
    
    print(f"\n✅ Phase 2 Complete: Built tree with {count} nodes\n")
    
    # Validation: print MC358, MC458, MC558
    print("🔍 Validation Rows:\n")
    
    user_id = user_auth_conn.execute(
        "SELECT DISTINCT user_id FROM user_curriculum_tree LIMIT 1"
    ).fetchone()[0]
    
    for code in ["MC358", "MC458", "MC558"]:
        row = fetch_validation_row(user_auth_conn, user_id, code)
        print(f"--- {code} ---")
        print(json.dumps(row, ensure_ascii=False, indent=2))
        print()
    
    catalog_conn.close()
    user_auth_conn.close()
    
    print(f"📊 Total tree nodes: {count}")
    print(f"✅ user_curriculum_tree is ready for /tree API endpoint")


if __name__ == "__main__":
    main()
