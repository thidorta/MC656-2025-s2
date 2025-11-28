"""
SnapshotRepository: Data access layer for GDE snapshots.

Handles creation and retrieval of immutable GDE academic state snapshots.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models_planner import (
    GdeSnapshotModel,
    CurriculumDisciplineModel,
    DisciplinePrerequisiteModel,
    CourseOfferModel,
    OfferScheduleEventModel,
)


def _utcnow_iso() -> str:
    """Returns current UTC time in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


class SnapshotRepository:
    """Repository for managing GDE snapshots and related curriculum data."""
    
    @staticmethod
    def get_latest_snapshot(session: Session, user_id: int) -> Optional[GdeSnapshotModel]:
        """
        Get the most recent snapshot for a user.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            
        Returns:
            Latest GdeSnapshotModel or None if no snapshots exist
        """
        return (
            session.query(GdeSnapshotModel)
            .filter_by(user_id=user_id)
            .order_by(GdeSnapshotModel.fetched_at.desc())
            .first()
        )
    
    @staticmethod
    def create_snapshot_from_gde(
        session: Session,
        user_id: int,
        planner_id: str,
        user_db_payload: Dict[str, Any],
        gde_payload: Optional[Dict[str, Any]] = None,
    ) -> GdeSnapshotModel:
        """
        Create a new immutable snapshot from GDE data.
        
        This creates:
        1. GdeSnapshotModel (metadata)
        2. CurriculumDisciplineModel rows (curriculum courses)
        3. DisciplinePrerequisiteModel rows (prerequisites)
        4. CourseOfferModel rows (available turmas)
        5. OfferScheduleEventModel rows (class schedules)
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            planner_id: GDE planner ID
            user_db_payload: Complete user_db dict from GDE
            
        Returns:
            Created GdeSnapshotModel
        """
        now = _utcnow_iso()
        
        # 1. Create snapshot metadata
        # NOTE: planejado_metadata is DEPRECATED and always set to empty.
        # Planning state comes ONLY from planned_courses table (user actions).
        snapshot = GdeSnapshotModel(
            user_id=user_id,
            planner_id=planner_id,
            fetched_at=now,
            raw_user_name=user_db_payload.get("user", {}).get("name"),
            raw_ra=user_db_payload.get("user", {}).get("ra"),
            raw_course_id=user_db_payload.get("course", {}).get("id"),
            raw_course_name=user_db_payload.get("course", {}).get("name"),
            catalog_year=user_db_payload.get("year"),
            current_period=user_db_payload.get("current_period"),
            cp_value=user_db_payload.get("cp"),
            integralizacao_metadata=json.dumps(user_db_payload.get("integralizacao_meta", {})),
            planejado_metadata="{}",  # DEPRECATED: Always empty. Planning comes from planned_courses table only.
            faltantes_metadata=json.dumps(user_db_payload.get("faltantes", {})),
            created_at=now,
        )
        session.add(snapshot)
        session.flush()  # Get snapshot.id
        
        # 2. Create curriculum disciplines
        curriculum = user_db_payload.get("curriculum", [])
        for disc_data in curriculum:
            discipline = CurriculumDisciplineModel(
                user_id=user_id,
                snapshot_id=snapshot.id,
                disciplina_id=disc_data.get("disciplina_id"),
                codigo=disc_data.get("codigo"),
                nome=disc_data.get("nome"),
                creditos=disc_data.get("creditos", 0),
                catalog_year=disc_data.get("catalogo"),
                tipo=disc_data.get("tipo") or "",  # Handle None values
                semestre_sugerido=disc_data.get("semestre"),
                cp_group=str(disc_data.get("cp_group")) if disc_data.get("cp_group") is not None else None,
                has_completed=1 if disc_data.get("tem") else 0,
                can_enroll=1 if disc_data.get("pode") else 0,
                obs=disc_data.get("obs"),
                color=disc_data.get("color"),
                created_at=now,
            )
            session.add(discipline)
            session.flush()  # Get discipline.id
            
            # 3. Create prerequisites
            prereqs = disc_data.get("prereqs", [])
            for group_idx, prereq_group in enumerate(prereqs):
                if isinstance(prereq_group, list):
                    for required_codigo in prereq_group:
                        prereq = DisciplinePrerequisiteModel(
                            curriculum_discipline_id=discipline.id,
                            required_codigo=required_codigo,
                            alternative_group=group_idx,
                        )
                        session.add(prereq)
            
            # 4. Create offers
            offers = disc_data.get("offers", [])
            for offer_data in offers:
                offer = CourseOfferModel(
                    curriculum_discipline_id=discipline.id,
                    user_id=user_id,
                    snapshot_id=snapshot.id,
                    codigo=discipline.codigo,
                    turma=offer_data.get("turma", ""),
                    offer_external_id=str(offer_data.get("id")) if offer_data.get("id") is not None else None,
                    semester=user_db_payload.get("current_period"),
                    source="gde_snapshot",
                    offer_metadata=json.dumps({k: v for k, v in offer_data.items() if k not in ("events", "turma", "id", "adicionado")}),
                    created_at=now,
                )
                session.add(offer)
                session.flush()  # Get offer.id
                
                # 5. Create schedule events
                events = offer_data.get("events", [])
                for event_data in events:
                    try:
                        # Parse datetime to extract components
                        start_dt = datetime.fromisoformat(str(event_data.get("start")).replace("Z", "+00:00"))
                        end_dt = datetime.fromisoformat(str(event_data.get("end")).replace("Z", "+00:00"))
                        
                        event = OfferScheduleEventModel(
                            offer_id=offer.id,
                            start_datetime=event_data.get("start"),
                            end_datetime=event_data.get("end"),
                            day_of_week=event_data.get("day", start_dt.weekday()),
                            start_hour=event_data.get("start_hour", start_dt.hour),
                            end_hour=event_data.get("end_hour", end_dt.hour),
                            location=_extract_location(event_data.get("title", "")),
                            title=event_data.get("title"),
                            is_biweekly=0,  # TODO: detect from GDE data if available
                        )
                        session.add(event)
                    except Exception:
                        # Skip malformed event data
                        continue
        
        session.commit()
        return snapshot
    
    @staticmethod
    def get_snapshot_by_id(session: Session, snapshot_id: int) -> Optional[GdeSnapshotModel]:
        """Get a specific snapshot by ID."""
        return session.query(GdeSnapshotModel).filter_by(id=snapshot_id).first()


def _extract_location(title: str) -> Optional[str]:
    """Extract location from event title (last word typically)."""
    if not title:
        return None
    parts = str(title).split()
    return parts[-1] if parts else None
