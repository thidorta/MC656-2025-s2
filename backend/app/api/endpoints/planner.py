from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.api.deps import require_session

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


class PlannerPayload(BaseModel):
    payload: Dict[str, Any]
    semester: Optional[str] = None


@router.get("/")
def get_planner(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    session, _ = require_session(credentials)
    return session.serialize_planner()


@router.post("/refresh")
def refresh_planner(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    # Sem credenciais do GDE armazenadas, o refresh exige novo login.
    require_session(credentials)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Refaca o login para atualizar o planner (credenciais nao sao armazenadas).",
    )


@router.put("/modified")
def save_modified_planner(payload: PlannerPayload, credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    session, _ = require_session(credentials)
    session.modified_payload = payload.payload
    return session.serialize_planner()
