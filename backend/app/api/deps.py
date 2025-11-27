from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.session_store import get_session_store
from app.utils.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


def require_payload(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente ou invalido")
    try:
        return decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado")


def require_access_payload(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    payload = require_payload(credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de acesso requerido")
    return payload


def require_refresh_payload(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    payload = require_payload(credentials)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de refresh requerido")
    return payload


def require_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    payload = require_access_payload(credentials)
    uid = payload.get("uid")
    if uid is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sem user_id")
    return int(uid), payload


def require_session(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    uid, payload = require_user(credentials)
    sid = payload.get("sid")
    if not sid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sem sid")
    store = get_session_store()
    session = store.get(sid)
    if session.user_id != uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida para o usuario")
    return session, payload
