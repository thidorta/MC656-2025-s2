from __future__ import annotations

import secrets
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

from fastapi import HTTPException, status


@dataclass
class SessionData:
    token: str
    created_at: datetime
    expires_at: datetime
    planner_id: str
    user_id: int
    user_db: Dict[str, Any]
    original_payload: Dict[str, Any]
    modified_payload: Dict[str, Any] = field(default_factory=dict)

    def is_expired(self) -> bool:
        return datetime.now(tz=timezone.utc) >= self.expires_at

    def serialize_planner(self) -> Dict[str, Any]:
        return {
            "planner_id": self.planner_id,
            "original": {
                "planner_id": self.planner_id,
                "semester": self._extract_semester(self.original_payload),
                "payload": self.original_payload,
                "updated_at": self.created_at.isoformat(),
            },
            "modified": {
                "planner_id": self.planner_id,
                "semester": self._extract_semester(self.modified_payload) if self.modified_payload else None,
                "payload": self.modified_payload or self.original_payload,
                "updated_at": self.created_at.isoformat(),
            },
        }

    @staticmethod
    def _extract_semester(payload: Dict[str, Any] | None) -> str:
        if not payload:
            return ""
        for path in (("current_period",), ("Planejado", "periodo"), ("parameters", "periodo")):
            ref: Any = payload
            for key in path:
                ref = ref.get(key) if isinstance(ref, dict) else None
                if ref is None:
                    break
            if ref:
                return str(ref)
        return ""


class SessionStore:
    def __init__(self, ttl_minutes: int = 120) -> None:
        self._sessions: Dict[str, SessionData] = {}
        self._lock = threading.Lock()
        self.ttl = ttl_minutes

    def create_session(
        self,
        *,
        planner_id: str,
        user_id: int,
        user_db: Dict[str, Any],
        original_payload: Dict[str, Any],
    ) -> SessionData:
        token = secrets.token_urlsafe(32)
        now = datetime.now(tz=timezone.utc)
        data = SessionData(
            token=token,
            created_at=now,
            expires_at=now + timedelta(minutes=self.ttl),
            planner_id=str(planner_id),
            user_id=user_id,
            user_db=user_db,
            original_payload=original_payload,
            modified_payload=original_payload,
        )
        with self._lock:
            self._sessions[token] = data
        return data

    def get(self, token: str) -> SessionData:
        with self._lock:
            data = self._sessions.get(token)
        if not data or data.is_expired():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sessao nao encontrada ou expirada. Faca login novamente.",
            )
        return data

    def update_modified(self, token: str, payload: Dict[str, Any]) -> SessionData:
        data = self.get(token)
        with self._lock:
            data.modified_payload = payload
        return data

    def cleanup(self):
        now = datetime.now(tz=timezone.utc)
        with self._lock:
            for sid in list(self._sessions.keys()):
                if self._sessions[sid].expires_at <= now:
                    del self._sessions[sid]


_store = SessionStore()


def get_session_store() -> SessionStore:
    return _store
