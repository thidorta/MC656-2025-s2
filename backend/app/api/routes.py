from __future__ import annotations

from fastapi import APIRouter

from app.api.endpoints import courses, curriculum, user_db

router = APIRouter()

router.include_router(courses.router, prefix="/courses", tags=["courses"])
router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
router.include_router(user_db.router, prefix="/user-db", tags=["user_db"])
