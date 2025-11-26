from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.services.session_store import get_session_store

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


class PlannerPayload(BaseModel):
    payload: Dict[str, Any]
    semester: Optional[str] = None


def _require_session(credentials: HTTPAuthorizationCredentials | None):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente ou invalido")
    store = get_session_store()
    return store.get(credentials.credentials)


@router.get("/")
def get_planner(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    session = _require_session(credentials)
    return session.serialize_planner()


@router.post("/refresh")
def refresh_planner(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    # Sem credenciais do GDE armazenadas, o refresh exige novo login.
    _require_session(credentials)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Refaça o login para atualizar o planner (credenciais não são armazenadas).",
    )


@router.put("/modified")
def save_modified_planner(payload: PlannerPayload, credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    session = _require_session(credentials)
    store = get_session_store()
    store.update_modified(credentials.credentials, payload.payload)
    return session.serialize_planner()
