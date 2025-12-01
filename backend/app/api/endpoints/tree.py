"""
GET /tree endpoint - returns curriculum tree snapshot
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.db.session import get_db
from app.services.tree_service import TreeService
from app.utils.errors import AppError
from pydantic import BaseModel
from app.db.repositories.snapshot_repo import SnapshotRepository
from app.services.curriculum.updater import CurriculumUpdater
from app.db.repositories.tree_repository import TreeRepository
from app.services.session_store import get_session_store

router = APIRouter()
logger = logging.getLogger(__name__)


def _safe_int(value: Any | None) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_json_dict(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _extract_modal_variants(raw: str | None) -> list[str]:
    if not raw:
        return []
    cleaned = str(raw).strip()
    if not cleaned:
        return []
    variants = [cleaned]
    if "-" in cleaned:
        variants.append(cleaned.split("-", 1)[0].strip())
    if " " in cleaned:
        variants.append(cleaned.split(" ", 1)[0].strip())
    return [v for v in variants if v]


def _resolve_modality_id(
    updater: CurriculumUpdater,
    course_id: int | None,
    catalog_year: int | None,
    modality_code: str | None,
) -> int | None:
    if not modality_code:
        return None
    for candidate in _extract_modal_variants(modality_code):
        mod_id = updater._lookup_modality_id(course_id, catalog_year, candidate)
        if mod_id:
            return mod_id
    return None


def _guess_existing_modality(
    db: Session,
    user_id: int,
    course_id: int | None,
    catalog_year: int | None,
) -> int | None:
    if not (course_id and catalog_year):
        return None
    try:
        repo = TreeRepository(db)
        return repo.find_existing_modality(str(user_id), int(course_id), int(catalog_year))
    except Exception:
        return None


@router.get("/")
def get_tree_snapshot(
    user: tuple = Depends(require_user),
    db: Session = Depends(get_db),
    curso_id: int | None = Query(None, description="Course ID (curso_id)"),
    catalog_year: int | None = Query(None, description="Catalog year (YYYY)"),
    modality_id: int | None = Query(None, description="Modality numeric ID"),
    modality_code: str | None = Query(None, description="Modality short code (e.g., CO, AA)"),
) -> dict[str, Any]:
    """
    Returns the full curriculum tree snapshot for the authenticated user.
    
    Response format:
    {
        "user_id": int,
        "curriculum": [
            {
                "code": str,
                "name": str,
                "credits": int,
                "course_type": str,
                "recommended_semester": int,
                "cp_group": str,
                "catalog_year": int,
                "modality_id": int,
                "gde_discipline_id": str,
                "gde_has_completed": int,
                "gde_plan_status": int,
                "gde_can_enroll": int,
                "gde_prereqs_raw": int,
                "gde_offers_raw": str (JSON),
                "gde_color_raw": str,
                "gde_plan_status_raw": str,
                "is_completed": int,
                "prereq_status": str,
                "is_eligible": int,
                "is_offered": int,
                "final_status": str,
                "prereq_list": str (JSON array),
                "children_list": str (JSON array),
                "depth": int,
                "color_hex": str,
                "graph_position": str (JSON {x, y}),
                "order_index": int
            },
            ...
        ]
    }
    """
    user_id, payload = user
    logger.info(f"[tree.get] user_id={user_id}")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in credentials")
    
    try:
        updater = CurriculumUpdater()
        snap_repo = SnapshotRepository()
        latest_snapshot = snap_repo.get_latest_snapshot(db, int(user_id))

        # If modality code is provided, resolve it first
        if modality_id is None and modality_code:
            modality_id = _resolve_modality_id(updater, curso_id, catalog_year, modality_code)

        # Backward compatibility: infer selection from latest snapshot when params are missing
        if latest_snapshot is not None and (curso_id is None or catalog_year is None or modality_id is None):
            meta = _parse_json_dict(latest_snapshot.integralizacao_metadata)
            if curso_id is None:
                curso_id = _safe_int(latest_snapshot.raw_course_id)
            if catalog_year is None:
                catalog_year = _safe_int(latest_snapshot.catalog_year) or _safe_int(meta.get("catalogo"))
            if modality_id is None:
                modality_id = _resolve_modality_id(updater, curso_id, catalog_year, meta.get("modalidade"))

        # Still missing? try session payload derived from login snapshot
        needs_session_fallback = curso_id is None or catalog_year is None or modality_id is None
        if needs_session_fallback and payload.get("sid"):
            try:
                session = get_session_store().get(payload["sid"])
                session_user_db = (session.original_payload or {}) if session else {}
                if not session_user_db and session and session.user_db:
                    session_user_db = session.user_db
            except Exception:
                session_user_db = {}

            if isinstance(session_user_db, dict):
                if curso_id is None:
                    curso_id = _safe_int(session_user_db.get("course", {}).get("id"))
                if catalog_year is None:
                    raw_catalog = (
                        session_user_db.get("year")
                        or session_user_db.get("parameters", {}).get("catalogo")
                        or session_user_db.get("integralizacao_meta", {}).get("catalogo")
                    )
                    catalog_year = _safe_int(raw_catalog)
                if modality_id is None:
                    modal_sources = [
                        session_user_db.get("integralizacao_meta", {}).get("modalidade"),
                        session_user_db.get("course", {}).get("modalidade"),
                        session_user_db.get("parameters", {}).get("modalidade"),
                        modality_code,
                    ]
                    for modal_code in modal_sources:
                        if not modal_code:
                            continue
                        modality_id = _resolve_modality_id(updater, curso_id, catalog_year, modal_code)
                        if modality_id:
                            break

        # Last resort: reuse modality already persisted in snapshot table
        if modality_id is None and curso_id and catalog_year:
            modality_id = _guess_existing_modality(db, int(user_id), curso_id, catalog_year)

        if curso_id is None or catalog_year is None or modality_id is None:
            logger.warning(
                "[tree.get] Missing selection after inference user_id=%s curso_id=%s catalog_year=%s modality_id=%s modality_code=%s",
                user_id,
                curso_id,
                catalog_year,
                modality_id,
                modality_code,
            )
            raise HTTPException(status_code=422, detail="Missing selection: curso_id, catalog_year, modality_id")

        service = TreeService(db)
        payload = service.build_for_user(
            user_id=str(user_id),
            course_id=int(curso_id),
            catalog_year=int(catalog_year),
            modality_id=int(modality_id),
        )
        logger.info(f"[tree.get] Returning {len(payload.get('curriculum', []))} nodes for user_id={user_id}")
        return payload
    except AppError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[tree.get] Error fetching tree snapshot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch tree snapshot: {str(e)}")


class TreeRebuildPayload(BaseModel):
    user_id: int
    curso_id: int
    catalog_year: int
    modality_id: int


@router.post("/rebuild")
def rebuild_tree_snapshot(
    body: TreeRebuildPayload = Body(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Force a full rebuild of the curriculum pipeline for a specific
    (user_id, curso_id, catalog_year, modality_id) selection.
    Returns the number of snapshot rows after rebuild.
    """
    try:
        service = TreeService(db)
        count = service.rebuild_for_selection(
            user_id=str(body.user_id),
            course_id=int(body.curso_id),
            catalog_year=int(body.catalog_year),
            modality_id=int(body.modality_id),
        )
        return {"status": "ok", "rows": count}
    except AppError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[tree.rebuild] Error rebuilding tree snapshot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to rebuild tree snapshot: {str(e)}")
