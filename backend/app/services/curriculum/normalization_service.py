"""
NormalizationService - Phase 1 Logic
Computes academic status from raw curriculum data
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

from app.utils.logging_setup import logger


class NormalizationService:
    """Service for normalizing curriculum and computing academic state."""

    def __init__(self, user_auth_db_path: Path):
        self.user_auth_db_path = user_auth_db_path

    @staticmethod
    def compute_is_completed(gde_has_completed: Optional[int]) -> int:
        """null -> 1 (historically completed), 1 -> 0 (not completed), 0 -> 0 (not completed)"""
        if gde_has_completed is None:
            return 1
        return 0

    @staticmethod
    def compute_prereq_status(missing_in_gde_snapshot: Optional[int]) -> str:
        """Use GDE missing flag: None -> not_applicable, 0 -> satisfied, 1 -> missing"""
        if missing_in_gde_snapshot is None:
            return "not_applicable"
        return "missing" if int(missing_in_gde_snapshot) == 1 else "satisfied"

    @staticmethod
    def compute_is_offered(gde_offers_raw: Optional[str]) -> int:
        """Parse offers JSON; offered if array has at least one item."""
        if not gde_offers_raw:
            return 0
        try:
            import json
            data = json.loads(gde_offers_raw)
            return 1 if isinstance(data, list) and len(data) > 0 else 0
        except Exception:
            return 0

    @staticmethod
    def compute_is_eligible(is_completed: int, can_enroll_gde: Optional[int], prereq_status: str) -> int:
        """Eligibility: if completed -> 0; else prefer GDE can_enroll flag; fallback to prereq_status."""
        if is_completed == 1:
            return 0
        if can_enroll_gde is not None:
            return 1 if int(can_enroll_gde) == 1 else 0
        return 0 if prereq_status == "missing" else 1

    @staticmethod
    def compute_final_status(is_completed: int, is_eligible: int, is_offered: int) -> str:
        """Decision tree for final status."""
        if is_completed == 1:
            return "completed"
        elif is_eligible == 0:
            return "not_eligible"
        elif is_eligible == 1 and is_offered == 1:
            return "eligible_and_offered"
        else:
            return "eligible_not_offered"

    def rebuild_user_curriculum_normalized(self) -> int:
        """Create normalized curriculum table with computed fields."""
        conn = sqlite3.connect(str(self.user_auth_db_path))
        
        try:
            # Drop and recreate
            conn.execute("DROP TABLE IF EXISTS user_curriculum_normalized")
            conn.execute("""
                CREATE TABLE user_curriculum_normalized (
                    user_id TEXT NOT NULL,
                    code TEXT NOT NULL,
                    name TEXT NOT NULL,
                    credits INTEGER,
                    course_type TEXT,
                    recommended_semester INTEGER,
                    cp_group TEXT,
                    catalog_year INTEGER,
                    modality_id INTEGER,
                    
                    gde_discipline_id TEXT,
                    gde_has_completed INTEGER,
                    gde_plan_status INTEGER,
                    gde_can_enroll INTEGER,
                    gde_prereqs_raw INTEGER,
                    gde_offers_raw TEXT,
                    gde_color_raw TEXT,
                    gde_plan_status_raw TEXT,
                    
                    is_completed INTEGER NOT NULL,
                    prereq_status TEXT NOT NULL,
                    is_eligible INTEGER NOT NULL,
                    is_offered INTEGER NOT NULL,
                    final_status TEXT NOT NULL,
                    
                    PRIMARY KEY (user_id, code)
                )
            """)

            # Read from raw
            cur = conn.execute("""
                SELECT 
                    user_id, code, name, credits, tipo, semester,
                    cp_group, catalogo, modality_id,
                    discipline_id_gde, has_completed_gde, can_enroll_gde,
                    missing_in_gde_snapshot, status_gde_raw, color_gde_raw,
                    note_gde_raw, prereqs_gde_raw, offers_gde_raw
                FROM user_curriculum_raw
            """)

            rows = cur.fetchall()

            for row in rows:
                (user_id, code, name, credits, tipo, semester, cp_group, catalogo, modality_id,
                 discipline_id_gde, has_completed_gde, can_enroll_gde, missing_in_gde_snapshot,
                 status_gde_raw, color_gde_raw, note_gde_raw, prereqs_gde_raw, offers_gde_raw) = row

                # Compute Phase 1 fields
                is_completed = self.compute_is_completed(has_completed_gde)
                prereq_status = self.compute_prereq_status(missing_in_gde_snapshot)
                is_offered = self.compute_is_offered(offers_gde_raw)
                is_eligible = self.compute_is_eligible(is_completed, can_enroll_gde, prereq_status)
                final_status = self.compute_final_status(is_completed, is_eligible, is_offered)

                # Map plan status if present
                gde_plan_status = 1 if can_enroll_gde == 1 else 0 if can_enroll_gde is not None else None

                conn.execute("""
                    INSERT INTO user_curriculum_normalized (
                        user_id, code, name, credits, course_type, recommended_semester,
                        cp_group, catalog_year, modality_id,
                        gde_discipline_id, gde_has_completed, gde_plan_status,
                        gde_can_enroll, gde_prereqs_raw, gde_offers_raw,
                        gde_color_raw, gde_plan_status_raw,
                        is_completed, prereq_status, is_eligible, is_offered, final_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id, code, name, credits, tipo, semester,
                    cp_group, catalogo, modality_id,
                    discipline_id_gde, has_completed_gde, gde_plan_status,
                    can_enroll_gde, prereqs_gde_raw, offers_gde_raw,
                    color_gde_raw, status_gde_raw,
                    is_completed, prereq_status, is_eligible, is_offered, final_status
                ))

            conn.commit()
            count = len(rows)
            logger.info(f"[NormalizationService] Normalized {count} rows")
            return count

        finally:
            conn.close()
