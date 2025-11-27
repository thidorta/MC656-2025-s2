from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.api.deps import require_session
from app.db.user_store import save_planned_courses

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


class PlannerPayload(BaseModel):
    payload: Dict[str, Any]
    semester: Optional[str] = None


def _normalize_code_key(value: Any) -> str:
    text = str(value or "").strip()
    return "".join(text.split()).upper()


def _normalize_code_display(value: Any) -> str:
    return str(value or "").strip()


def _extract_planned_courses(payload: Dict[str, Any]) -> Dict[str, str]:
    planned_codes = payload.get("planned_codes")
    planned_map: Dict[str, Dict[str, str]] = {}
    if isinstance(planned_codes, list):
        for code in planned_codes:
            display = _normalize_code_display(code)
            if not display:
                continue
            key = _normalize_code_key(display)
            planned_map[key] = {"display": display, "turma": ""}

    curriculum = payload.get("curriculum")
    if isinstance(curriculum, list):
        for course in curriculum:
            if not isinstance(course, dict):
                continue
            code_value = course.get("codigo") or course.get("sigla")
            display = _normalize_code_display(code_value)
            if not display:
                continue
            key = _normalize_code_key(display)
            offers = course.get("offers")
            selected_turma = ""
            if isinstance(offers, list):
                for offer in offers:
                    if not isinstance(offer, dict):
                        continue
                    if offer.get("adicionado"):
                        selected_turma = _normalize_code_display(offer.get("turma"))
                        break
                else:
                    for offer in offers:
                        if isinstance(offer, dict):
                            selected_turma = _normalize_code_display(offer.get("turma"))
                            break
            if key in planned_map:
                planned_map[key]["turma"] = selected_turma
            elif selected_turma or any(
                isinstance(offer, dict) and offer.get("adicionado") for offer in (offers or [])
            ):
                planned_map[key] = {"display": display, "turma": selected_turma}

    return {
        entry["display"]: entry["turma"]
        for entry in planned_map.values()
        if entry["display"]
    }


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
    save_planned_courses(session.user_id, _extract_planned_courses(payload.payload))
    return session.serialize_planner()
