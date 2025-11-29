"""
SnapshotService - Phase 3 Logic
Assembles final denormalized snapshot for API
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from app.utils.logging_setup import logger


class SnapshotService:
    """Service for building final curriculum snapshot."""

    def __init__(self, user_auth_db_path: Path):
        self.user_auth_db_path = user_auth_db_path

    def rebuild_user_curriculum_snapshot(self) -> int:
        """Build unified snapshot from Phase 1 + Phase 2."""
        conn = sqlite3.connect(str(self.user_auth_db_path))
        conn.row_factory = sqlite3.Row
        
        try:
            # Verify inputs
            count_p1 = conn.execute("SELECT COUNT(*) FROM user_curriculum_normalized").fetchone()[0]
            count_p2 = conn.execute("SELECT COUNT(*) FROM user_curriculum_tree").fetchone()[0]
            
            if count_p1 == 0 or count_p2 == 0:
                raise ValueError("Phase 1 or Phase 2 data missing")
            
            # Drop and recreate snapshot table
            conn.execute("DROP TABLE IF EXISTS user_curriculum_snapshot")
            conn.execute("""
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
            """)
            
            # Join Phase 1 + Phase 2
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
                raise ValueError("JOIN returned no rows")
            
            # Insert into snapshot
            for idx, row in enumerate(rows):
                depth = row['depth'] if row['depth'] is not None else 0
                order_index = idx
                graph_position = json.dumps({"x": depth * 100, "y": order_index * 80})
                
                conn.execute("""
                    INSERT INTO user_curriculum_snapshot (
                        user_id, code, name, credits, course_type, recommended_semester, cp_group,
                        catalog_year, modality_id,
                        gde_discipline_id, gde_has_completed, gde_plan_status, gde_can_enroll,
                        gde_prereqs_raw, gde_offers_raw, gde_color_raw, gde_plan_status_raw,
                        is_completed, prereq_status, is_eligible, is_offered, final_status,
                        prereq_list, children_list, depth, color_hex, graph_position, order_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    row['user_id'], row['code'], row['name'], row['credits'], row['course_type'],
                    row['recommended_semester'], row['cp_group'], row['catalog_year'], row['modality_id'],
                    row['gde_discipline_id'], row['gde_has_completed'], row['gde_plan_status'],
                    row['gde_can_enroll'], row['gde_prereqs_raw'], row['gde_offers_raw'],
                    row['gde_color_raw'], row['gde_plan_status_raw'],
                    row['is_completed'], row['prereq_status'], row['is_eligible'],
                    row['is_offered'], row['final_status'],
                    row['prereq_list'] or '[]', row['children_list'] or '[]',
                    depth, row['color_hex'] if row['color_hex'] else '#CCCCCC',
                    graph_position, order_index
                ))
            
            conn.commit()
            count = len(rows)
            logger.info(f"[SnapshotService] Built snapshot with {count} nodes")
            return count

        finally:
            conn.close()
