from __future__ import annotations

from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import text

class TreeRepository:
    def __init__(self, db: Session):
        self.db = db

    def fetch_user_snapshot_rows(self, user_id: str) -> List[Dict[str, Any]]:
        query = text(
            """
            SELECT 
                user_id,
                code,
                name,
                credits,
                course_type,
                recommended_semester,
                cp_group,
                catalog_year,
                modality_id,
                gde_discipline_id,
                gde_has_completed,
                gde_plan_status,
                gde_can_enroll,
                gde_prereqs_raw,
                gde_offers_raw,
                gde_color_raw,
                gde_plan_status_raw,
                is_completed,
                prereq_status,
                is_eligible,
                is_offered,
                final_status,
                prereq_list,
                children_list,
                depth,
                color_hex,
                graph_position,
                order_index
            FROM user_curriculum_snapshot
            WHERE user_id = :user_id
            ORDER BY depth ASC, order_index ASC, recommended_semester ASC
            """
        )
        result = self.db.execute(query, {"user_id": str(user_id)})
        # Convert to dicts like row._mapping for portability
        rows = []
        for r in result.fetchall():
            rows.append({
                "user_id": r.user_id,
                "code": r.code,
                "name": r.name,
                "credits": r.credits,
                "course_type": r.course_type,
                "recommended_semester": r.recommended_semester,
                "cp_group": r.cp_group,
                "catalog_year": r.catalog_year,
                "modality_id": r.modality_id,
                "gde_discipline_id": r.gde_discipline_id,
                "gde_has_completed": r.gde_has_completed,
                "gde_plan_status": r.gde_plan_status,
                "gde_can_enroll": r.gde_can_enroll,
                "gde_prereqs_raw": r.gde_prereqs_raw,
                "gde_offers_raw": r.gde_offers_raw,
                "gde_color_raw": r.gde_color_raw,
                "gde_plan_status_raw": r.gde_plan_status_raw,
                "is_completed": r.is_completed,
                "prereq_status": r.prereq_status,
                "is_eligible": r.is_eligible,
                "is_offered": r.is_offered,
                "final_status": r.final_status,
                "prereq_list": r.prereq_list,
                "children_list": r.children_list,
                "depth": r.depth,
                "color_hex": r.color_hex,
                "graph_position": r.graph_position,
                "order_index": r.order_index,
            })
        return rows
