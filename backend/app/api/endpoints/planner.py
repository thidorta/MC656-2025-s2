from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import require_session, require_user, get_db
from app.services import planner_service

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


class PlannerPayload(BaseModel):
    payload: Dict[str, Any]
    semester: Optional[str] = None


@router.get("/")
def get_planner(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    Get planner state (original/modified/current payloads + planned_courses).
    
    PHASE 3 REFACTOR: Computes payloads from relational tables,
    no longer reads from planner JSON blobs.
    """
    # Get user from token (skip session_store for now)
    from app.api.deps import require_access_payload
    jwt_payload = require_access_payload(credentials)
    user_id = jwt_payload.get("uid")
    planner_id = jwt_payload.get("planner_id", "")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id")
    
    # Build planner response from relational state
    response = planner_service.build_planner_response(
        session=db,
        user_id=user_id,
        planner_id=planner_id,
    )
    
    return response


@router.post("/refresh")
def refresh_planner(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    """
    Refresh requires re-login (GDE credentials not stored).
    """
    from app.api.deps import require_access_payload
    require_access_payload(credentials)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Refaca o login para atualizar o planner (credenciais nao sao armazenadas).",
    )


@router.put("/modified")
def save_modified_planner(
    payload: PlannerPayload,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    Save modified planner state (planned course selections).
    
    PHASE 3 REFACTOR: Persists to planned_courses table,
    no longer writes planner JSON blobs.
    """
    from app.api.deps import require_access_payload
    jwt_payload = require_access_payload(credentials)
    user_id = jwt_payload.get("uid")
    planner_id = jwt_payload.get("planner_id", "")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id")
    
    # Update planned courses via repository
    planner_service.update_planned_courses(
        session=db,
        user_id=user_id,
        planned_payload=payload.payload,
    )
    
    # Return fresh planner view
    response = planner_service.build_planner_response(
        session=db,
        user_id=user_id,
        planner_id=planner_id,
    )
    
    return response
