"""
GET /tree endpoint - returns curriculum tree snapshot
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.session import get_db
from app.services.tree_service import TreeService
from app.utils.errors import AppError

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
        service = TreeService(db)
        payload = service.build_for_user(str(user_id))
        logger.info(f"[tree.get] Returning {len(payload.get('curriculum', []))} nodes for user_id={user_id}")
        return payload
    except AppError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[tree.get] Error fetching tree snapshot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch tree snapshot: {str(e)}")
