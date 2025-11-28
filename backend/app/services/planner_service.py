"""
Planner service layer using relational repositories.
Replaces planner_store.py JSON persistence with proper domain models.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.repositories.snapshot_repo import SnapshotRepository
from app.db.repositories.curriculum_repo import CurriculumRepository
from app.db.repositories.planner_repo import PlannerRepository
from app.db.repositories.attendance_repo import AttendanceRepository

# Re-export repositories for convenience
__all__ = [
    "SnapshotRepository",
    "CurriculumRepository", 
    "PlannerRepository",
    "AttendanceRepository",
    "build_user_db_from_snapshot",
    "build_planner_response",
    "save_gde_snapshot",
    "update_planned_courses",
    "get_attendance_overrides",
    "save_attendance_overrides",
]


def _utcnow_iso() -> str:
    """Generate ISO 8601 timestamp in UTC"""
    return datetime.now(tz=timezone.utc).isoformat()


def build_user_db_from_snapshot(session: Session, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Reconstruct the /user-db/me payload from relational tables.
    
    Contract (from API_CONTRACT.md):
    {
      "planner_id": str,
      "user": {"name": str, "ra": str},
      "course": {"id": int, "name": str},
      "year": int,
      "current_period": str,
      "cp": float,
      "parameters": {...},
      "planejado": {...},
      "integralizacao_meta": {...},
      "faltantes": {...},
      "curriculum": [...],
      "disciplines": [...]
    }
    """
    snapshot_repo = SnapshotRepository()
    curriculum_repo = CurriculumRepository()
    
    # Get latest snapshot
    snapshot = snapshot_repo.get_latest_snapshot(session, user_id)
    if not snapshot:
        return None
    
    # Rebuild user_db payload
    user_db = snapshot.to_user_db_dict()
    
    # Load curriculum disciplines with their prerequisites and offers
    # Load curriculum disciplines with their prerequisites and offers
    disciplines = curriculum_repo.list_curriculum_for_snapshot(
        session=session,
        user_id=user_id,
        snapshot_id=snapshot.id,
    )
    curriculum_ids = [d.id for d in disciplines]
    prereqs_map = curriculum_repo.list_prereqs_for_curriculum_ids(session, curriculum_ids)
    offers_map = curriculum_repo.list_offers_for_curriculum(session, curriculum_ids)
    # Gather all offer ids to fetch events in batch
    all_offer_ids = [offer.id for offers in offers_map.values() for offer in offers]
    events_map = curriculum_repo.list_events_for_offers(session, all_offer_ids)

    curriculum_list: List[Dict[str, Any]] = []
    for disc in disciplines:
        # Build offers list for this discipline
        disc_offers = []
        for offer in offers_map.get(disc.id, []):
            offer_events = [evt.to_event_dict() for evt in events_map.get(offer.id, [])]
            disc_offers.append(offer.to_offer_dict(events=offer_events))

        disc_dict = disc.to_curriculum_dict(
            prereqs=prereqs_map.get(disc.id, []),
            offers=disc_offers,
        )
        curriculum_list.append(disc_dict)
    
    user_db["curriculum"] = curriculum_list
    
    # Add disciplines (CP group) - for now empty, can be enhanced later
    user_db["disciplines"] = []
    
    return user_db


def build_planner_response(session: Session, user_id: int, planner_id: str) -> Dict[str, Any]:
    """
    Reconstruct GET /planner response from relational state.
    
    Contract (from API_CONTRACT.md):
    {
      "planner_id": str,
      "original_payload": {...},
      "modified_payload": {...},
      "current_payload": {...},
      "planned_courses": {"MC102": "A", ...}
    }
    
    Strategy:
    - original_payload = latest GDE snapshot without user modifications
    - modified_payload = original + applied planned_courses selections
    - current_payload = modified if has user changes, else original
    - planned_courses = map from PlannedCourse rows
    """
    snapshot_repo = SnapshotRepository()
    planner_repo = PlannerRepository()

    # Always load planned courses map (even without a snapshot)
    planned_entries = planner_repo.list_planned_courses(session, user_id)
    planned_courses = {
        entry.codigo: (entry.turma or "")
        for entry in planned_entries
        if entry.turma  # Only include courses with selected turma
    }
    
    # Get base snapshot (original_payload)
    original_payload = build_user_db_from_snapshot(session, user_id)
    if not original_payload:
        # No snapshot yet: return empty payloads but include planned_courses
        return {
            "planner_id": planner_id,
            "original_payload": {},
            "modified_payload": {},
            "current_payload": {},
            "planned_courses": planned_courses,
        }
    
    # Build modified_payload: apply planned selections to curriculum
    modified_payload = _apply_planned_to_payload(original_payload, planned_entries)
    
    # current_payload = modified if has changes, else original
    has_changes = bool(planned_entries)
    current_payload = modified_payload if has_changes else original_payload
    
    return {
        "planner_id": planner_id,
        "original_payload": original_payload,
        "modified_payload": modified_payload,
        "current_payload": current_payload,
        "planned_courses": planned_courses,
    }


def _apply_planned_to_payload(
    original: Dict[str, Any],
    planned_entries: List[Any],
) -> Dict[str, Any]:
    """
    Apply planned course selections to the curriculum in the payload.
    Mark selected offers as "adicionado": true.
    """
    modified = json.loads(json.dumps(original))  # Deep copy
    
    # Build lookup map: codigo -> turma
    planned_map = {entry.codigo: entry.turma for entry in planned_entries}
    
    # Modify curriculum
    curriculum = modified.get("curriculum", [])
    for course in curriculum:
        if not isinstance(course, dict):
            continue
        codigo = course.get("codigo")
        if not codigo or codigo not in planned_map:
            continue
        
        selected_turma = planned_map[codigo]
        offers = course.get("offers", [])
        
        for offer in offers:
            if not isinstance(offer, dict):
                continue
            # Mark offer as selected if turma matches
            if offer.get("turma") == selected_turma:
                offer["adicionado"] = True
            else:
                offer["adicionado"] = False
    
    # Add planned_codes list (for compatibility)
    modified["planned_codes"] = list(planned_map.keys())
    
    return modified


def save_gde_snapshot(
    session: Session,
    user_id: int,
    planner_id: str,
    gde_payload: Dict[str, Any],
    user_db: Dict[str, Any],
) -> None:
    """
    Persist a new GDE snapshot to relational tables.
    Called after successful GDE login.
    
    Args:
        session: SQLAlchemy session
        user_id: User ID
        planner_id: GDE planner ID
        gde_payload: Raw GDE /ajax/planejador.php response
        user_db: Normalized user_db snapshot from gde_snapshot.build_user_db_snapshot()
    """
    snapshot_repo = SnapshotRepository()
    snapshot_repo.create_snapshot_from_gde(
        session=session,
        user_id=user_id,
        planner_id=planner_id,
        gde_payload=gde_payload,
        user_db_payload=user_db,
    )
    session.commit()


def update_planned_courses(
    session: Session,
    user_id: int,
    planned_payload: Dict[str, Any],
) -> None:
    """
    Update planned courses from /planner/modified request.
    
    Extracts planned selections from the payload and persists to planned_courses table.
    
    Args:
        session: SQLAlchemy session
        user_id: User ID
        planned_payload: Modified planner payload with planned selections
    """
    planner_repo = PlannerRepository()
    
    # Extract planned courses from payload
    planned_entries = _extract_planned_from_payload(planned_payload)
    
    # Replace all planned courses for this user
    planner_repo.replace_planned_courses(session, user_id, planned_entries)
    session.commit()


def _extract_planned_from_payload(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract planned course entries from a planner payload.
    
    Returns list of dicts: [{"codigo": "MC102", "turma": "A", "source": "user", ...}, ...]
    """
    entries = []
    
    # Check planned_codes list (simple list of codes)
    planned_codes = payload.get("planned_codes", [])
    if isinstance(planned_codes, list):
        for code in planned_codes:
            if code:
                entries.append({
                    "codigo": str(code).strip(),
                    "turma": None,
                    "source": "planned_codes",
                    "added_by_user": True,
                    "semester_planned": None,
                })
    
    # Extract from curriculum with offers
    curriculum = payload.get("curriculum", [])
    if isinstance(curriculum, list):
        for course in curriculum:
            if not isinstance(course, dict):
                continue
            
            codigo = course.get("codigo")
            if not codigo:
                continue
            
            offers = course.get("offers", [])
            if not isinstance(offers, list):
                continue
            
            # Find selected offer (marked with "adicionado": true)
            selected_turma = None
            for offer in offers:
                if isinstance(offer, dict) and offer.get("adicionado"):
                    selected_turma = offer.get("turma")
                    break
            
            # If no explicit selection but has offers, take first as default
            if not selected_turma and offers:
                for offer in offers:
                    if isinstance(offer, dict):
                        selected_turma = offer.get("turma")
                        break
            
            if selected_turma:
                # Check if already added from planned_codes
                existing = next((e for e in entries if e["codigo"] == codigo), None)
                if existing:
                    existing["turma"] = selected_turma
                else:
                    entries.append({
                        "codigo": codigo,
                        "turma": selected_turma,
                        "source": "curriculum",
                        "added_by_user": True,
                        "semester_planned": course.get("semestre"),
                    })
    
    return entries


def get_attendance_overrides(session: Session, user_id: int) -> Dict[str, Any]:
    """
    Get attendance overrides for a user.
    
    Returns dict: {"MC102": {"presencas": 10, "total_aulas": 15, ...}, ...}
    """
    attendance_repo = AttendanceRepository()
    return attendance_repo.get_overrides_map(session, user_id)


def save_attendance_overrides(
    session: Session,
    user_id: int,
    overrides: Dict[str, Any],
) -> None:
    """
    Save attendance overrides for a user.
    
    Args:
        session: SQLAlchemy session
        user_id: User ID
        overrides: Map {"MC102": {"presencas": 10, "total_aulas": 15, ...}, ...}
    """
    attendance_repo = AttendanceRepository()
    attendance_repo.upsert_overrides(session, user_id, overrides)
    session.commit()
