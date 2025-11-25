from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional

from fastapi import Depends, HTTPException

from app.config.settings import get_settings, Settings


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def open_catalog_connection(settings: Settings) -> sqlite3.Connection:
    conn = sqlite3.connect(settings.catalog_db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def catalog_connection(settings: Settings):
    conn = open_catalog_connection(settings)
    try:
        yield conn
    finally:
        conn.close()


class CatalogRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.conn = connection

    def list_courses(self) -> List[Dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT id, code AS codigo, name AS nome
            FROM catalog_course
            ORDER BY codigo
            """
        ).fetchall()
        return [
            {
                "id": row["id"],
                "codigo": row["codigo"],
                "nome": row["nome"],
            }
            for row in rows
        ]

    def get_course_by_id(self, course_id: int) -> Optional[Dict[str, Any]]:
        row = self.conn.execute(
            "SELECT id, code AS codigo, name AS nome FROM catalog_course WHERE id = ?",
            (course_id,),
        ).fetchone()
        return _row_to_dict(row) if row else None

    def get_course_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        row = self.conn.execute(
            """
            SELECT id, code AS codigo, name AS nome
            FROM catalog_course
            WHERE UPPER(code) = UPPER(?)
            """,
            (code,),
        ).fetchone()
        return _row_to_dict(row) if row else None

    def list_curriculums(self) -> List[Dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT
                c.id AS course_id,
                c.code AS course_code,
                c.name AS course_name,
                m.modality_id,
                m.code AS modality_code,
                m.label AS modality_label,
                cur.curriculum_id,
                cur.year
            FROM catalog_curriculum cur
            JOIN catalog_modality m ON m.modality_id = cur.modality_id
            JOIN catalog_course c ON c.id = m.course_id
            ORDER BY c.id, cur.year DESC, modality_code
            """
        ).fetchall()

        grouped: Dict[int, Dict[str, Any]] = {}
        for row in rows:
            course_entry = grouped.setdefault(
                row["course_id"],
                {
                    "course_id": row["course_id"],
                    "course_code": row["course_code"],
                    "course_name": row["course_name"],
                    "options": [],
                },
            )
            course_entry["options"].append(
                {
                    "curriculum_id": row["curriculum_id"],
                    "year": row["year"],
                    "modalidade": row["modality_code"],
                    "modalidade_label": row["modality_label"],
                }
            )
        return list(grouped.values())

    def get_curriculum(
        self,
        course_id: int,
        year: Optional[int] = None,
        modality_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        query = [
            """
            SELECT
                cur.curriculum_id,
                cur.year,
                cur.catalogo,
                cur.periodo,
                cur.cp,
                m.code AS modalidade,
                m.label AS modalidade_label,
                c.id AS course_id,
                c.code AS course_code,
                c.name AS course_name
            FROM catalog_curriculum cur
            JOIN catalog_modality m ON m.modality_id = cur.modality_id
            JOIN catalog_course c ON c.id = m.course_id
            WHERE c.id = ?
            """
        ]
        params: List[Any] = [course_id]
        if year is not None:
            query.append("AND cur.year = ?")
            params.append(year)
        if modality_code:
            query.append("AND UPPER(m.code) = UPPER(?)")
            params.append(modality_code)
        query.append("ORDER BY cur.year DESC, m.code ASC LIMIT 1")

        row = self.conn.execute(" ".join(query), params).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Curriculum not found")

        curriculum_id = row["curriculum_id"]
        disciplines = self._fetch_disciplines(curriculum_id)
        mandatory = [d for d in disciplines if (d.get("tipo") or "").lower() == "obrigatoria"]
        elective = [d for d in disciplines if (d.get("tipo") or "").lower() != "obrigatoria"]

        return {
            "curriculum_id": curriculum_id,
            "course": {
                "id": row["course_id"],
                "codigo": row["course_code"],
                "nome": row["course_name"],
            },
            "year": row["year"],
            "modalidade": row["modalidade"],
            "modalidade_label": row["modalidade_label"],
            "parameters": {
                "catalogo": row["catalogo"],
                "periodo": row["periodo"],
                "cp": row["cp"],
            },
            "disciplinas_obrigatorias": mandatory,
            "disciplinas_eletivas": elective,
            "disciplines": disciplines,
        }

    def _fetch_disciplines(self, curriculum_id: int) -> List[Dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT
                ce.entry_id,
                ce.catalogo,
                ce.tipo,
                ce.semester,
                ce.credits,
                ce.modality_code,
                ce.cp_group,
                ce.status,
                ce.missing,
                ce.tem,
                ce.pode,
                ce.obs,
                ce.color,
                ce.metadata,
                d.dac_id,
                d.code,
                d.name,
                d.default_credits
            FROM curriculum_entry ce
            JOIN discipline d ON d.discipline_id = ce.discipline_id
            WHERE ce.curriculum_id = ?
            ORDER BY (ce.semester IS NULL), ce.semester, d.code
            """,
            (curriculum_id,),
        ).fetchall()

        entry_ids = [row["entry_id"] for row in rows]
        prereq_map = self._fetch_prereqs(entry_ids) if entry_ids else {}

        disciplines: List[Dict[str, Any]] = []
        for row in rows:
            metadata = row["metadata"]
            metadata_dict = json.loads(metadata) if metadata else {}

            record = {
                "disciplina_id": row["dac_id"],
                "codigo": row["code"],
                "nome": row["name"],
                "creditos": row["credits"] if row["credits"] is not None else row["default_credits"],
                "catalogo": row["catalogo"],
                "tipo": row["tipo"],
                "semestre": row["semester"],
                "modalidade": row["modality_code"],
                "cp_group": row["cp_group"],
                "status": row["status"],
                "missing": bool(row["missing"]) if row["missing"] is not None else None,
                "tem": bool(row["tem"]) if row["tem"] is not None else None,
                "pode": bool(row["pode"]) if row["pode"] is not None else None,
                "obs": row["obs"],
                "color": row["color"],
                "metadata": metadata_dict,
                "prereqs": prereq_map.get(row["entry_id"], []),
            }
            disciplines.append(record)
        return disciplines

    def _fetch_prereqs(self, entry_ids: Iterable[int]) -> Dict[int, List[List[str]]]:
        placeholders = ",".join(["?"] * len(entry_ids))
        if not placeholders:
            return {}
        rows = self.conn.execute(
            f"""
            SELECT
                pg.entry_id,
                pg.group_id,
                pg.group_order,
                pr.requirement_order,
                pr.required_code
            FROM prereq_group pg
            JOIN prereq_requirement pr ON pr.group_id = pg.group_id
            WHERE pg.entry_id IN ({placeholders})
            ORDER BY pg.entry_id, pg.group_order, pr.requirement_order
            """,
            list(entry_ids),
        ).fetchall()

        prereq_map: Dict[int, Dict[int, List[str]]] = {}
        for row in rows:
            entry_dict = prereq_map.setdefault(row["entry_id"], {})
            group_list = entry_dict.setdefault(row["group_order"], [])
            group_list.append(row["required_code"])

        normalized: Dict[int, List[List[str]]] = {}
        for entry_id, groups in prereq_map.items():
            ordered_groups = [groups[key] for key in sorted(groups.keys()) if groups[key]]
            normalized[entry_id] = ordered_groups
        return normalized


def get_catalog_repo(
    settings: Settings = Depends(get_settings),
):
    with catalog_connection(settings) as conn:
        yield CatalogRepository(conn)
