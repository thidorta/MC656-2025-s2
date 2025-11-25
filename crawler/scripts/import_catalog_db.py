from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, Tuple


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG_DIR = ROOT / "data" / "catalog_db"
DEFAULT_DB_PATH = ROOT / "data" / "db" / "catalog.db"
SCHEMA_PATH = ROOT / "src" / "crawler_app" / "db" / "catalog_schema.sql"


def iter_catalog_files(catalog_dir: Path) -> Iterator[Tuple[int, Path]]:
    """Yield (year, data_path) pairs for every modality JSON found."""
    if not catalog_dir.exists():
        raise FileNotFoundError(f"Catalog directory not found: {catalog_dir}")

    for year_dir in sorted(p for p in catalog_dir.iterdir() if p.is_dir()):
        try:
            year = int(year_dir.name)
        except ValueError:
            continue
        for course_dir in sorted(p for p in year_dir.iterdir() if p.is_dir()):
            for modality_dir in sorted(p for p in course_dir.iterdir() if p.is_dir()):
                data_path = modality_dir / "data.json"
                if data_path.is_file():
                    yield year, data_path


def load_schema(conn: sqlite3.Connection) -> None:
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema_sql)


def normalize_course_code(course: Dict[str, Any]) -> str:
    code = course.get("code") or course.get("codigo")
    if code:
        return str(code)
    return str(course.get("id"))


def upsert_course(conn: sqlite3.Connection, course_obj: Dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO catalog_course (id, code, name)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name
        """,
        (
            int(course_obj["id"]),
            normalize_course_code(course_obj),
            course_obj.get("name") or course_obj.get("nome") or str(course_obj["id"]),
        ),
    )


def get_modality_id(conn: sqlite3.Connection, course_id: int, code: str, label: str | None) -> int:
    conn.execute(
        """
        INSERT INTO catalog_modality (course_id, code, label)
        VALUES (?, ?, ?)
        ON CONFLICT(course_id, code) DO UPDATE SET label=COALESCE(excluded.label, catalog_modality.label)
        """,
        (course_id, code or "", label),
    )
    return conn.execute(
        "SELECT modality_id FROM catalog_modality WHERE course_id = ? AND code = ?",
        (course_id, code or ""),
    ).fetchone()[0]


def upsert_discipline(conn: sqlite3.Connection, discipline: Dict[str, Any]) -> int:
    code = discipline.get("codigo") or discipline.get("code")
    if not code:
        raise ValueError("Discipline missing code")
    name = discipline.get("nome") or discipline.get("name") or code
    credits = discipline.get("creditos")
    conn.execute(
        """
        INSERT INTO discipline (dac_id, code, name, default_credits)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
            dac_id = COALESCE(excluded.dac_id, discipline.dac_id),
            name = excluded.name,
            default_credits = COALESCE(excluded.default_credits, discipline.default_credits)
        """,
        (
            discipline.get("disciplina_id"),
            code,
            name,
            credits if isinstance(credits, int) else None,
        ),
    )
    row = conn.execute("SELECT discipline_id FROM discipline WHERE code = ?", (code,)).fetchone()
    return int(row[0])


def insert_curriculum(
    conn: sqlite3.Connection,
    modality_id: int,
    record: Dict[str, Any],
) -> int:
    params = record.get("parameters") or {}
    conn.execute(
        """
        INSERT INTO catalog_curriculum (modality_id, year, catalogo, periodo, cp)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(modality_id, year) DO UPDATE SET
            catalogo = excluded.catalogo,
            periodo = excluded.periodo,
            cp = excluded.cp
        """,
        (
            modality_id,
            int(record.get("year")),
            str(params.get("catalogo", record.get("year"))),
            str(params.get("periodo", "")),
            str(params.get("cp", "")),
        ),
    )
    row = conn.execute(
        "SELECT curriculum_id FROM catalog_curriculum WHERE modality_id = ? AND year = ?",
        (modality_id, int(record.get("year"))),
    ).fetchone()
    return int(row[0])


DISCIPLINE_BASE_KEYS = {
    "disciplina_id",
    "codigo",
    "nome",
    "creditos",
    "catalogo",
    "tipo",
    "semestre",
    "modalidade",
    "prereqs",
    "cp_group",
    "status",
    "missing",
    "tem",
    "pode",
    "obs",
    "color",
    "offers",
}


def insert_curriculum_entry(
    conn: sqlite3.Connection,
    curriculum_id: int,
    discipline_id: int,
    entry: Dict[str, Any],
) -> int:
    metadata = {k: v for k, v in entry.items() if k not in DISCIPLINE_BASE_KEYS}
    metadata_json = json.dumps(metadata, ensure_ascii=False) if metadata else None
    cursor = conn.execute(
        """
        INSERT INTO curriculum_entry (
            curriculum_id,
            discipline_id,
            catalogo,
            tipo,
            semester,
            credits,
            modality_code,
            cp_group,
            status,
            missing,
            tem,
            pode,
            obs,
            color,
            metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            curriculum_id,
            discipline_id,
            int(entry.get("catalogo", 0)),
            entry.get("tipo"),
            entry.get("semestre"),
            entry.get("creditos"),
            entry.get("modalidade") or "",
            entry.get("cp_group"),
            entry.get("status"),
            1 if entry.get("missing") else 0,
            1 if entry.get("tem") else 0 if entry.get("tem") is not None else None,
            1 if entry.get("pode") else 0 if entry.get("pode") is not None else None,
            entry.get("obs"),
            entry.get("color"),
            metadata_json,
        ),
    )
    return int(cursor.lastrowid)


def insert_prereqs(conn: sqlite3.Connection, entry_id: int, prereqs: Iterable[Iterable[str]]) -> None:
    for idx, group in enumerate(prereqs, start=1):
        group_cursor = conn.execute(
            "INSERT INTO prereq_group (entry_id, group_order) VALUES (?, ?)",
            (entry_id, idx),
        )
        group_id = int(group_cursor.lastrowid)
        for ridx, code in enumerate(group, start=1):
            conn.execute(
                "INSERT INTO prereq_requirement (group_id, requirement_order, required_code) VALUES (?, ?, ?)",
                (group_id, ridx, code),
            )


def import_catalog(catalog_dir: Path, db_path: Path) -> None:
    if db_path.exists():
        db_path.unlink()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        load_schema(conn)

        total_curricula = 0
        total_entries = 0

        for _, data_path in iter_catalog_files(catalog_dir):
            record = json.loads(data_path.read_text(encoding="utf-8"))
            course_obj = record["course"]
            upsert_course(conn, course_obj)

            modality_code = record.get("modalidade") or ""
            modality_id = get_modality_id(
                conn,
                int(course_obj["id"]),
                modality_code,
                record.get("modalidade_label"),
            )
            curriculum_id = insert_curriculum(conn, modality_id, record)
            total_curricula += 1

            for entry in record.get("disciplines", []):
                if not entry.get("codigo"):
                    continue
                discipline_id = upsert_discipline(conn, entry)
                entry_id = insert_curriculum_entry(conn, curriculum_id, discipline_id, entry)
                prereqs = entry.get("prereqs") or []
                insert_prereqs(conn, entry_id, prereqs)
                total_entries += 1

        conn.commit()
        print(f"[import] Completed: {total_curricula} curricula, {total_entries} entries -> {db_path}")
    finally:
        conn.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import catalog JSON files into SQLite.")
    parser.add_argument("--catalog-root", type=Path, default=DEFAULT_CATALOG_DIR, help="Path to crawler/data/catalog_db")
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH, help="Destination SQLite path")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    import_catalog(args.catalog_root, args.db_path)


if __name__ == "__main__":
    main()
