from __future__ import annotations

import copy
import secrets
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

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
        planned_courses: Optional[Dict[str, str]] = None,
    ) -> SessionData:
        token = secrets.token_urlsafe(32)
        now = datetime.now(tz=timezone.utc)
        sanitized_original = copy.deepcopy(original_payload)
        modified = self._apply_planned_selection(
            copy.deepcopy(original_payload),
            planned_courses or {},
        )
        data = SessionData(
            token=token,
            created_at=now,
            expires_at=now + timedelta(minutes=self.ttl),
            planner_id=str(planner_id),
            user_id=user_id,
            user_db=user_db,
            original_payload=sanitized_original,
            modified_payload=modified,
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

    @staticmethod
    def _apply_planned_selection(payload: Dict[str, Any], planned_map: Dict[str, str]) -> Dict[str, Any]:
        """Return a copy of payload with planned_codes/adicionado reflecting stored planner choices.

        If no choices exist, all planned flags are cleared so first login starts empty.
        """
        if not isinstance(payload, dict):
            return payload

        curriculum = payload.get("curriculum")
        if not isinstance(curriculum, list):
            payload["planned_codes"] = []
            return payload

        normalized = {str(code).replace(" ", "").upper(): turma for code, turma in (planned_map or {}).items()}
        planned_codes: list[str] = []
        for course in curriculum:
            if not isinstance(course, dict):
                continue
            code_display = str(course.get("codigo") or course.get("sigla") or "").strip()
            code_key = code_display.replace(" ", "").upper()
            offers = course.get("offers") if isinstance(course.get("offers"), list) else []
            selected_turma = normalized.get(code_key)
            planned_here = False
            if selected_turma is not None:
                planned_codes.append(code_display)
                for offer in offers:
                    if not isinstance(offer, dict):
                        continue
                    turma = str(offer.get("turma") or "").strip()
                    offer["adicionado"] = turma == selected_turma if turma else False
                    planned_here = planned_here or offer["adicionado"]
                if not planned_here and offers:
                    offers[0]["adicionado"] = True
                    planned_here = True
            else:
                # clear any stale flags
                for offer in offers:
                    if isinstance(offer, dict) and "adicionado" in offer:
                        offer["adicionado"] = False

        payload["planned_codes"] = planned_codes
        return payload

    def cleanup(self):
        now = datetime.now(tz=timezone.utc)
        with self._lock:
            for sid in list(self._sessions.keys()):
                if self._sessions[sid].expires_at <= now:
                    del self._sessions[sid]


_store = SessionStore()


def get_session_store() -> SessionStore:
    return _store
