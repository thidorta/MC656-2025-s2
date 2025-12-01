from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models_planner import UserOAuthTokenModel


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class OAuthTokenRepository:
    """CRUD helpers for persisted OAuth tokens."""

    @staticmethod
    def get_token(session: Session, user_id: int, provider: str = "google") -> Optional[UserOAuthTokenModel]:
        return (
            session.query(UserOAuthTokenModel)
            .filter(UserOAuthTokenModel.user_id == user_id, UserOAuthTokenModel.provider == provider)
            .one_or_none()
        )

    @staticmethod
    def upsert_token(
        session: Session,
        *,
        user_id: int,
        provider: str,
        access_token: str,
        refresh_token: Optional[str],
        token_type: Optional[str],
        scope: Optional[str],
        expires_at: Optional[str],
        account_email: Optional[str] = None,
    ) -> UserOAuthTokenModel:
        token = OAuthTokenRepository.get_token(session, user_id, provider)
        now_iso = _utcnow_iso()
        if token:
            token.access_token = access_token
            token.token_type = token_type
            token.scope = scope
            token.expires_at = expires_at
            token.updated_at = now_iso
            if refresh_token:
                token.refresh_token = refresh_token
            if account_email:
                token.account_email = account_email
        else:
            token = UserOAuthTokenModel(
                user_id=user_id,
                provider=provider,
                access_token=access_token,
                refresh_token=refresh_token,
                token_type=token_type,
                scope=scope,
                expires_at=expires_at,
                account_email=account_email,
                created_at=now_iso,
                updated_at=now_iso,
            )
            session.add(token)
        session.commit()
        return token

    @staticmethod
    def delete_token(session: Session, user_id: int, provider: str = "google") -> None:
        (
            session.query(UserOAuthTokenModel)
            .filter(UserOAuthTokenModel.user_id == user_id, UserOAuthTokenModel.provider == provider)
            .delete()
        )
        session.commit()
