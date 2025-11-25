from __future__ import annotations

from fastapi import APIRouter

from app.services.user_cache import get_user_db_cache

router = APIRouter()


@router.get("/{planner_id}")
async def get_user_db(planner_id: str):
    """Retorna os dados do planner armazenados no user_db usando cache em memória."""
    cache = get_user_db_cache()
    return cache.load_planner(planner_id)
