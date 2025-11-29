from __future__ import annotations

import json
from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.db.repositories.tree_repository import TreeRepository
from app.utils.logging_setup import logger
from app.utils.errors import AppError

class TreeService:
    def __init__(self, db: Session):
        self.repo = TreeRepository(db)

    def build_for_user(self, user_id: str) -> Dict[str, Any]:
        logger.info(f"[TreeService] Building tree for user_id={user_id}")
        rows = self.repo.fetch_user_snapshot_rows(user_id)
        if not rows:
            raise AppError(f"No curriculum snapshot found for user {user_id}")
        curriculum: List[Dict[str, Any]] = []
        for row in rows:
            prereq_list = json.loads(row.get("prereq_list") or "[]")
            children_list = json.loads(row.get("children_list") or "[]")
            graph_position = json.loads(row.get("graph_position") or "{\"x\":0,\"y\":0}")
            gde_offers_raw = json.loads(row.get("gde_offers_raw") or "[]")

            curriculum.append({
                "code": row.get("code"),
                "name": row.get("name"),
                "credits": row.get("credits"),
                "course_type": row.get("course_type"),
                "recommended_semester": row.get("recommended_semester"),
                "cp_group": row.get("cp_group"),
                "catalog_year": row.get("catalog_year"),
                "modality_id": row.get("modality_id"),
                "gde_discipline_id": row.get("gde_discipline_id"),
                "gde_has_completed": row.get("gde_has_completed"),
                "gde_plan_status": row.get("gde_plan_status"),
                "gde_can_enroll": row.get("gde_can_enroll"),
                "gde_prereqs_raw": row.get("gde_prereqs_raw"),
                "gde_offers_raw": gde_offers_raw,
                "gde_color_raw": row.get("gde_color_raw"),
                "gde_plan_status_raw": row.get("gde_plan_status_raw"),
                "is_completed": row.get("is_completed"),
                "prereq_status": row.get("prereq_status"),
                "is_eligible": row.get("is_eligible"),
                "is_offered": row.get("is_offered"),
                "final_status": row.get("final_status"),
                "prereq_list": prereq_list,
                "children_list": children_list,
                "depth": row.get("depth"),
                "color_hex": row.get("color_hex"),
                "graph_position": graph_position,
                "order_index": row.get("order_index"),
            })
        return {"user_id": user_id, "curriculum": curriculum}
