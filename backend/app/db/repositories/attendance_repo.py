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


def _coerce_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(round(float(value)))
    except (TypeError, ValueError):
        return default


def _coerce_optional_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


def _coerce_optional_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_bool(value: Any, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y", "sim"}:
            return True
        if lowered in {"false", "0", "no", "n", "nao"}:
            return False
    return default


def _normalize_override_payload(raw: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(raw, dict):
        raw = {}
    absences_used = raw.get("absencesUsed", raw.get("absences_used"))
    if absences_used is not None:
        absences_used = _coerce_int(absences_used, 0)
    else:
        legacy_total = raw.get("total_aulas")
        legacy_present = raw.get("presencas")
        if legacy_total is not None and legacy_present is not None:
            absences_used = max(_coerce_int(legacy_total, 0) - _coerce_int(legacy_present, 0), 0)
        else:
            absences_used = 0

    requires_attendance = _coerce_bool(
        raw.get("requiresAttendance", raw.get("requires_attendance")),
        True,
    )
    alert_enabled = _coerce_bool(
        raw.get("alertEnabled", raw.get("alert_enabled")),
        True,
    )

    presencas = _coerce_int(raw.get("presencas"), 0)
    total_aulas = _coerce_int(raw.get("total_aulas"), 0)

    return {
        "presencas": presencas,
        "total_aulas": total_aulas,
        "notas": _coerce_optional_float(raw.get("notas")),
        "faltas_justificadas": _coerce_optional_int(raw.get("faltas_justificadas")),
        "absences_used": absences_used,
        "requires_attendance": 1 if requires_attendance else 0,
        "alert_enabled": 1 if alert_enabled else 0,
    }


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
            
            normalized = _normalize_override_payload(override_data or {})
            
            if existing:
                # Update existing
                existing.presencas = normalized["presencas"]
                existing.total_aulas = normalized["total_aulas"]
                existing.notas = normalized["notas"]
                existing.faltas_justificadas = normalized["faltas_justificadas"]
                existing.absences_used = normalized["absences_used"]
                existing.requires_attendance = normalized["requires_attendance"]
                existing.alert_enabled = normalized["alert_enabled"]
                existing.updated_at = now
            else:
                # Insert new
                new_override = AttendanceOverrideModel(
                    user_id=user_id,
                    codigo=codigo,
                    presencas=normalized["presencas"],
                    total_aulas=normalized["total_aulas"],
                    notas=normalized["notas"],
                    faltas_justificadas=normalized["faltas_justificadas"],
                    absences_used=normalized["absences_used"],
                    requires_attendance=normalized["requires_attendance"],
                    alert_enabled=normalized["alert_enabled"],
                    updated_at=now,
                )
                session.add(new_override)
        
        session.commit()

    @staticmethod
    def sync_with_planned_codes(
        session: Session,
        user_id: int,
        planned_codes: List[str],
    ) -> None:
        """Ensure attendance overrides exist only for the provided planned course codes.

        This helper keeps attendance data in sync with planner selections by:
        1) Removing overrides for courses that are no longer planned.
        2) Creating empty override rows (0 presences / 0 total) for newly planned codes
           so that the Attendance UI always has a record per planned course.

        Note: This function does NOT commit; callers should commit the transaction.
        """

        normalized_codes = {str(code).strip() for code in planned_codes if str(code).strip()}

        base_query = session.query(AttendanceOverrideModel).filter_by(user_id=user_id)

        if not normalized_codes:
            base_query.delete(synchronize_session=False)
            return

        # Remove overrides for courses no longer planned
        (
            base_query.filter(AttendanceOverrideModel.codigo.notin_(tuple(normalized_codes)))
            .delete(synchronize_session=False)
        )

        # Determine which planned codes still need a row
        existing_codes = {
            row[0]
            for row in (
                session.query(AttendanceOverrideModel.codigo)
                .filter(
                    AttendanceOverrideModel.user_id == user_id,
                    AttendanceOverrideModel.codigo.in_(tuple(normalized_codes)),
                )
                .all()
            )
        }

        missing_codes = normalized_codes - existing_codes
        if not missing_codes:
            return

        timestamp = _utcnow_iso()
        for codigo in missing_codes:
            session.add(
                AttendanceOverrideModel(
                    user_id=user_id,
                    codigo=codigo,
                    presencas=0,
                    total_aulas=0,
                    absences_used=0,
                    requires_attendance=1,
                    alert_enabled=1,
                    notas=None,
                    faltas_justificadas=None,
                    updated_at=timestamp,
                )
            )
    
    @staticmethod
    def upsert_override(
        session: Session,
        user_id: int,
        codigo: str,
        presencas: int = 0,
        total_aulas: int = 0,
        notas: Optional[float] = None,
        faltas_justificadas: Optional[int] = None,
        *,
        absences_used: Optional[int] = None,
        requires_attendance: Optional[bool] = None,
        alert_enabled: Optional[bool] = None,
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
        
        normalized = _normalize_override_payload(
            {
                "presencas": presencas,
                "total_aulas": total_aulas,
                "notas": notas,
                "faltas_justificadas": faltas_justificadas,
                "absencesUsed": absences_used,
                "requiresAttendance": requires_attendance,
                "alertEnabled": alert_enabled,
            }
        )

        existing = (
            session.query(AttendanceOverrideModel)
            .filter_by(user_id=user_id, codigo=codigo)
            .first()
        )
        
        if existing:
            existing.presencas = normalized["presencas"]
            existing.total_aulas = normalized["total_aulas"]
            existing.notas = normalized["notas"]
            existing.faltas_justificadas = normalized["faltas_justificadas"]
            existing.absences_used = normalized["absences_used"]
            existing.requires_attendance = normalized["requires_attendance"]
            existing.alert_enabled = normalized["alert_enabled"]
            existing.updated_at = now
            session.commit()
            return existing
        else:
            new_override = AttendanceOverrideModel(
                user_id=user_id,
                codigo=codigo,
                presencas=normalized["presencas"],
                total_aulas=normalized["total_aulas"],
                notas=normalized["notas"],
                faltas_justificadas=normalized["faltas_justificadas"],
                absences_used=normalized["absences_used"],
                requires_attendance=normalized["requires_attendance"],
                alert_enabled=normalized["alert_enabled"],
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
