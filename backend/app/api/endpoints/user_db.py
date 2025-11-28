from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_user, get_db
from app.services import planner_service

router = APIRouter()


@router.get("/me")
async def get_user_db(user=Depends(require_user), db: Session = Depends(get_db)):
    """
    Get user's latest GDE snapshot from relational tables.
    
    PHASE 3 REFACTOR: Reads from gde_snapshots + curriculum tables,
    no longer from users.user_db_json blob.
    """
    uid, payload = user
    
    # Build user_db from relational snapshot
    user_db = planner_service.build_user_db_from_snapshot(db, uid)
    
    if not user_db:
        # No snapshot yet (new user before first login)
        return {
            "planner_id": payload.get("planner_id"),
            "user_db": {},
            "count": 0,
            "last_updated": None,
        }
    
    # Get last_updated from snapshot
    snapshot_repo = planner_service.SnapshotRepository()
    snapshot = snapshot_repo.get_latest_snapshot(db, uid)
    last_updated = snapshot.created_at if snapshot else None
    
    return {
        "planner_id": payload.get("planner_id"),
        "user_db": user_db,
        "count": 1,
        "last_updated": last_updated,
    }
