from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config.settings import Settings, get_settings
from app.services.planner_store import PlannerStore

router = APIRouter()


class PlannerPayload(BaseModel):
    payload: Dict[str, Any]
    semester: Optional[str] = None


def _get_store(settings: Settings = Depends(get_settings)) -> PlannerStore:
    return PlannerStore(settings)


@router.get("/{planner_id}")
def get_planner(planner_id: str, store: PlannerStore = Depends(_get_store)):
    record = store.load(planner_id)
    store.close()
    if record["original"] is None:
        raise HTTPException(status_code=404, detail="Planner not found")
    return record


@router.post("/{planner_id}/refresh")
def refresh_planner(planner_id: str, store: PlannerStore = Depends(_get_store)):
    record = store.refresh_from_user_db(planner_id)
    store.close()
    return record


@router.put("/{planner_id}/modified")
def save_modified_planner(planner_id: str, payload: PlannerPayload, store: PlannerStore = Depends(_get_store)):
    record = store.save_modified(planner_id, payload.payload, semester=payload.semester)
    store.close()
    return record
