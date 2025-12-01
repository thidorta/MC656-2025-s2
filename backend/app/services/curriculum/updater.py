from __future__ import annotations

import json
from pathlib import Path
import unicodedata

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

    def rebuild_all_for_user(
        self,
        user_id: str,
        *,
        course_id: int | None = None,
        catalog_year: int | None = None,
        modality_id: int | None = None,
        user_db: dict | None = None,
    ) -> None:
        if not self.user_db_path.exists():
            raise AppError(f"user_auth.db not found at {self.user_db_path}")
        if not self.catalog_db_path.exists():
            raise AppError(f"catalog.db not found at {self.catalog_db_path}")

        logger.info(f"[CurriculumUpdater] Rebuilding pipeline for user_id={user_id}")

        # Load or use provided user_db overlay
        if user_db is None:
            if not self.login_json_path.exists():
                raise AppError(f"login.json not found at {self.login_json_path}")
            with self.login_json_path.open("r", encoding="utf-8-sig") as f:
                gde_login = json.load(f)
            user_db = gde_login.get("user_db") or gde_login.get("original_payload") or {}

        # Resolve selection values from args or payload
        if course_id is None:
            course_id = int((user_db.get("course") or {}).get("id") or 0)
        if catalog_year is None:
            catalog_year = int(user_db.get("year") or 0)
        if modality_id is None:
            # Try to infer modality_id from modality code in payload via catalog.db
            modality_code = None
            meta = user_db.get("integralizacao_meta") or {}
            modality_code = meta.get("modalidade") or (user_db.get("parameters") or {}).get("modalidade")
            modality_id = self._lookup_modality_id(course_id, catalog_year, modality_code)

        if not (course_id and catalog_year and modality_id):
            raise AppError(
                f"Missing required selection (course_id={course_id}, catalog_year={catalog_year}, modality_id={modality_id})"
            )

        # Instantiate services
        raw_service = RawAcquisitionService(self.catalog_db_path, self.user_db_path)
        norm_service = NormalizationService(self.user_db_path)
        tree_service = TreeGraphService(self.catalog_db_path, self.user_db_path)
        snapshot_service = SnapshotService(self.user_db_path)

        # Phase 0.5: Raw acquisition
        count_p0 = raw_service.rebuild_user_curriculum_raw(
            int(user_id), course_id, catalog_year, user_db, int(modality_id)
        )
        logger.info(f"Phase 0.5 done: {count_p0} rows in user_curriculum_raw")

        # Phase 1: Normalization
        count_p1 = norm_service.rebuild_user_curriculum_normalized()
        logger.info(f"Phase 1 done: {count_p1} rows in user_curriculum_normalized")

        # Phase 2: Tree builder
        count_p2 = tree_service.rebuild_user_curriculum_tree(int(user_id), int(course_id), int(catalog_year), int(modality_id))
        logger.info(f"Phase 2 done: {count_p2} nodes in user_curriculum_tree")

        # Phase 3: Final snapshot
        count_p3 = snapshot_service.rebuild_user_curriculum_snapshot(int(user_id))
        logger.info(f"Phase 3 done: {count_p3} rows in user_curriculum_snapshot")

    def _lookup_modality_id(self, course_id: int | None, catalog_year: int | None, modality_code: str | None) -> int | None:
        """Resolve modality_id from catalog.db given course_id, catalog_year and modality code (e.g., 'CO', 'AX')."""
        if not (course_id and catalog_year and modality_code):
            return None
        try:
            import sqlite3

            def _strip_accents(value: str) -> str:
                return "".join(
                    ch for ch in unicodedata.normalize("NFD", value) if unicodedata.category(ch) != "Mn"
                )

            conn = sqlite3.connect(str(self.catalog_db_path))
            try:
                normalized = str(modality_code).strip()
                # GDE payloads sometimes arrive double-encoded ("Ã§" instead of the expected cedilla).
                if "\u00c3" in normalized:
                    try:
                        normalized = normalized.encode("latin-1").decode("utf-8")
                    except UnicodeError:
                        pass
                if not normalized:
                    return None
                normalized_upper = normalized.upper()
                normalized_plain = _strip_accents(normalized_upper)

                rows = conn.execute(
                    """
                    SELECT cm.modality_id, cm.code, cm.label
                    FROM catalog_curriculum cc
                    JOIN catalog_modality cm ON cc.modality_id = cm.modality_id
                    WHERE cm.course_id = ?
                      AND cc.year = ?
                    """,
                    (int(course_id), int(catalog_year)),
                ).fetchall()

                for modality_id, code, label in rows:
                    code_str = str(code or "").strip().upper()
                    label_str = str(label or "").strip()
                    label_upper = label_str.upper()
                    label_plain = _strip_accents(label_upper)
                    if normalized_upper == code_str:
                        return int(modality_id)
                    if normalized_upper == label_upper:
                        return int(modality_id)
                    if normalized_plain and normalized_plain == label_plain:
                        return int(modality_id)
                    if label_upper.startswith(normalized_upper):
                        return int(modality_id)
                    if label_plain.startswith(normalized_plain):
                        return int(modality_id)
                return None
            finally:
                conn.close()
        except Exception:
            return None
