"""
AttendanceRepository: Data access layer for attendance tracking.

Handles user's manual attendance overrides per course.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models_planner import AttendanceOverrideModel


def _utcnow_iso() -> str:
    """Returns current UTC time in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


class AttendanceRepository:
    """Repository for managing attendance overrides."""
    
    @staticmethod
    def list_overrides(session: Session, user_id: int) -> List[AttendanceOverrideModel]:
        """
        Get all attendance overrides for a user.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            
        Returns:
            List of AttendanceOverrideModel
        """
        return (
            session.query(AttendanceOverrideModel)
            .filter_by(user_id=user_id)
            .order_by(AttendanceOverrideModel.codigo.asc())
            .all()
        )
    
    @staticmethod
    def get_overrides_map(session: Session, user_id: int) -> Dict[str, Dict[str, Any]]:
        """
        Get attendance overrides as a map of codigo -> override data.
        
        This is the format used in the /attendance API response.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            
        Returns:
            Dict like {"MC102": {"presencas": 10, "total_aulas": 30}, ...}
        """
        overrides = AttendanceRepository.list_overrides(session, user_id)
        return {override.codigo: override.to_override_dict() for override in overrides}
    
    @staticmethod
    def upsert_overrides(
        session: Session,
        user_id: int,
        overrides_dict: Dict[str, Dict[str, Any]],
    ) -> None:
        """
        Insert or update multiple attendance overrides.
        
        This performs full replacement - courses not in the dict are deleted.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            overrides_dict: Dict like:
                {
                    "MC102": {"presencas": 10, "total_aulas": 30},
                    "MA111": {"presencas": 8, "total_aulas": 30, "notas": 7.5}
                }
        """
        now = _utcnow_iso()
        
        # Delete overrides not in new dict
        new_codes = set(overrides_dict.keys())
        if new_codes:
            (
                session.query(AttendanceOverrideModel)
                .filter(
                    AttendanceOverrideModel.user_id == user_id,
                    AttendanceOverrideModel.codigo.notin_(new_codes),
                )
                .delete(synchronize_session=False)
            )
        else:
            # Delete all if dict is empty
            session.query(AttendanceOverrideModel).filter_by(user_id=user_id).delete()
        
        # Upsert each override
        for codigo, override_data in overrides_dict.items():
            existing = (
                session.query(AttendanceOverrideModel)
                .filter_by(user_id=user_id, codigo=codigo)
                .first()
            )
            
            presencas = override_data.get("presencas", 0)
            total_aulas = override_data.get("total_aulas", 0)
            notas = override_data.get("notas")
            faltas_justificadas = override_data.get("faltas_justificadas")
            
            if existing:
                # Update existing
                existing.presencas = presencas
                existing.total_aulas = total_aulas
                existing.notas = notas
                existing.faltas_justificadas = faltas_justificadas
                existing.updated_at = now
            else:
                # Insert new
                new_override = AttendanceOverrideModel(
                    user_id=user_id,
                    codigo=codigo,
                    presencas=presencas,
                    total_aulas=total_aulas,
                    notas=notas,
                    faltas_justificadas=faltas_justificadas,
                    updated_at=now,
                )
                session.add(new_override)
        
        session.commit()
    
    @staticmethod
    def upsert_override(
        session: Session,
        user_id: int,
        codigo: str,
        presencas: int = 0,
        total_aulas: int = 0,
        notas: Optional[float] = None,
        faltas_justificadas: Optional[int] = None,
    ) -> AttendanceOverrideModel:
        """
        Insert or update a single attendance override.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            codigo: Course code
            presencas: Number of classes attended
            total_aulas: Total number of classes
            notas: Optional grade
            faltas_justificadas: Optional excused absences
            
        Returns:
            AttendanceOverrideModel (created or updated)
        """
        now = _utcnow_iso()
        
        existing = (
            session.query(AttendanceOverrideModel)
            .filter_by(user_id=user_id, codigo=codigo)
            .first()
        )
        
        if existing:
            existing.presencas = presencas
            existing.total_aulas = total_aulas
            existing.notas = notas
            existing.faltas_justificadas = faltas_justificadas
            existing.updated_at = now
            session.commit()
            return existing
        else:
            new_override = AttendanceOverrideModel(
                user_id=user_id,
                codigo=codigo,
                presencas=presencas,
                total_aulas=total_aulas,
                notas=notas,
                faltas_justificadas=faltas_justificadas,
                updated_at=now,
            )
            session.add(new_override)
            session.commit()
            return new_override
    
    @staticmethod
    def delete_override(session: Session, user_id: int, codigo: str) -> bool:
        """
        Delete an attendance override.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            codigo: Course code
            
        Returns:
            True if deleted, False if not found
        """
        deleted = (
            session.query(AttendanceOverrideModel)
            .filter_by(user_id=user_id, codigo=codigo)
            .delete()
        )
        session.commit()
        return deleted > 0
