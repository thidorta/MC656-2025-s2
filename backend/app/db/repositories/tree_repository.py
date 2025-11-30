from __future__ import annotations

from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import text

class TreeRepository:
    def __init__(self, db: Session):
        self.db = db
        self._snapshot_has_course_id: bool | None = None

    def invalidate_snapshot_schema_cache(self) -> None:
        """Force the repository to re-check snapshot table columns on the next query."""
        self._snapshot_has_course_id = None

    def _snapshot_supports_course_id(self) -> bool:
        """Detect whether the snapshot table currently exposes the course_id column."""
        if self._snapshot_has_course_id is not None:
            return self._snapshot_has_course_id

        # SQLite PRAGMA works for our bundled DB; default to False if inspection fails.
        try:
            result = self.db.execute(text("PRAGMA table_info(user_curriculum_snapshot)"))
            columns = set()
            for row in result.fetchall():
                col_name = getattr(row, "name", None)
                if col_name is None and len(row) > 1:
                    col_name = row[1]
                if col_name:
                    columns.add(col_name)
            self._snapshot_has_course_id = "course_id" in columns
        except Exception:
            self._snapshot_has_course_id = False

        return self._snapshot_has_course_id

    def fetch_user_snapshot_rows_filtered(self, user_id: str, course_id: int, catalog_year: int, modality_id: int) -> List[Dict[str, Any]]:
        has_course_id = self._snapshot_supports_course_id()
        course_select = "course_id" if has_course_id else "NULL AS course_id"
        course_filter = "AND course_id = :course_id" if has_course_id else ""

        query = text(
            f"""
            SELECT 
                user_id,
                code,
                name,
                credits,
                course_type,
                recommended_semester,
                cp_group,
                catalog_year,
                modality_id,
                {course_select},
                gde_discipline_id,
                gde_has_completed,
                gde_plan_status,
                gde_can_enroll,
                gde_prereqs_raw,
                gde_offers_raw,
                gde_color_raw,
                gde_plan_status_raw,
                is_completed,
                prereq_status,
                is_eligible,
                is_offered,
                final_status,
                prereq_list,
                children_list,
                depth,
                color_hex,
                graph_position,
                order_index
            FROM user_curriculum_snapshot
            WHERE user_id = :user_id
              {course_filter}
              AND catalog_year = :catalog_year
              AND modality_id = :modality_id
            ORDER BY depth ASC, order_index ASC, recommended_semester ASC
            """
        )

        params = {
            "user_id": str(user_id),
            "catalog_year": int(catalog_year),
            "modality_id": int(modality_id),
        }
        if has_course_id:
            params["course_id"] = int(course_id)

        result = self.db.execute(query, params)
        # Convert to dicts like row._mapping for portability
        rows = []
        for r in result.fetchall():
            rows.append({
                "user_id": r.user_id,
                "code": r.code,
                "name": r.name,
                "credits": r.credits,
                "course_type": r.course_type,
                "recommended_semester": r.recommended_semester,
                "cp_group": r.cp_group,
                "catalog_year": r.catalog_year,
                "modality_id": r.modality_id,
                "course_id": r.course_id,
                "gde_discipline_id": r.gde_discipline_id,
                "gde_has_completed": r.gde_has_completed,
                "gde_plan_status": r.gde_plan_status,
                "gde_can_enroll": r.gde_can_enroll,
                "gde_prereqs_raw": r.gde_prereqs_raw,
                "gde_offers_raw": r.gde_offers_raw,
                "gde_color_raw": r.gde_color_raw,
                "gde_plan_status_raw": r.gde_plan_status_raw,
                "is_completed": r.is_completed,
                "prereq_status": r.prereq_status,
                "is_eligible": r.is_eligible,
                "is_offered": r.is_offered,
                "final_status": r.final_status,
                "prereq_list": r.prereq_list,
                "children_list": r.children_list,
                "depth": r.depth,
                "color_hex": r.color_hex,
                "graph_position": r.graph_position,
                "order_index": r.order_index,
            })
        return rows

    def find_existing_modality(self, user_id: str, course_id: int, catalog_year: int) -> int | None:
        has_course_id = self._snapshot_supports_course_id()
        course_filter = "AND course_id = :course_id" if has_course_id else ""
        query = text(
            f"""
            SELECT modality_id
            FROM user_curriculum_snapshot
            WHERE user_id = :user_id
              {course_filter}
              AND catalog_year = :catalog_year
              AND modality_id IS NOT NULL
            LIMIT 1
            """
        )
        params = {
            "user_id": str(user_id),
            "catalog_year": int(catalog_year),
        }
        if has_course_id:
            params["course_id"] = int(course_id)

        row = self.db.execute(query, params).fetchone()
        return int(row.modality_id) if row else None
