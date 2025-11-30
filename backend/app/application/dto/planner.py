from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel, Field


class PlannerStateRequest(BaseModel):
    """Input contract for retrieving planner state."""

    user_id: int = Field(..., ge=1)
    planner_id: str = Field(..., min_length=1)


class PlannerStateResponse(BaseModel):
    """Normalized representation returned by the Planner API."""

    planner_id: str
    original_payload: Dict[str, Any]
    modified_payload: Dict[str, Any]
    current_payload: Dict[str, Any]
    planned_courses: Dict[str, str]

    @classmethod
    def from_service_payload(cls, payload: Dict[str, Any]) -> "PlannerStateResponse":
        """Factory to transform legacy dict responses into the canonical DTO."""
        return cls(**payload)
