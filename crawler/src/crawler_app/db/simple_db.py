# Delegate to existing implementation to keep behavior while consolidating API
from __future__ import annotations
import sqlite3
from pathlib import Path
from typing import Optional

SCHEMA_PATH = Path(__file__).with_name("simple_schema.sql")


def get_conn(db_path: str | None) -> sqlite3.Connection:
    """Open a SQLite connection with useful pragmas."""
    db_path = db_path or ":memory:"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def ensure_schema(conn: sqlite3.Connection, schema_file: Optional[str] = None) -> None:
    path = Path(schema_file) if schema_file else SCHEMA_PATH
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    conn.executescript(sql)
    conn.commit()


# -------------------- UPSERT helpers (dimensões) --------------------

def upsert_curso(conn: sqlite3.Connection, *, id_curso: int, numero: int, nivel: str, nome: Optional[str]) -> None:
    conn.execute(
        """
        INSERT INTO gde_cursos (id_curso, numero, nivel, nome)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id_curso) DO UPDATE SET
          numero=excluded.numero,
          nivel=excluded.nivel,
          nome =excluded.nome
        """,
        (id_curso, numero, nivel, nome),
    )


def upsert_disciplina(
    conn: sqlite3.Connection,
    *,
    id_disciplina: int,
    sigla: str,
    nome: Optional[str] = None,
    creditos: Optional[int] = None,
    nivel: Optional[str] = None,
    periodicidade: Optional[int] = None,
    parte: int = 0,
    ementa: Optional[str] = None,
    bibliografia: Optional[str] = None,
    quinzenal: int = 0,
    id_instituto: Optional[int] = None,
    cursacoes: int = 0,
    reprovacoes: int = 0,
    max_reprovacoes: int = 0,
) -> None:
    conn.execute(
        """
        INSERT INTO gde_disciplinas (
            id_disciplina, sigla, nome, creditos, nivel, periodicidade, parte, ementa, bibliografia,
            quinzenal, id_instituto, cursacoes, reprovacoes, max_reprovacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id_disciplina) DO UPDATE SET
            sigla=excluded.sigla,
            nome=excluded.nome,
            creditos=excluded.creditos,
            nivel=excluded.nivel,
            periodicidade=excluded.periodicidade,
            parte=excluded.parte,
            ementa=excluded.ementa,
            bibliografia=excluded.bibliografia,
            quinzenal=excluded.quinzenal,
            id_instituto=excluded.id_instituto,
            cursacoes=excluded.cursacoes,
            reprovacoes=excluded.reprovacoes,
            max_reprovacoes=excluded.max_reprovacoes
        """,
        (
            id_disciplina,
            sigla,
            nome,
            creditos,
            nivel,
            periodicidade,
            parte,
            ementa,
            bibliografia,
            quinzenal,
            id_instituto,
            cursacoes,
            reprovacoes,
            max_reprovacoes,
        ),
    )


# -------------------- UPSERT helper (ligação) --------------------

def upsert_curso_disciplina(
    conn: sqlite3.Connection,
    *,
    id_curso: int,
    id_disciplina: int,
    catalogo: int,
    modalidade: str,
    periodo: str,
    tipo: str | None = None,
    semestre: int | None = None,
) -> None:
    """Cria/atualiza o vínculo entre curso e disciplina para um dado contexto."""
    conn.execute(
        """
        INSERT INTO gde_cursos_disciplinas (
            id_curso, id_disciplina, catalogo, modalidade, periodo, tipo, semestre
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id_curso, id_disciplina, catalogo, modalidade, periodo)
        DO UPDATE SET
            tipo     = excluded.tipo,
            semestre = excluded.semestre
        """,
        (id_curso, id_disciplina, catalogo, modalidade, periodo, tipo, semestre),
    )


def commit(conn: sqlite3.Connection) -> None:
    conn.commit()
