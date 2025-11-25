from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from fastapi import HTTPException

from app.config.settings import Settings


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS planner_original (
    planner_id TEXT PRIMARY KEY,
    semester TEXT,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planner_modified (
    planner_id TEXT PRIMARY KEY,
    semester TEXT,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planner_events (
    planner_id TEXT NOT NULL,
    codigo TEXT NOT NULL,
    nome TEXT,
    creditos INTEGER,
    semestre INTEGER,
    quinzenal INTEGER,
    start_iso TEXT NOT NULL,
    end_iso TEXT NOT NULL,
    local TEXT,
    turma TEXT,
    offer_id INTEGER,
    PRIMARY KEY (planner_id, codigo, start_iso, end_iso)
);

CREATE INDEX IF NOT EXISTS idx_planner_events_planner ON planner_events(planner_id);
"""


def _utcnow() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)
    conn.commit()


def _extract_semester(payload: Dict[str, Any]) -> str:
    for key in (
        ("current_period",),
        ("planejado", "periodo"),
        ("parameters", "periodo"),
    ):
        ref = payload
        for part in key:
            if isinstance(ref, dict) and part in ref:
                ref = ref.get(part)
            else:
                ref = None
                break
        if ref:
            return str(ref)
    return ""


def _load_user_db_payload(planner_id: str, user_db_root: Path) -> Tuple[Dict[str, Any], str]:
    target_dir = user_db_root / str(planner_id)
    if not target_dir.exists():
        raise HTTPException(status_code=404, detail="Planner snapshot not found on disk")
    candidates = sorted(target_dir.glob("course_*.json"))
    if not candidates:
        raise HTTPException(status_code=404, detail="No course files for this planner")
    data = json.loads(candidates[0].read_text(encoding="utf-8"))
    semester = _extract_semester(data)
    return data, semester


class PlannerStore:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.db_path = settings.planner_db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        _ensure_schema(self.conn)

    def close(self) -> None:
        self.conn.close()

    def load(self, planner_id: str) -> Dict[str, Any]:
        original = self._fetch_one("planner_original", planner_id)
        modified = self._fetch_one("planner_modified", planner_id)
        return {
            "planner_id": planner_id,
            "original": original,
            "modified": modified,
        }

    def refresh_from_user_db(self, planner_id: str) -> Dict[str, Any]:
        payload, semester = _load_user_db_payload(planner_id, self.settings.user_db_root)
        self._upsert("planner_original", planner_id, semester, payload)
        existing_modified = self._fetch_one("planner_modified", planner_id)
        if existing_modified and existing_modified.get("semester") == semester:
            payload_mod = dict(payload)
            planned_codes = None
            try:
                planned_codes = existing_modified.get("payload", {}).get("planned_codes")
            except Exception:
                planned_codes = None
            if planned_codes is not None:
                payload_mod["planned_codes"] = planned_codes
            self._upsert("planner_modified", planner_id, semester, payload_mod)
        else:
            self._upsert("planner_modified", planner_id, semester, payload)
        self._persist_events(planner_id, payload)
        return self.load(planner_id)

    def save_modified(self, planner_id: str, payload: Dict[str, Any], semester: Optional[str] = None) -> Dict[str, Any]:
        sem = semester or _extract_semester(payload)
        self._upsert("planner_modified", planner_id, sem, payload)
        self._persist_events(planner_id, payload)
        return self.load(planner_id)

    # ---------------- internal helpers ----------------

    def _fetch_one(self, table: str, planner_id: str) -> Optional[Dict[str, Any]]:
        row = self.conn.execute(
            f"SELECT planner_id, semester, payload, updated_at FROM {table} WHERE planner_id = ?",
            (planner_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "planner_id": row["planner_id"],
            "semester": row["semester"],
            "payload": json.loads(row["payload"]),
            "updated_at": row["updated_at"],
        }

    def _payload_has_offers(self, payload: Optional[Dict[str, Any]]) -> bool:
        if not payload:
            return False
        curriculum = payload.get("curriculum") if isinstance(payload, dict) else None
        if not isinstance(curriculum, list):
            return False
        return any(isinstance(c, dict) and c.get("offers") for c in curriculum)

    def _persist_events(self, planner_id: str, payload: Dict[str, Any]) -> None:
        curriculum = payload.get("curriculum") if isinstance(payload, dict) else None
        if not isinstance(curriculum, list):
            return
        self.conn.execute("DELETE FROM planner_events WHERE planner_id = ?", (planner_id,))
        rows: list[tuple] = []
        for c in curriculum:
            if not isinstance(c, dict):
                continue
            code = c.get("codigo") or c.get("sigla")
            if not code:
                continue
            nome = c.get("nome")
            creditos = c.get("creditos") if isinstance(c.get("creditos"), int) else None
            try:
                semestre = int(c.get("semestre")) if c.get("semestre") is not None else None
            except Exception:
                semestre = None
            quinzenal = 1 if c.get("quinzenal") else 0 if c.get("quinzenal") is not None else None
            offers = c.get("offers") if isinstance(c.get("offers"), list) else []
            for offer in offers:
                if not isinstance(offer, dict):
                    continue
                turma = offer.get("turma")
                offer_id = offer.get("id")
                events = offer.get("events") if isinstance(offer.get("events"), list) else []
                for ev in events:
                    if not isinstance(ev, dict):
                        continue
                    start_iso = ev.get("start")
                    end_iso = ev.get("end")
                    if not start_iso or not end_iso:
                        continue
                    title = ev.get("title") or ""
                    local = None
                    parts = str(title).split()
                    if parts:
                        local = parts[-1]
                    rows.append(
                        (
                            planner_id,
                            str(code),
                            nome,
                            creditos,
                            semestre,
                            quinzenal,
                            str(start_iso),
                            str(end_iso),
                            local,
                            turma,
                            offer_id if isinstance(offer_id, int) else None,
                        )
                    )
        if rows:
            self.conn.executemany(
                """
                INSERT OR REPLACE INTO planner_events (
                    planner_id, codigo, nome, creditos, semestre, quinzenal,
                    start_iso, end_iso, local, turma, offer_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
        self.conn.commit()

    def _upsert(self, table: str, planner_id: str, semester: str, payload: Dict[str, Any]) -> None:
        ts = _utcnow()
        self.conn.execute(
            f"""
            INSERT INTO {table} (planner_id, semester, payload, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(planner_id) DO UPDATE SET
              semester = excluded.semester,
              payload = excluded.payload,
              updated_at = excluded.updated_at
            """,
            (planner_id, semester, json.dumps(payload, ensure_ascii=False), ts),
        )
        self.conn.commit()
