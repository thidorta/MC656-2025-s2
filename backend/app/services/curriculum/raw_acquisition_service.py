"""
RawAcquisitionService - Phase 0.5 Logic
Performs strict raw left join: catalog.db ← left, GDE user_db ← right
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

from app.utils.logging_setup import logger


class RawAcquisitionService:
    """Service for acquiring raw curriculum data from catalog and GDE overlay."""

    def __init__(self, catalog_db_path: Path, user_auth_db_path: Path):
        self.catalog_db_path = catalog_db_path
        self.user_auth_db_path = user_auth_db_path

    def prepare_gde_overlay(self, user_db: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Rename GDE fields producing right-side rows keyed by code."""
        overlay: List[Dict[str, Any]] = []
        for item in user_db.get("curriculum", []):
            code = item.get("codigo")
            if not code:
                continue
            overlay.append({
                "code": code,
                "discipline_id_gde": item.get("disciplina_id"),
                "has_completed_gde": 1 if item.get("tem") else 0 if item.get("tem") is not None else None,
                "can_enroll_gde": 1 if item.get("pode") is True else 0 if item.get("pode") is False else None,
                "missing_in_gde_snapshot": 1 if item.get("missing") else 0 if item.get("missing") is not None else None,
                "status_gde_raw": item.get("status"),
                "color_gde_raw": item.get("color"),
                "note_gde_raw": item.get("obs"),
                "prereqs_gde_raw": json.dumps(item.get("prereqs", []), ensure_ascii=False),
                "offers_gde_raw": json.dumps(item.get("offers", []), ensure_ascii=False),
            })
        return overlay

    def ensure_overlay_temp_table(self, conn: sqlite3.Connection, rows: List[Dict[str, Any]]):
        """Create temporary overlay table with renamed GDE fields."""
        conn.execute("DROP TABLE IF EXISTS gde_overlay_raw")
        conn.execute("""
            CREATE TABLE gde_overlay_raw (
                code TEXT PRIMARY KEY,
                discipline_id_gde TEXT,
                has_completed_gde INTEGER,
                can_enroll_gde INTEGER,
                missing_in_gde_snapshot INTEGER,
                status_gde_raw TEXT,
                color_gde_raw TEXT,
                note_gde_raw TEXT,
                prereqs_gde_raw TEXT,
                offers_gde_raw TEXT
            )
        """)
        for r in rows:
            conn.execute("""
                INSERT INTO gde_overlay_raw (
                    code, discipline_id_gde, has_completed_gde, can_enroll_gde,
                    missing_in_gde_snapshot, status_gde_raw, color_gde_raw, note_gde_raw,
                    prereqs_gde_raw, offers_gde_raw
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                r["code"], r["discipline_id_gde"], r["has_completed_gde"], r["can_enroll_gde"],
                r["missing_in_gde_snapshot"], r["status_gde_raw"], r["color_gde_raw"],
                r["note_gde_raw"], r["prereqs_gde_raw"], r["offers_gde_raw"],
            ))
        conn.commit()

    def rebuild_user_curriculum_raw(
        self, user_id: int, course_id: int, catalog_year: int, user_db: Dict[str, Any]
    ) -> int:
        """Build user_curriculum_raw table via left join."""
        catalog_conn = sqlite3.connect(str(self.catalog_db_path))
        user_auth_conn = sqlite3.connect(str(self.user_auth_db_path))

        try:
            # Prepare overlay
            overlay_rows = self.prepare_gde_overlay(user_db)
            self.ensure_overlay_temp_table(user_auth_conn, overlay_rows)

            # Drop and recreate raw table
            user_auth_conn.execute("DROP TABLE IF EXISTS user_curriculum_raw")
            user_auth_conn.execute("""
                CREATE TABLE user_curriculum_raw (
                    user_id INTEGER NOT NULL,
                    code TEXT NOT NULL,
                    name TEXT,
                    credits INTEGER,
                    tipo TEXT,
                    semester INTEGER,
                    cp_group TEXT,
                    modality_id INTEGER,
                    catalogo INTEGER,
                    discipline_id_gde TEXT,
                    has_completed_gde INTEGER,
                    can_enroll_gde INTEGER,
                    missing_in_gde_snapshot INTEGER,
                    status_gde_raw TEXT,
                    color_gde_raw TEXT,
                    note_gde_raw TEXT,
                    prereqs_gde_raw TEXT,
                    offers_gde_raw TEXT,
                    PRIMARY KEY(user_id, code)
                )
            """)

            # Attach catalog and perform left join
            user_auth_conn.execute(f"ATTACH DATABASE '{str(self.catalog_db_path).replace(chr(92), '/')}' AS catalog")

            insert_sql = """
                WITH ce1 AS (
                    SELECT ce.rowid AS ce_rowid, ce.*, d.code AS d_code, d.name AS d_name, cc.modality_id AS cc_modality_id
                    FROM catalog.curriculum_entry ce
                    JOIN catalog.catalog_curriculum cc ON ce.curriculum_id = cc.curriculum_id
                    JOIN catalog.discipline d ON ce.discipline_id = d.discipline_id
                    JOIN catalog.catalog_modality cm ON cc.modality_id = cm.modality_id
                    WHERE cm.course_id = ? AND cc.year = ?
                ), picked AS (
                    SELECT * FROM ce1 WHERE ce_rowid IN (
                        SELECT MIN(ce_rowid) FROM ce1 GROUP BY d_code
                    )
                )
                INSERT INTO user_curriculum_raw (
                    user_id, code, name, credits, tipo, semester, cp_group, modality_id, catalogo,
                    discipline_id_gde, has_completed_gde, can_enroll_gde, missing_in_gde_snapshot,
                    status_gde_raw, color_gde_raw, note_gde_raw, prereqs_gde_raw, offers_gde_raw
                )
                SELECT
                    ? AS user_id,
                    COALESCE(g.code, p.d_code) AS code,
                    p.d_name AS name,
                    p.credits,
                    p.tipo,
                    p.semester,
                    p.cp_group,
                    p.cc_modality_id AS modality_id,
                    p.catalogo,
                    g.discipline_id_gde,
                    g.has_completed_gde,
                    g.can_enroll_gde,
                    g.missing_in_gde_snapshot,
                    g.status_gde_raw,
                    g.color_gde_raw,
                    g.note_gde_raw,
                    g.prereqs_gde_raw,
                    g.offers_gde_raw
                FROM picked p
                LEFT JOIN gde_overlay_raw g ON p.d_code = g.code
            """

            user_auth_conn.execute(insert_sql, (course_id, catalog_year, user_id))
            user_auth_conn.commit()

            count = user_auth_conn.execute(
                "SELECT COUNT(*) FROM user_curriculum_raw WHERE user_id = ?", (user_id,)
            ).fetchone()[0]

            logger.info(f"[RawAcquisitionService] Built user_curriculum_raw: {count} rows for user {user_id}")
            return count

        finally:
            catalog_conn.close()
            user_auth_conn.close()
