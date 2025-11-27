from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.user_store import load_attendance_overrides, save_attendance_overrides
from app.api.deps import require_user

router = APIRouter()


@router.get("/", summary="Obter overrides de frequencia do usuario atual")
async def get_overrides(user=Depends(require_user)):
    uid, payload = user
    overrides = load_attendance_overrides(uid)
    return {"planner_id": payload.get("planner_id"), "overrides": overrides}


@router.put("/", summary="Salvar overrides de frequencia do usuario atual")
async def save_overrides_endpoint(
    payload: Dict[str, Any],
    user=Depends(require_user),
):
    uid, jwt_payload = user
    overrides = payload.get("overrides")
    if overrides is None or not isinstance(overrides, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campo 'overrides' obrigatorio")
    save_attendance_overrides(int(uid), overrides)
    return {"status": "ok", "planner_id": jwt_payload.get("planner_id")}
