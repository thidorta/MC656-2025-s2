"""
TreeGraphService - Phase 2 Logic
Builds prerequisite graph and computes tree structure
"""
from __future__ import annotations

import json
import sqlite3
from collections import deque
from pathlib import Path
from typing import Dict, List, Set

from app.utils.logging_setup import logger
from app.utils.color_utils import STATUS_COLORS


class TreeGraphService:
    """Service for building curriculum tree with prerequisite graph."""

    def __init__(self, catalog_db_path: Path, user_auth_db_path: Path):
        self.catalog_db_path = catalog_db_path
        self.user_auth_db_path = user_auth_db_path

    def load_catalog_prerequisites(
        self, catalog_conn: sqlite3.Connection, course_id: int, catalog_year: int
    ) -> Dict[str, List[str]]:
        """Load prerequisite graph from catalog.db."""
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

    def build_children_map(self, prereqs: Dict[str, List[str]], all_codes: Set[str]) -> Dict[str, List[str]]:
        """Build reverse prerequisite map (children)."""
        children: Dict[str, List[str]] = {code: [] for code in all_codes}
        
        for course, course_prereqs in prereqs.items():
            for prereq in course_prereqs:
                if prereq in children:
                    children[prereq].append(course)
        
        return children

    def compute_depth_levels(self, prereqs: Dict[str, List[str]], all_codes: Set[str]) -> Dict[str, int]:
        """Compute depth using BFS/topological layering."""
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
            
            for code in all_codes:
                if code in depths:
                    continue
                
                course_prereqs = prereqs.get(code, [])
                if current in course_prereqs:
                    all_prereqs_done = all(p in depths for p in course_prereqs)
                    
                    if all_prereqs_done:
                        max_prereq_depth = max(depths[p] for p in course_prereqs)
                        depths[code] = max_prereq_depth + 1
                        queue.append(code)
        
        # Handle any remaining courses (cycles or disconnected)
        for code in all_codes:
            if code not in depths:
                depths[code] = 0
        
        return depths

    def rebuild_user_curriculum_tree(self) -> int:
        """Build tree structure from normalized data + catalog prerequisites."""
        user_auth_conn = sqlite3.connect(str(self.user_auth_db_path))
        catalog_conn = sqlite3.connect(str(self.catalog_db_path))

        try:
            # Get course/catalog info from first row
            row = user_auth_conn.execute(
                "SELECT user_id, catalog_year, modality_id FROM user_curriculum_normalized LIMIT 1"
            ).fetchone()
            
            if not row:
                raise ValueError("No data in user_curriculum_normalized")
            
            user_id, catalog_year, modality_id = row[0], row[1], row[2]
            
            # Get course_id from catalog
            course_id_row = catalog_conn.execute("""
                SELECT cm.course_id
                FROM catalog_curriculum cc
                JOIN catalog_modality cm ON cc.modality_id = cm.modality_id
                WHERE cc.year = ? AND cm.modality_id = ?
                LIMIT 1
            """, (catalog_year, modality_id)).fetchone()
            
            if not course_id_row:
                raise ValueError(f"Could not find course_id for modality_id={modality_id}, catalog_year={catalog_year}")
            
            course_id = course_id_row[0]
            
            # Load prerequisite graph
            prereqs = self.load_catalog_prerequisites(catalog_conn, course_id, catalog_year)
            
            # Get all codes
            all_codes_result = user_auth_conn.execute(
                "SELECT code FROM user_curriculum_normalized WHERE user_id = ?", (user_id,)
            ).fetchall()
            all_codes = {row[0] for row in all_codes_result}
            
            # Build children map and compute depths
            children_map = self.build_children_map(prereqs, all_codes)
            depth_map = self.compute_depth_levels(prereqs, all_codes)
            
            # Drop and recreate tree table
            user_auth_conn.execute("DROP TABLE IF EXISTS user_curriculum_tree")
            user_auth_conn.execute("""
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
            """)
            
            # Read all Phase 1 rows and insert into tree
            cur = user_auth_conn.execute("""
                SELECT
                    user_id, code, name, credits, course_type, recommended_semester, cp_group,
                    is_completed, prereq_status, is_eligible, is_offered, final_status,
                    gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
                    gde_offers_raw, gde_color_raw, gde_plan_status_raw
                FROM user_curriculum_normalized
                WHERE user_id = ?
            """, (user_id,))
            
            rows = cur.fetchall()
            
            for row in rows:
                (user_id, code, name, credits, course_type, recommended_semester, cp_group,
                 is_completed, prereq_status, is_eligible, is_offered, final_status,
                 gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
                 gde_offers_raw, gde_color_raw, gde_plan_status_raw) = row
                
                # Get graph data
                parents = prereqs.get(code, [])
                children = children_map.get(code, [])
                depth = depth_map.get(code, 0)
                
                # Compute tree metadata
                color_tree = STATUS_COLORS.get(final_status, "#CCCCCC")
                is_planned = 1 if gde_plan_status == 1 else 0
                
                # Serialize as JSON
                parents_json = json.dumps(parents, ensure_ascii=False)
                children_json = json.dumps(children, ensure_ascii=False)
                
                user_auth_conn.execute("""
                    INSERT INTO user_curriculum_tree (
                        user_id, code, name, credits, course_type, recommended_semester, cp_group,
                        is_completed, prereq_status, is_eligible, is_offered, final_status,
                        children, parents, depth_level, color_tree, is_planned,
                        gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
                        gde_offers_raw, gde_color_raw, gde_plan_status_raw
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id, code, name, credits, course_type, recommended_semester, cp_group,
                    is_completed, prereq_status, is_eligible, is_offered, final_status,
                    children_json, parents_json, depth, color_tree, is_planned,
                    gde_has_completed, gde_plan_status, gde_can_enroll, gde_prereqs_raw,
                    gde_offers_raw, gde_color_raw, gde_plan_status_raw
                ))
            
            user_auth_conn.commit()
            count = len(rows)
            logger.info(f"[TreeGraphService] Built tree with {count} nodes")
            return count

        finally:
            catalog_conn.close()
            user_auth_conn.close()
