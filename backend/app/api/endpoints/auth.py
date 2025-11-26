from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.services.gde_snapshot import fetch_user_db_with_credentials
from app.services.session_store import get_session_store

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    planner_id: str
    user: dict | None = None
    course: dict | None = None
    year: int | None = None
    user_db: dict | None = None


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    if not payload.username or not payload.password:
        raise HTTPException(status_code=400, detail="Credenciais obrigatorias")

    planner_id, user_db, _ = fetch_user_db_with_credentials(payload.username, payload.password)
    store = get_session_store()
    session = store.create_session(planner_id=planner_id, user_db=user_db, original_payload=user_db)

    return LoginResponse(
        access_token=session.token,
        planner_id=planner_id,
        user=user_db.get("user") if isinstance(user_db, dict) else None,
        course=user_db.get("course") if isinstance(user_db, dict) else None,
        year=user_db.get("year") if isinstance(user_db, dict) else None,
        user_db=user_db,
    )


def _ensure_token(credentials: HTTPAuthorizationCredentials | None) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente ou invalido")
    return credentials.credentials


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials | None = bearer_scheme):
    _ensure_token(credentials)
    return {"status": "ok", "message": "Sessao encerrada. Descarte o token localmente."}
