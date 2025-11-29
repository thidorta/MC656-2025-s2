from __future__ import annotations

import json
from pathlib import Path

from app.config.settings import get_settings
from app.utils.logging_setup import logger
from app.utils.errors import AppError

from .raw_acquisition_service import RawAcquisitionService
from .normalization_service import NormalizationService
from .tree_graph_service import TreeGraphService
from .snapshot_service import SnapshotService


class CurriculumUpdater:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.user_db_path: Path = self.settings.user_auth_db_path
        self.catalog_db_path: Path = self.settings.catalog_db_path
        self.login_json_path: Path = Path(__file__).resolve().parents[3] / "login.json"

    def rebuild_all_for_user(self, user_id: str) -> None:
        if not self.user_db_path.exists():
            raise AppError(f"user_auth.db not found at {self.user_db_path}")
        if not self.catalog_db_path.exists():
            raise AppError(f"catalog.db not found at {self.catalog_db_path}")
        if not self.login_json_path.exists():
            raise AppError(f"login.json not found at {self.login_json_path}")

        logger.info(f"[CurriculumUpdater] Rebuilding pipeline for user_id={user_id}")

        # Load login json for overlay
        with self.login_json_path.open("r", encoding="utf-8-sig") as f:
            gde_login = json.load(f)
        user_db = gde_login.get("user_db") or gde_login.get("original_payload") or {}
        course_id = int(user_db.get("course", {}).get("id") or 0)
        catalog_year = int(user_db.get("year") or 0)
        if not (course_id and catalog_year):
            raise AppError("Missing course_id/year in login payload")

        # Instantiate services
        raw_service = RawAcquisitionService(self.catalog_db_path, self.user_db_path)
        norm_service = NormalizationService(self.user_db_path)
        tree_service = TreeGraphService(self.catalog_db_path, self.user_db_path)
        snapshot_service = SnapshotService(self.user_db_path)

        # Phase 0.5: Raw acquisition
        count_p0 = raw_service.rebuild_user_curriculum_raw(int(user_id), course_id, catalog_year, user_db)
        logger.info(f"Phase 0.5 done: {count_p0} rows in user_curriculum_raw")

        # Phase 1: Normalization
        count_p1 = norm_service.rebuild_user_curriculum_normalized()
        logger.info(f"Phase 1 done: {count_p1} rows in user_curriculum_normalized")

        # Phase 2: Tree builder
        count_p2 = tree_service.rebuild_user_curriculum_tree()
        logger.info(f"Phase 2 done: {count_p2} nodes in user_curriculum_tree")

        # Phase 3: Final snapshot
        count_p3 = snapshot_service.rebuild_user_curriculum_snapshot()
        logger.info(f"Phase 3 done: {count_p3} rows in user_curriculum_snapshot")
