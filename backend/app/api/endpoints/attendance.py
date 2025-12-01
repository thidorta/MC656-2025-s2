from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_user, get_db
from app.services import planner_service

router = APIRouter()


@router.get("/", summary="Obter overrides de frequencia do usuario atual")
async def get_overrides(user=Depends(require_user), db: Session = Depends(get_db)):
    """
    Get attendance overrides from relational table.
    
    PHASE 3 REFACTOR: Reads from attendance_overrides table,
    no longer from attendance_overrides.overrides_json blob.
    """
    uid, payload = user
    
    # Get overrides from relational repository
    data = planner_service.get_attendance_overrides(db, uid)
    
    return {
        "planner_id": payload.get("planner_id"),
        **data,
    }


@router.put("/", summary="Salvar overrides de frequencia do usuario atual")
async def save_overrides_endpoint(
    payload: Dict[str, Any],
    user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Save attendance overrides to relational table.
    
    PHASE 3 REFACTOR: Writes to attendance_overrides table rows,
    no longer persists as JSON blob.
    """
    uid, jwt_payload = user
    
    overrides = payload.get("overrides")
    if overrides is None or not isinstance(overrides, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campo 'overrides' obrigatorio"
        )
    
    # Save via relational repository
    planner_service.save_attendance_overrides(db, int(uid), overrides)
    
    return {
        "status": "ok",
        "planner_id": jwt_payload.get("planner_id"),
    }
