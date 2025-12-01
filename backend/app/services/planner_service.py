"""
Planner service layer using relational repositories.
Replaces planner_store.py JSON persistence with proper domain models.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.repositories.snapshot_repo import SnapshotRepository
from app.db.repositories.curriculum_repo import CurriculumRepository
from app.db.repositories.planner_repo import PlannerRepository
from app.db.repositories.attendance_repo import AttendanceRepository
from app.utils.planner_debug import write_debug_json

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


def _safe_json_loads(payload: Optional[str], fallback: Any) -> Any:
    if not payload:
        return fallback
    try:
        return json.loads(payload)
    except Exception:
        return fallback


def _extract_professor_name(metadata: Optional[Dict[str, Any]]) -> Optional[str]:
    if not isinstance(metadata, dict):
        return None
    for key in ("professor", "docente", "teacher"):
        value = metadata.get(key)
        if isinstance(value, str):
            stripped = value.strip()
            if stripped:
                return stripped
    professores = metadata.get("professores")
    if isinstance(professores, list):
        for entry in professores:
            if isinstance(entry, dict):
                value = entry.get("nome")
                if isinstance(value, str) and value.strip():
                    return value.strip()
    return None


def _fetch_tree_rows(session: Session, user_id: int) -> List[Dict[str, Any]]:
    query = text(
        """
        SELECT
            t.user_id,
            t.code,
            t.name,
            t.credits,
            t.course_type,
            t.recommended_semester,
            t.cp_group,
            t.is_completed,
            t.prereq_status,
            t.is_eligible,
            t.is_offered,
            t.final_status,
            t.children,
            t.parents,
            t.depth_level,
            t.color_tree,
            t.is_planned,
            t.gde_has_completed,
            t.gde_plan_status,
            t.gde_can_enroll,
            t.gde_prereqs_raw,
            t.gde_offers_raw,
            t.gde_color_raw,
            t.gde_plan_status_raw
        FROM user_curriculum_tree AS t
        WHERE t.user_id = :uid
        ORDER BY t.depth_level ASC, t.code ASC
        """
    )
    rows = session.execute(query, {"uid": str(user_id)}).mappings().all()
    return [dict(row) for row in rows]


def _load_offers_for_user(session: Session, user_id: int) -> Dict[str, List[Dict[str, Any]]]:
    offers_query = text(
        """
        SELECT
            o.id,
            o.codigo,
            o.turma,
            o.offer_external_id,
            o.offer_metadata,
            o.created_at
        FROM course_offers AS o
        WHERE o.user_id = :uid
        ORDER BY o.created_at DESC, o.id DESC
        """
    )
    offer_rows = session.execute(offers_query, {"uid": user_id}).mappings().all()
    if not offer_rows:
        return {}

    events_query = text(
        """
        SELECT
            e.offer_id,
            e.start_datetime,
            e.end_datetime,
            e.day_of_week,
            e.start_hour,
            e.end_hour,
            e.location,
            e.title
        FROM offer_schedule_events AS e
        JOIN course_offers AS o ON o.id = e.offer_id
        WHERE o.user_id = :uid
        ORDER BY e.day_of_week ASC, e.start_hour ASC
        """
    )
    event_rows = session.execute(events_query, {"uid": user_id}).mappings().all()
    event_map: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for row in event_rows:
        event_map[row["offer_id"]].append(
            {
                "title": row["title"],
                "start": row["start_datetime"],
                "end": row["end_datetime"],
                "day": row["day_of_week"],
                "start_hour": row["start_hour"],
                "end_hour": row["end_hour"],
                "location": row["location"],
            }
        )

    offers_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    seen_keys: set[Tuple[str, str, Optional[str], Optional[str]]] = set()
    for row in offer_rows:
        metadata = _safe_json_loads(row["offer_metadata"], {})
        professor_name = _extract_professor_name(metadata)
        external_id = row.get("offer_external_id")
        key = (
            row["codigo"],
            row["turma"],
            str(external_id) if external_id is not None else None,
            professor_name,
        )
        if key in seen_keys:
            continue
        seen_keys.add(key)
        offer_dict = {
            "id": metadata.get("id") or row["offer_external_id"],
            "turma": row["turma"],
            "adicionado": False,
            **{k: v for k, v in metadata.items() if k not in {"id", "turma", "adicionado", "events"}},
            "events": event_map.get(row["id"], []),
        }
        if professor_name and not offer_dict.get("professor"):
            offer_dict["professor"] = professor_name
        offers_map[row["codigo"]].append(offer_dict)

    return offers_map


def _build_curriculum_from_tree(session: Session, user_id: int) -> List[Dict[str, Any]]:
    rows = _fetch_tree_rows(session, user_id)
    if not rows:
        return []

    offers_map = _load_offers_for_user(session, user_id)
    curriculum: List[Dict[str, Any]] = []

    for row in rows:
        parents_list = _safe_json_loads(row.get("parents"), [])
        prereqs = [parents_list] if parents_list else []
        course_dict = {
            "disciplina_id": row.get("gde_discipline_id"),
            "codigo": row["code"],
            "nome": row["name"],
            "creditos": row.get("credits"),
            "catalogo": None,
            "tipo": row.get("course_type"),
            "semestre": row.get("recommended_semester"),
            "cp_group": row.get("cp_group"),
            "missing": row.get("final_status") != "completed",
            "status": row.get("final_status"),
            "tem": bool(row.get("is_completed")),
            "pode": bool(row.get("is_eligible")),
            "obs": row.get("prereq_status"),
            "color": row.get("color_tree"),
            "metadata": {},
            "prereqs": prereqs,
            "offers": offers_map.get(row["code"], []),
        }
        curriculum.append(course_dict)

    return curriculum


def _update_tree_planned_flags(session: Session, user_id: int, planned_codes: List[str]) -> None:
    uid = str(user_id)
    try:
        session.execute(text("UPDATE user_curriculum_tree SET is_planned = 0 WHERE user_id = :uid"), {"uid": uid})
        if planned_codes:
            params = {"uid": uid}
            placeholders = []
            for idx, code in enumerate(planned_codes):
                key = f"code_{idx}"
                params[key] = code
                placeholders.append(f":{key}")
            session.execute(
                text(
                    f"""
                    UPDATE user_curriculum_tree
                    SET is_planned = 1
                    WHERE user_id = :uid AND code IN ({', '.join(placeholders)})
                    """
                ),
                params,
            )
        session.commit()
    except Exception:
        session.rollback()
        # Tree table might not exist for newer users yet; swallow errors to avoid blocking planner updates.
        logger = logging.getLogger(__name__)
        logger.debug("user_curriculum_tree not updated (missing table or other error)")


def _debug_suffix(
    *,
    user_id: Optional[int] = None,
    planner_id: Optional[str] = None,
    snapshot_id: Optional[int] = None,
) -> Optional[str]:
    parts: List[str] = []
    if user_id is not None:
        parts.append(f"user-{user_id}")
    if planner_id:
        parts.append(f"planner-{planner_id}")
    if snapshot_id is not None:
        parts.append(f"snapshot-{snapshot_id}")
    return "_".join(parts) if parts else None


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
        write_debug_json(
            "build_user_db_from_snapshot_missing",
            {"user_id": user_id, "reason": "no_snapshot"},
            suffix=_debug_suffix(user_id=user_id),
        )
        return None
    
    # Rebuild user_db payload
    user_db = snapshot.to_user_db_dict()
    
    curriculum_list = _build_curriculum_from_tree(session, user_id)

    if not curriculum_list:
        # Fall back to the older snapshot-driven curriculum if tree data is missing
        disciplines = curriculum_repo.list_curriculum_for_snapshot(
            session=session,
            user_id=user_id,
            snapshot_id=snapshot.id,
        )
        curriculum_ids = [d.id for d in disciplines]
        prereqs_map = curriculum_repo.list_prereqs_for_curriculum_ids(session, curriculum_ids)
        offers_map = curriculum_repo.list_offers_for_curriculum(session, curriculum_ids)
        all_offer_ids = [offer.id for offers in offers_map.values() for offer in offers]
        events_map = curriculum_repo.list_events_for_offers(session, all_offer_ids)

        for disc in disciplines:
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
    
    write_debug_json(
        "build_user_db_from_snapshot",
        {
            "user_id": user_id,
            "snapshot_id": snapshot.id,
            "curriculum_count": len(curriculum_list),
            "user_db": user_db,
        },
        suffix=_debug_suffix(user_id=user_id, snapshot_id=snapshot.id),
    )
    
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
    - original_payload = latest GDE snapshot WITHOUT any planning data
    - modified_payload = original + applied planned_courses selections from DB
    - current_payload = modified if has user changes, else original
    - planned_courses = map from PlannedCourse rows ONLY (user's explicit selections)
    
    IMPORTANT: planejado_metadata from GDE snapshot is IGNORED.
    Planning state comes ONLY from planned_courses table (user actions via PUT /planner).
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
        result = {
            "planner_id": planner_id,
            "original_payload": {},
            "modified_payload": {},
            "current_payload": {},
            "planned_courses": planned_courses,
        }
        write_debug_json(
            "build_planner_response_empty",
            {"user_id": user_id, "planner_id": planner_id, "planned_courses": planned_courses},
            suffix=_debug_suffix(user_id=user_id, planner_id=planner_id),
        )
        return result
    
    # Build modified_payload: apply planned selections to curriculum
    modified_payload = _apply_planned_to_payload(original_payload, planned_entries)
    
    # current_payload = modified if has changes, else original
    has_changes = bool(planned_entries)
    current_payload = modified_payload if has_changes else original_payload
    
    result = {
        "planner_id": planner_id,
        "original_payload": original_payload,
        "modified_payload": modified_payload,
        "current_payload": current_payload,
        "planned_courses": planned_courses,
    }
    write_debug_json(
        "build_planner_response",
        {
            "user_id": user_id,
            "planner_id": planner_id,
            "planned_courses": planned_courses,
            "has_changes": has_changes,
            "payload": result,
        },
        suffix=_debug_suffix(user_id=user_id, planner_id=planner_id),
    )
    return result


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
    write_debug_json(
        "save_gde_snapshot_input",
        {
            "user_id": user_id,
            "planner_id": planner_id,
            "gde_payload": gde_payload,
            "user_db": user_db,
        },
        suffix=_debug_suffix(user_id=user_id, planner_id=planner_id),
    )

    snapshot_repo = SnapshotRepository()
    snapshot = snapshot_repo.create_snapshot_from_gde(
        session=session,
        user_id=user_id,
        planner_id=planner_id,
        gde_payload=gde_payload,
        user_db_payload=user_db,
    )
    session.commit()

    write_debug_json(
        "save_gde_snapshot_result",
        {
            "user_id": user_id,
            "planner_id": planner_id,
            "snapshot_id": snapshot.id,
            "curriculum_count": len(user_db.get("curriculum", [])) if isinstance(user_db, dict) else None,
        },
        suffix=_debug_suffix(user_id=user_id, planner_id=planner_id, snapshot_id=snapshot.id),
    )


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
    
    write_debug_json(
        "update_planned_courses_input",
        {"user_id": user_id, "payload": planned_payload},
        suffix=_debug_suffix(user_id=user_id),
    )
    
    # Extract planned courses from payload
    planned_entries = _extract_planned_from_payload(planned_payload)
    write_debug_json(
        "update_planned_courses_entries",
        {"user_id": user_id, "entries": planned_entries},
        suffix=_debug_suffix(user_id=user_id),
    )
    
    # Replace all planned courses for this user
    planner_repo.replace_planned_courses(session, user_id, planned_entries)
    session.commit()

    planned_codes = [entry["codigo"] for entry in planned_entries if entry.get("codigo")]
    _update_tree_planned_flags(session, user_id, planned_codes)

    write_debug_json(
        "update_planned_courses_result",
        {"user_id": user_id, "saved_count": len(planned_entries)},
        suffix=_debug_suffix(user_id=user_id),
    )


def _extract_planned_from_payload(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract planned course entries from a planner payload.
    
    Returns list of dicts: [{"codigo": "MC102", "turma": "A", "source": "user", ...}, ...]
    """
    entries: List[Dict[str, Any]] = []
    planned_codes_set: set[str] = set()
    
    # Check planned_codes list (simple list of codes)
    planned_codes = payload.get("planned_codes", [])
    if isinstance(planned_codes, list):
        for code in planned_codes:
            if not code:
                continue
            normalized = str(code).strip()
            if not normalized:
                continue
            planned_codes_set.add(normalized)
            entries.append({
                "codigo": normalized,
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
            is_planned = codigo in planned_codes_set
            if not isinstance(offers, list):
                continue
            
            # Find selected offer (marked with "adicionado": true)
            selected_turma = None
            for offer in offers:
                if isinstance(offer, dict) and offer.get("adicionado"):
                    selected_turma = offer.get("turma")
                    break
            
            if not selected_turma and not is_planned:
                # Course not explicitly planned -> skip
                continue
            
            # If planned but no explicit selection, fall back to first turma
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
