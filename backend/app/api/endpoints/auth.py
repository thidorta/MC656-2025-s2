from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.services.gde_snapshot import fetch_user_db_with_credentials
from app.db.user_store import (
    get_user,
    get_user_by_id,
    create_user,
    update_user_password,
    update_user_planner,
    update_user_snapshot,
    load_planned_courses,
)
from app.services.session_store import get_session_store
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
    hash_password,
)
from app.api.deps import require_refresh_payload, require_access_payload

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    planner_id: str
    user: dict | None = None
    course: dict | None = None
    year: int | None = None
    user_db: dict | None = None


class RegisterRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _decode_jwt(credentials: HTTPAuthorizationCredentials | None) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente ou invalido")
    try:
        return decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado")


@router.post("/register")
async def register(payload: RegisterRequest):
    if not payload.username or not payload.password:
        raise HTTPException(status_code=400, detail="Credenciais obrigatorias")
    if get_user(payload.username):
        raise HTTPException(status_code=400, detail="Usuario ja existe")
    # opcional: planner_id atribuido no primeiro login GDE; aqui deixamos vazio
    create_user(payload.username, payload.password, planner_id="")
    return {"status": "ok"}


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    try:
        if not payload.username or not payload.password:
            raise HTTPException(status_code=400, detail="Credenciais obrigatorias")

        logger.info("[auth.login] user=%s starting login", payload.username)
        user_row = get_user(payload.username)
        if user_row:
            logger.info("[auth.login] user found id=%s planner=%s", user_row["id"], user_row["planner_id"])
            if not verify_password(payload.password, user_row["password_hash"]):
                logger.warning("[auth.login] invalid local password for user=%s", payload.username)
                raise HTTPException(status_code=401, detail="Credenciais invalidas")
        # valida credenciais no GDE e obtém dados
        planner_id, user_db, _ = fetch_user_db_with_credentials(payload.username, payload.password)
        logger.info("[auth.login] GDE ok planner_id=%s", planner_id)
        if not user_row:
            user_id = create_user(payload.username, payload.password, planner_id)
            user_row = get_user_by_id(user_id)
            logger.info("[auth.login] created user id=%s", user_id)
        else:
            if planner_id and user_row["planner_id"] != planner_id:
                update_user_planner(user_row["id"], planner_id)
                logger.info("[auth.login] updated planner_id for user id=%s -> %s", user_row["id"], planner_id)

        # atualiza snapshot persistente para uso em /user-db mesmo sem sessao em memoria
        update_user_snapshot(user_row["id"], user_db)

        store = get_session_store()
        planned_courses = load_planned_courses(int(user_row["id"]))
        session = store.create_session(
            planner_id=planner_id,
            user_id=user_row["id"],
            user_db=user_db,
            original_payload=user_db,
            planned_courses=planned_courses,
        )
        access_token = create_access_token({"uid": user_row["id"], "sub": str(user_row["id"]), "planner_id": planner_id, "sid": session.token})
        refresh_token = create_refresh_token({"uid": user_row["id"], "sub": str(user_row["id"]), "planner_id": planner_id, "sid": session.token})
        logger.info("[auth.login] success user id=%s sid=%s", user_row["id"], session.token)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            planner_id=planner_id,
            user=user_db.get("user") if isinstance(user_db, dict) else None,
            course=user_db.get("course") if isinstance(user_db, dict) else None,
            year=user_db.get("year") if isinstance(user_db, dict) else None,
            user_db=user_db,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("[auth.login] unexpected error user=%s", payload.username)
        raise HTTPException(status_code=500, detail=f"Erro interno no login: {exc}") from exc


@router.post("/refresh", response_model=dict)
async def refresh_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    payload = require_refresh_payload(credentials)
    user_id = payload.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token de refresh sem usuario")
    user_row = get_user_by_id(int(user_id))
    if not user_row:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")
    # opcional: valida sessao se sid estiver presente
    sid = payload.get("sid")
    if sid:
        try:
            get_session_store().get(sid)
        except HTTPException:
            raise HTTPException(status_code=401, detail="Sessao expirada. Refaca login.")
    access_token = create_access_token({
        "uid": int(user_id),
        "sub": str(user_id),
        "planner_id": payload.get("planner_id"),
        "sid": sid,
    })
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    jwt_payload = require_access_payload(credentials)
    user_id = jwt_payload.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id")
    user_row = get_user_by_id(int(user_id))
    if not user_row or not verify_password(payload.current_password, user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Senha atual incorreta")
    new_hash = hash_password(payload.new_password)
    update_user_password(user_id, new_hash)
    return {"status": "ok"}


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    _decode_jwt(credentials)
    return {"status": "ok", "message": "Sessao encerrada. Descarte o token localmente."}
