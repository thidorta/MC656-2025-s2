from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_access_payload
from app.services import google_integration

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


class GoogleExchangeRequest(BaseModel):
    code: str
    code_verifier: str
    redirect_uri: str


class GoogleStatusResponse(BaseModel):
    connected: bool
    email: str | None = None
    scope: str | None = None
    expires_at: str | None = None


@router.get("/status", response_model=GoogleStatusResponse)
def get_status(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user_id = _require_user_id(credentials)
    return google_integration.get_connection_status(db, user_id)


@router.post("/oauth/exchange", response_model=GoogleStatusResponse)
def exchange_code(
    payload: GoogleExchangeRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user_id = _require_user_id(credentials)
    try:
        return google_integration.exchange_authorization_code(
            session=db,
            user_id=user_id,
            code=payload.code,
            code_verifier=payload.code_verifier,
            redirect_uri=payload.redirect_uri,
        )
    except google_integration.GoogleIntegrationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/oauth/token")
def disconnect(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user_id = _require_user_id(credentials)
    google_integration.disconnect_google_account(db, user_id)
    return {"status": "ok"}


def _require_user_id(credentials: HTTPAuthorizationCredentials | None) -> int:
    payload = require_access_payload(credentials)
    user_id = payload.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id")
    return int(user_id)
