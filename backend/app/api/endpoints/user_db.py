from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.session_store import get_session_store

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


def _require_session(credentials: HTTPAuthorizationCredentials | None):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente ou invalido")
    store = get_session_store()
    return store.get(credentials.credentials)


@router.get("/me")
async def get_user_db(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    session = _require_session(credentials)
    return {
        "planner_id": session.planner_id,
        "user_db": session.user_db,
        "count": 1 if session.user_db else 0,
        "last_updated": session.created_at.isoformat(),
    }
