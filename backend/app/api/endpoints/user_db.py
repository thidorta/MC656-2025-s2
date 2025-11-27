from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import require_user
from app.db.user_store import get_user_snapshot

router = APIRouter()


@router.get("/me")
async def get_user_db(user=Depends(require_user)):
    uid, payload = user
    snapshot, updated_at = get_user_snapshot(uid)
    return {
        "planner_id": payload.get("planner_id"),
        "user_db": snapshot,
        "count": 1 if snapshot else 0,
        "last_updated": updated_at,
    }
