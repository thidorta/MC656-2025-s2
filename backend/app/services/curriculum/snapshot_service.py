"""
SnapshotService - Phase 3 Logic
Assembles final denormalized snapshot for API and planner datasets.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

from app.utils.logging_setup import logger


def _utcnow_iso() -> str:
    """Return current UTC timestamp in ISO-8601."""
    return datetime.now(tz=timezone.utc).isoformat()


def _extract_professor_from_payload(payload: Optional[dict]) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    for key in ("professor", "docente", "teacher"):
        value = payload.get(key)
        if isinstance(value, str):
            stripped = value.strip()
            if stripped:
                return stripped
    professores = payload.get("professores")
    if isinstance(professores, list):
        for entry in professores:
            if isinstance(entry, dict):
                name = entry.get("nome")
                if isinstance(name, str) and name.strip():
                    return name.strip()
    return None


class SnapshotService:
    """Service for building final curriculum snapshot."""

    def __init__(self, user_auth_db_path: Path):
        self.user_auth_db_path = user_auth_db_path

    def rebuild_user_curriculum_snapshot(self, user_id: int) -> int:
        """Build unified snapshot from Phase 1 + Phase 2 for a specific user."""
        conn = sqlite3.connect(str(self.user_auth_db_path))
        conn.row_factory = sqlite3.Row
        
        try:
            # Verify inputs
            count_p1 = conn.execute("SELECT COUNT(*) FROM user_curriculum_normalized").fetchone()[0]
            count_p2 = conn.execute("SELECT COUNT(*) FROM user_curriculum_tree").fetchone()[0]
            
            if count_p1 == 0 or count_p2 == 0:
                raise ValueError("Phase 1 or Phase 2 data missing")
            
            # Drop and recreate snapshot table
            conn.execute("DROP TABLE IF EXISTS user_curriculum_snapshot")
            conn.execute("""
                CREATE TABLE user_curriculum_snapshot (
                    user_id TEXT NOT NULL,
                    code TEXT NOT NULL,
                    name TEXT NOT NULL,
                    credits INTEGER,
                    course_type TEXT,
                    recommended_semester INTEGER,
                    cp_group TEXT,
                    catalog_year INTEGER,
                    modality_id INTEGER,
                    course_id INTEGER,
                    
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
                    
                    prereq_list TEXT,
                    children_list TEXT,
                    depth INTEGER NOT NULL,
                    color_hex TEXT NOT NULL,
                    graph_position TEXT,
                    order_index INTEGER,
                    
                    PRIMARY KEY (user_id, code)
                )
            """)
            
            # Join Phase 1 + Phase 2
            query = """
            SELECT
                p1.user_id,
                p1.code,
                p1.name,
                p1.credits,
                p1.course_type,
                p1.recommended_semester,
                p1.cp_group,
                p1.catalog_year,
                p1.modality_id,
                p1.course_id,
                
                p1.gde_discipline_id,
                p1.gde_has_completed,
                p1.gde_plan_status,
                p1.gde_can_enroll,
                p1.gde_prereqs_raw,
                p1.gde_offers_raw,
                p1.gde_color_raw,
                p1.gde_plan_status_raw,
                
                p1.is_completed,
                p1.prereq_status,
                p1.is_eligible,
                p1.is_offered,
                p1.final_status,
                
                p2.parents AS prereq_list,
                p2.children AS children_list,
                p2.depth_level AS depth,
                p2.color_tree AS color_hex
            FROM user_curriculum_normalized p1
            LEFT JOIN user_curriculum_tree p2
                ON p1.user_id = p2.user_id AND p1.code = p2.code
            WHERE p1.user_id = ?
            """
            
            cur = conn.execute(query, (str(user_id),))
            rows = cur.fetchall()
            
            if not rows:
                raise ValueError("JOIN returned no rows")
            
            # Insert into snapshot
            for idx, row in enumerate(rows):
                depth = row['depth'] if row['depth'] is not None else 0
                order_index = idx
                graph_position = json.dumps({"x": depth * 100, "y": order_index * 80})
                
                conn.execute("""
                    INSERT INTO user_curriculum_snapshot (
                        user_id, code, name, credits, course_type, recommended_semester, cp_group,
                        catalog_year, modality_id, course_id,
                        gde_discipline_id, gde_has_completed, gde_plan_status, gde_can_enroll,
                        gde_prereqs_raw, gde_offers_raw, gde_color_raw, gde_plan_status_raw,
                        is_completed, prereq_status, is_eligible, is_offered, final_status,
                        prereq_list, children_list, depth, color_hex, graph_position, order_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    row['user_id'], row['code'], row['name'], row['credits'], row['course_type'],
                    row['recommended_semester'], row['cp_group'], row['catalog_year'], row['modality_id'], row['course_id'],
                    row['gde_discipline_id'], row['gde_has_completed'], row['gde_plan_status'],
                    row['gde_can_enroll'], row['gde_prereqs_raw'], row['gde_offers_raw'],
                    row['gde_color_raw'], row['gde_plan_status_raw'],
                    row['is_completed'], row['prereq_status'], row['is_eligible'],
                    row['is_offered'], row['final_status'],
                    row['prereq_list'] or '[]', row['children_list'] or '[]',
                    depth, row['color_hex'] if row['color_hex'] else '#CCCCCC',
                    graph_position, order_index
                ))
            
            # Update graph_position to proper tree layout
            # Group by depth and assign y positions within each depth
            depths = conn.execute("SELECT DISTINCT depth FROM user_curriculum_snapshot ORDER BY depth").fetchall()
            for depth_row in depths:
                d = depth_row[0]
                courses_in_depth = conn.execute(
                    "SELECT code FROM user_curriculum_snapshot WHERE depth = ? ORDER BY order_index", (d,)
                ).fetchall()
                for i, course_row in enumerate(courses_in_depth):
                    y_pos = i * 80
                    new_pos = json.dumps({"x": d * 100, "y": y_pos})
                    conn.execute(
                        "UPDATE user_curriculum_snapshot SET graph_position = ? WHERE code = ? AND depth = ?",
                        (new_pos, course_row[0], d)
                    )
            
            conn.commit()
            offers_count, events_count = self._rebuild_course_offers(conn, user_id)
            count = len(rows)
            logger.info(
                f"[SnapshotService] Built snapshot with {count} nodes and backfilled "
                f"{offers_count} offers / {events_count} events for user {user_id}"
            )
            return count

        finally:
            conn.close()

    def _rebuild_course_offers(self, conn: sqlite3.Connection, user_id: int) -> Tuple[int, int]:
        """Rebuild course_offers + offer_schedule_events from Phase 2 tree data."""
        try:
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('course_offers','offer_schedule_events')"
            ).fetchall()
            if len(tables) < 2:
                logger.warning("[SnapshotService] Planner tables missing; skipping offer backfill")
                return 0, 0
        except Exception:
            return 0, 0

        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            "DELETE FROM offer_schedule_events WHERE offer_id IN (SELECT id FROM course_offers WHERE user_id = ?)",
            (user_id,),
        )
        conn.execute("DELETE FROM course_offers WHERE user_id = ?", (user_id,))

        rows = conn.execute(
            """
            SELECT code, gde_offers_raw
            FROM user_curriculum_tree
            WHERE user_id = ? AND gde_offers_raw IS NOT NULL AND gde_offers_raw <> ''
            """,
            (str(user_id),),
        ).fetchall()

        offers_inserted = 0
        events_inserted = 0
        seen_keys: set[Tuple[str, str, Optional[str], Optional[str]]] = set()
        timestamp = _utcnow_iso()

        for row in rows:
            raw_offers = row["gde_offers_raw"]
            if not raw_offers or raw_offers.strip() in ("[]", "null"):
                continue
            try:
                offers = json.loads(raw_offers)
            except Exception:
                continue
            if not isinstance(offers, list):
                continue

            for offer in offers:
                if not isinstance(offer, dict):
                    continue
                turma = (offer.get("turma") or "").strip()
                external_id = offer.get("id")
                professor_name = _extract_professor_from_payload(offer)
                key = (
                    row["code"],
                    turma,
                    str(external_id) if external_id is not None else None,
                    professor_name,
                )
                if key in seen_keys:
                    continue
                seen_keys.add(key)

                metadata = {
                    k: v for k, v in offer.items() if k not in {"events", "turma", "id", "adicionado"}
                }
                if professor_name and "professor" not in metadata:
                    metadata["professor"] = professor_name
                semester_value = metadata.get("semester")
                cur = conn.execute(
                    """
                    INSERT INTO course_offers (
                        curriculum_discipline_id,
                        user_id,
                        snapshot_id,
                        codigo,
                        turma,
                        offer_external_id,
                        semester,
                        source,
                        offer_metadata,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        None,
                        user_id,
                        None,
                        row["code"],
                        turma or "",
                        str(external_id) if external_id is not None else None,
                        semester_value,
                        "phase3_backfill",
                        json.dumps(metadata, ensure_ascii=False),
                        timestamp,
                    ),
                )
                offer_id = cur.lastrowid
                offers_inserted += 1

                events = offer.get("events") or []
                for event in events:
                    if not isinstance(event, dict):
                        continue
                    start_iso = event.get("start")
                    end_iso = event.get("end")
                    if not start_iso or not end_iso:
                        continue
                    day_of_week = event.get("day")
                    start_hour = event.get("start_hour")
                    end_hour = event.get("end_hour")
                    try:
                        if day_of_week is None or start_hour is None:
                            start_dt = datetime.fromisoformat(str(start_iso).replace("Z", "+00:00"))
                            if day_of_week is None:
                                day_of_week = start_dt.weekday()
                            if start_hour is None:
                                start_hour = start_dt.hour
                        if end_hour is None:
                            end_dt = datetime.fromisoformat(str(end_iso).replace("Z", "+00:00"))
                            end_hour = end_dt.hour
                    except Exception:
                        pass
                    if day_of_week is None:
                        continue
                    conn.execute(
                        """
                        INSERT INTO offer_schedule_events (
                            offer_id,
                            start_datetime,
                            end_datetime,
                            day_of_week,
                            start_hour,
                            end_hour,
                            location,
                            title,
                            is_biweekly
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                        """,
                        (
                            offer_id,
                            start_iso,
                            end_iso,
                            int(day_of_week),
                            int(start_hour) if start_hour is not None else 0,
                            int(end_hour) if end_hour is not None else 0,
                            event.get("location"),
                            event.get("title"),
                        ),
                    )
                    events_inserted += 1

        conn.commit()
        return offers_inserted, events_inserted
