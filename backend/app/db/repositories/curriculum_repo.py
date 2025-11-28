"""
CurriculumRepository: Data access layer for curriculum disciplines.

Handles retrieval of curriculum data and prerequisite relationships.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models_planner import (
    CurriculumDisciplineModel,
    DisciplinePrerequisiteModel,
    CourseOfferModel,
    OfferScheduleEventModel,
)


class CurriculumRepository:
    """Repository for managing curriculum disciplines and prerequisites."""
    
    @staticmethod
    def list_curriculum_for_snapshot(
        session: Session,
        user_id: int,
        snapshot_id: int,
    ) -> List[CurriculumDisciplineModel]:
        """
        Get all curriculum disciplines for a snapshot.
        
        Args:
            session: SQLAlchemy session
            user_id: User ID
            snapshot_id: Snapshot ID
            
        Returns:
            List of CurriculumDisciplineModel ordered by semester
        """
        return (
            session.query(CurriculumDisciplineModel)
            .filter_by(user_id=user_id, snapshot_id=snapshot_id)
            .order_by(
                CurriculumDisciplineModel.semestre_sugerido.asc().nullsfirst(),
                CurriculumDisciplineModel.codigo.asc(),
            )
            .all()
        )
    
    @staticmethod
    def list_prereqs_for_curriculum_ids(
        session: Session,
        curriculum_ids: List[int],
    ) -> Dict[int, List[List[str]]]:
        """
        Get prerequisites for multiple curriculum disciplines.
        
        Groups prerequisites by alternative_group to support OR logic.
        
        Args:
            session: SQLAlchemy session
            curriculum_ids: List of curriculum_discipline IDs
            
        Returns:
            Dict mapping curriculum_discipline_id to prereqs array like:
            {123: [["MA111"], ["MA141"]], ...}
        """
        if not curriculum_ids:
            return {}
        
        prereqs = (
            session.query(DisciplinePrerequisiteModel)
            .filter(DisciplinePrerequisiteModel.curriculum_discipline_id.in_(curriculum_ids))
            .order_by(
                DisciplinePrerequisiteModel.curriculum_discipline_id.asc(),
                DisciplinePrerequisiteModel.alternative_group.asc(),
            )
            .all()
        )
        
        # Group by curriculum_discipline_id and alternative_group
        result: Dict[int, Dict[int, List[str]]] = defaultdict(lambda: defaultdict(list))
        for prereq in prereqs:
            result[prereq.curriculum_discipline_id][prereq.alternative_group].append(
                prereq.required_codigo
            )
        
        # Convert to list of lists format
        final_result: Dict[int, List[List[str]]] = {}
        for disc_id, groups in result.items():
            final_result[disc_id] = [codes for group_idx, codes in sorted(groups.items())]
        
        return final_result
    
    @staticmethod
    def list_offers_for_curriculum(
        session: Session,
        curriculum_ids: List[int],
    ) -> Dict[int, List[CourseOfferModel]]:
        """
        Get offers for multiple curriculum disciplines.
        
        Args:
            session: SQLAlchemy session
            curriculum_ids: List of curriculum_discipline IDs
            
        Returns:
            Dict mapping curriculum_discipline_id to list of offers
        """
        if not curriculum_ids:
            return {}
        
        offers = (
            session.query(CourseOfferModel)
            .filter(CourseOfferModel.curriculum_discipline_id.in_(curriculum_ids))
            .all()
        )
        
        result: Dict[int, List[CourseOfferModel]] = defaultdict(list)
        for offer in offers:
            if offer.curriculum_discipline_id:
                result[offer.curriculum_discipline_id].append(offer)
        
        return dict(result)
    
    @staticmethod
    def list_events_for_offers(
        session: Session,
        offer_ids: List[int],
    ) -> Dict[int, List[OfferScheduleEventModel]]:
        """
        Get schedule events for multiple offers.
        
        Args:
            session: SQLAlchemy session
            offer_ids: List of offer IDs
            
        Returns:
            Dict mapping offer_id to list of events
        """
        if not offer_ids:
            return {}
        
        events = (
            session.query(OfferScheduleEventModel)
            .filter(OfferScheduleEventModel.offer_id.in_(offer_ids))
            .order_by(
                OfferScheduleEventModel.day_of_week.asc(),
                OfferScheduleEventModel.start_hour.asc(),
            )
            .all()
        )
        
        result: Dict[int, List[OfferScheduleEventModel]] = defaultdict(list)
        for event in events:
            result[event.offer_id].append(event)
        
        return dict(result)
