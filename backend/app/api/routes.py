from __future__ import annotations

from fastapi import APIRouter

from app.api.endpoints import auth, courses, curriculum, planner, system, user_db

router = APIRouter()

router.include_router(system.router, tags=["system"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(courses.router, prefix="/courses", tags=["courses"])
router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
router.include_router(user_db.router, prefix="/user-db", tags=["user_db"])
router.include_router(planner.router, prefix="/planner", tags=["planner"])
