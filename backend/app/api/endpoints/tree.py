"""
GET /tree endpoint - returns curriculum tree snapshot
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.session import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
def get_tree_snapshot(
    user: tuple = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Returns the full curriculum tree snapshot for the authenticated user.
    
    Response format:
    {
        "user_id": int,
        "curriculum": [
            {
                "code": str,
                "name": str,
                "credits": int,
                "course_type": str,
                "recommended_semester": int,
                "cp_group": str,
                "catalog_year": int,
                "modality_id": int,
                "gde_discipline_id": str,
                "gde_has_completed": int,
                "gde_plan_status": int,
                "gde_can_enroll": int,
                "gde_prereqs_raw": int,
                "gde_offers_raw": str (JSON),
                "gde_color_raw": str,
                "gde_plan_status_raw": str,
                "is_completed": int,
                "prereq_status": str,
                "is_eligible": int,
                "is_offered": int,
                "final_status": str,
                "prereq_list": str (JSON array),
                "children_list": str (JSON array),
                "depth": int,
                "color_hex": str,
                "graph_position": str (JSON {x, y}),
                "order_index": int
            },
            ...
        ]
    }
    """
    user_id, payload = user
    logger.info(f"[tree.get] user_id={user_id}")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in credentials")
    
    try:
        query = text("""
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
        """)
        
        result = db.execute(query, {"user_id": str(user_id)})
        rows = result.fetchall()
        
        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"No curriculum snapshot found for user {user_id}"
            )
        
        curriculum = []
        for row in rows:
            # Parse JSON fields
            prereq_list = json.loads(row.prereq_list) if row.prereq_list else []
            children_list = json.loads(row.children_list) if row.children_list else []
            graph_position = json.loads(row.graph_position) if row.graph_position else {"x": 0, "y": 0}
            gde_offers_raw = json.loads(row.gde_offers_raw) if row.gde_offers_raw else []
            
            curriculum.append({
                "code": row.code,
                "name": row.name,
                "credits": row.credits,
                "course_type": row.course_type,
                "recommended_semester": row.recommended_semester,
                "cp_group": row.cp_group,
                "catalog_year": row.catalog_year,
                "modality_id": row.modality_id,
                "gde_discipline_id": row.gde_discipline_id,
                "gde_has_completed": row.gde_has_completed,
                "gde_plan_status": row.gde_plan_status,
                "gde_can_enroll": row.gde_can_enroll,
                "gde_prereqs_raw": row.gde_prereqs_raw,
                "gde_offers_raw": gde_offers_raw,
                "gde_color_raw": row.gde_color_raw,
                "gde_plan_status_raw": row.gde_plan_status_raw,
                "is_completed": row.is_completed,
                "prereq_status": row.prereq_status,
                "is_eligible": row.is_eligible,
                "is_offered": row.is_offered,
                "final_status": row.final_status,
                "prereq_list": prereq_list,
                "children_list": children_list,
                "depth": row.depth,
                "color_hex": row.color_hex,
                "graph_position": graph_position,
                "order_index": row.order_index,
            })
        
        logger.info(f"[tree.get] Returning {len(curriculum)} nodes for user_id={user_id}")
        
        return {
            "user_id": user_id,
            "curriculum": curriculum
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[tree.get] Error fetching tree snapshot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch tree snapshot: {str(e)}")
