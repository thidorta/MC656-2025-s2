from __future__ import annotations

import logging
from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.application.dto.planner import PlannerStateRequest
from app.domain.use_cases.planner.get_planner_state import GetPlannerStateUseCase
from app.services import planner_service, google_integration

router = APIRouter()
logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


class PlannerPayload(BaseModel):
    payload: Dict[str, Any]
    semester: Optional[str] = None


class PlannerExportRequest(BaseModel):
    start_date: date
    end_date: date
    timezone: Optional[str] = None
    calendar_name: Optional[str] = None


class PlannerExportResponse(BaseModel):
    calendar_name: str
    filename: str
    ics_content: str
    timezone: str
    starts_on: date
    ends_on: date
    event_templates: list[dict[str, Any]]
    event_count: int
    generated_at: str


class PlannerGoogleExportRequest(PlannerExportRequest):
    calendar_id: Optional[str] = None


class PlannerGoogleExportResponse(BaseModel):
    calendar_id: str
    calendar_name: str
    event_count: int
    connected_email: Optional[str] = None
    synced_at: str


@router.get("/")
def get_planner(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    Get planner state (original/modified/current payloads + planned_courses).
    
    PHASE 3 REFACTOR: Computes payloads from relational tables,
    no longer reads from planner JSON blobs.
    """
    # Get user from token (skip session_store for now)
    from app.api.deps import require_access_payload
    jwt_payload = require_access_payload(credentials)
    user_id = jwt_payload.get("uid")
    planner_id = jwt_payload.get("planner_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id")
    if not planner_id:
        raise HTTPException(status_code=400, detail="Token sem planner_id")

    request_dto = PlannerStateRequest(user_id=user_id, planner_id=planner_id)
    use_case = GetPlannerStateUseCase(planner_state_builder=planner_service.build_planner_response)
    response = use_case.execute(session=db, request=request_dto)

    return response.model_dump()


@router.post("/export", response_model=PlannerExportResponse)
def export_planner_calendar(
    payload: PlannerExportRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    from app.api.deps import require_access_payload

    jwt_payload = require_access_payload(credentials)
    user_id = jwt_payload.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id")

    try:
        export = planner_service.generate_planner_export(
            session=db,
            user_id=user_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            timezone_name=payload.timezone,
            calendar_name=payload.calendar_name,
        )
    except planner_service.PlannerExportError as exc:
        logger.warning(
            "[planner.export_ics] user=%s failed start=%s end=%s tz=%s error=%s",
            user_id,
            payload.start_date,
            payload.end_date,
            payload.timezone,
            exc,
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return export


@router.post("/export/google", response_model=PlannerGoogleExportResponse)
def export_planner_google_calendar(
    payload: PlannerGoogleExportRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    from app.api.deps import require_access_payload

    jwt_payload = require_access_payload(credentials)
    user_id = jwt_payload.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id")

    try:
        return google_integration.sync_planner_to_google_calendar(
            session=db,
            user_id=user_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            timezone_name=payload.timezone,
            calendar_name=payload.calendar_name,
            calendar_id=payload.calendar_id,
        )
    except google_integration.GoogleIntegrationError as exc:
        logger.warning(
            "[planner.google_export] user=%s failed start=%s end=%s tz=%s error=%s",
            user_id,
            payload.start_date,
            payload.end_date,
            payload.timezone,
            exc,
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/refresh")
def refresh_planner(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    """
    Refresh requires re-login (GDE credentials not stored).
    """
    from app.api.deps import require_access_payload
    require_access_payload(credentials)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Refaca o login para atualizar o planner (credenciais nao sao armazenadas).",
    )


@router.put("/modified")
def save_modified_planner(
    payload: PlannerPayload,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    Save modified planner state (planned course selections).
    
    PHASE 3 REFACTOR: Persists to planned_courses table,
    no longer writes planner JSON blobs.
    """
    from app.api.deps import require_access_payload
    jwt_payload = require_access_payload(credentials)
    user_id = jwt_payload.get("uid")
    planner_id = jwt_payload.get("planner_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id")
    if not planner_id:
        raise HTTPException(status_code=400, detail="Token sem planner_id")

    # Update planned courses via repository
    planner_service.update_planned_courses(
        session=db,
        user_id=user_id,
        planned_payload=payload.payload,
    )

    # Return fresh planner view through the new use case
    request_dto = PlannerStateRequest(user_id=user_id, planner_id=planner_id)
    use_case = GetPlannerStateUseCase(planner_state_builder=planner_service.build_planner_response)
    response = use_case.execute(session=db, request=request_dto)

    return response.model_dump()
