from __future__ import annotations

from typing import Any, Callable, Dict, Protocol

from sqlalchemy.orm import Session

from app.application.dto.planner import PlannerStateRequest, PlannerStateResponse


class PlannerStateBuilder(Protocol):
    """Boundary that knows how to assemble the planner payload from persistence."""

    def __call__(self, *, session: Session, user_id: int, planner_id: str) -> Dict[str, Any]:
        ...


class GetPlannerStateUseCase:
    """Use case responsible for returning the planner state for a given user."""

    def __init__(self, planner_state_builder: PlannerStateBuilder):
        self._planner_state_builder = planner_state_builder

    def execute(self, *, session: Session, request: PlannerStateRequest) -> PlannerStateResponse:
        payload = self._planner_state_builder(
            session=session,
            user_id=request.user_id,
            planner_id=request.planner_id,
        )
        return PlannerStateResponse.from_service_payload(payload)
