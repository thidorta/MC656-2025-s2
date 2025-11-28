"""
PlannerRepository: Data access layer for user's planned courses.

Handles the mutable planner state - which courses users have selected.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models_planner import PlannedCourseModel


def _utcnow_iso() -> str:
    """Returns current UTC time in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


class PlannerRepository:
    """Repository for managing user's planned courses."""
    
    @staticmethod
    def list_planned_courses(session: Session, user_id: int) -> List[PlannedCourseModel]:
        """
        Get all planned courses for a user.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            
        Returns:
            List of PlannedCourseModel
        """
        return (
            session.query(PlannedCourseModel)
            .filter_by(user_id=user_id)
            .order_by(PlannedCourseModel.codigo.asc())
            .all()
        )
    
    @staticmethod
    def get_planned_courses_map(session: Session, user_id: int) -> Dict[str, str]:
        """
        Get planned courses as a map of codigo -> turma.
        
        This is the format used in the /planner API response.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            
        Returns:
            Dict like {"MC102": "A", "MA111": "B"}
        """
        planned = PlannerRepository.list_planned_courses(session, user_id)
        return {pc.codigo: (pc.turma or "") for pc in planned}
    
    @staticmethod
    def replace_planned_courses(
        session: Session,
        user_id: int,
        planned_entries: List[Dict[str, Any]],
    ) -> None:
        """
        Replace all planned courses for a user.
        
        This performs a full replacement:
        1. Delete courses not in new list
        2. Upsert courses in new list
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            planned_entries: List of dicts with keys:
                - codigo (required)
                - turma (optional)
                - source (default: "USER")
                - added_by_user (default: 1)
                - semester_planned (optional)
        """
        now = _utcnow_iso()
        
        # Extract codes from new entries
        new_codes = {entry["codigo"] for entry in planned_entries}
        
        # Delete courses not in new list
        if new_codes:
            (
                session.query(PlannedCourseModel)
                .filter(
                    PlannedCourseModel.user_id == user_id,
                    PlannedCourseModel.codigo.notin_(new_codes),
                )
                .delete(synchronize_session=False)
            )
        else:
            # Delete all if new list is empty
            session.query(PlannedCourseModel).filter_by(user_id=user_id).delete()
        
        # Upsert new entries
        for entry in planned_entries:
            existing = (
                session.query(PlannedCourseModel)
                .filter_by(user_id=user_id, codigo=entry["codigo"])
                .first()
            )
            
            if existing:
                # Update existing
                existing.turma = entry.get("turma")
                existing.source = entry.get("source", "USER")
                existing.added_by_user = entry.get("added_by_user", 1)
                existing.semester_planned = entry.get("semester_planned")
                existing.updated_at = now
            else:
                # Insert new
                new_planned = PlannedCourseModel(
                    user_id=user_id,
                    codigo=entry["codigo"],
                    turma=entry.get("turma"),
                    source=entry.get("source", "USER"),
                    added_by_user=entry.get("added_by_user", 1),
                    semester_planned=entry.get("semester_planned"),
                    created_at=now,
                    updated_at=now,
                )
                session.add(new_planned)
        
        session.commit()
    
    @staticmethod
    def upsert_planned_course(
        session: Session,
        user_id: int,
        codigo: str,
        turma: Optional[str] = None,
        source: str = "USER",
        added_by_user: bool = True,
        semester_planned: Optional[str] = None,
    ) -> PlannedCourseModel:
        """
        Insert or update a single planned course.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            codigo: Course code
            turma: Selected section
            source: "GDE" or "USER"
            added_by_user: Whether user explicitly added this
            semester_planned: Planned semester
            
        Returns:
            PlannedCourseModel (created or updated)
        """
        now = _utcnow_iso()
        
        existing = (
            session.query(PlannedCourseModel)
            .filter_by(user_id=user_id, codigo=codigo)
            .first()
        )
        
        if existing:
            existing.turma = turma
            existing.source = source
            existing.added_by_user = 1 if added_by_user else 0
            existing.semester_planned = semester_planned
            existing.updated_at = now
            session.commit()
            return existing
        else:
            new_planned = PlannedCourseModel(
                user_id=user_id,
                codigo=codigo,
                turma=turma,
                source=source,
                added_by_user=1 if added_by_user else 0,
                semester_planned=semester_planned,
                created_at=now,
                updated_at=now,
            )
            session.add(new_planned)
            session.commit()
            return new_planned
    
    @staticmethod
    def delete_planned_course(session: Session, user_id: int, codigo: str) -> bool:
        """
        Delete a planned course.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            codigo: Course code
            
        Returns:
            True if deleted, False if not found
        """
        deleted = (
            session.query(PlannedCourseModel)
            .filter_by(user_id=user_id, codigo=codigo)
            .delete()
        )
        session.commit()
        return deleted > 0
