from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, Optional

from app.config.settings import get_settings
from app.utils.security import hash_password, verify_password
from alembic import command
from alembic.config import Config


def _conn() -> sqlite3.Connection:
    settings = get_settings()
    path: Path = settings.user_auth_db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _ensure_planner_courses_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS planner_courses (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            course_code TEXT NOT NULL,
            turma TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, course_code)
        )
        """
    )


def init_user_db() -> None:
    settings = get_settings()
    alembic_cfg = Config(str((Path(__file__).resolve().parents[2] / "alembic.ini").resolve()))
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{settings.user_auth_db_path}")
    command.upgrade(alembic_cfg, "head")


def get_user(username: str) -> Optional[sqlite3.Row]:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return row


def get_user_by_id(user_id: int) -> Optional[sqlite3.Row]:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return row


def update_user_password(user_id: int, password_hash: str) -> None:
    with _conn() as conn:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
        conn.commit()


def update_user_planner(user_id: int, planner_id: str) -> None:
    with _conn() as conn:
        conn.execute("UPDATE users SET planner_id = ? WHERE id = ?", (planner_id, user_id))
        conn.commit()


def update_user_snapshot(user_id: int, user_db: Dict[str, Any]) -> None:
    with _conn() as conn:
        conn.execute(
            "UPDATE users SET user_db_json = ?, user_db_updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (json.dumps(user_db or {}, ensure_ascii=False), user_id),
        )
        conn.commit()


def get_user_snapshot(user_id: int) -> tuple[Dict[str, Any], Optional[str]]:
    with _conn() as conn:
        row = conn.execute("SELECT user_db_json, user_db_updated_at FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        return {}, None
    updated_at = row["user_db_updated_at"]
    if not row["user_db_json"]:
        return {}, updated_at
    try:
        return json.loads(row["user_db_json"]) or {}, updated_at
    except Exception:
        return {}, updated_at


def create_user(username: str, password: str, planner_id: str) -> int:
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO users (username, password_hash, planner_id, user_db_json) VALUES (?, ?, ?, ?)",
            (username, hash_password(password), planner_id, json.dumps({}, ensure_ascii=False)),
        )
        conn.commit()
        return cur.lastrowid


def get_or_create_user(username: str, password: str, planner_id: str) -> int:
    existing = get_user(username)
    if existing:
        if not verify_password(password, existing["password_hash"]):
            raise ValueError("Credenciais invalidas")
        # update planner_id if changed
        if planner_id and existing["planner_id"] != planner_id:
            with _conn() as conn:
                conn.execute("UPDATE users SET planner_id = ? WHERE id = ?", (planner_id, existing["id"]))
                conn.commit()
        return int(existing["id"])
    return create_user(username, password, planner_id)


def save_attendance_overrides(user_id: int, overrides: Dict[str, Any]) -> None:
    payload = json.dumps(overrides or {}, ensure_ascii=False)
    with _conn() as conn:
        for code, data in (overrides or {}).items():
            conn.execute(
                """
                INSERT INTO attendance_overrides (user_id, course_code, overrides_json)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, course_code) DO UPDATE SET
                  overrides_json = excluded.overrides_json,
                  updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, code, json.dumps(data, ensure_ascii=False)),
            )
        conn.commit()


def load_attendance_overrides(user_id: int) -> Dict[str, Any]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT course_code, overrides_json FROM attendance_overrides WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    out: Dict[str, Any] = {}
    for row in rows:
        try:
            out[row["course_code"]] = json.loads(row["overrides_json"]) or {}
        except Exception:
            out[row["course_code"]] = {}
    return out


def save_planned_courses(user_id: int, planned: Dict[str, str]) -> None:
    with _conn() as conn:
        _ensure_planner_courses_table(conn)
        conn.execute("DELETE FROM planner_courses WHERE user_id = ?", (user_id,))
        rows = []
        for code, turma in (planned or {}).items():
            if not code:
                continue
            rows.append((user_id, code, turma or ""))
        if rows:
            conn.executemany(
                "INSERT INTO planner_courses (user_id, course_code, turma, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                rows,
            )
        conn.commit()


def load_planned_courses(user_id: int) -> Dict[str, str]:
    with _conn() as conn:
        _ensure_planner_courses_table(conn)
        rows = conn.execute(
            "SELECT course_code, turma FROM planner_courses WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return {row["course_code"]: row["turma"] or "" for row in rows}
