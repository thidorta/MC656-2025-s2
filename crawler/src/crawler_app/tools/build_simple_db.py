from __future__ import annotations
import json
import os
from glob import glob
from pathlib import Path

from ..db.simple_db import (
    get_conn,
    ensure_schema,
    upsert_curso,
    upsert_disciplina,
    upsert_curso_disciplina,
    commit,
)

BASE_DIR = Path(__file__).resolve().parents[3]  # project root (crawler)
DATA_DIR = BASE_DIR / "data"
JSON_DIR = DATA_DIR / "json"
DB_DIR = DATA_DIR / "db"
DB_PATH = DB_DIR / "gde_simple.db"

# Defaults/assumptions for fields missing in JSON
DEFAULT_NIVEL_CURSO = "G"
DEFAULT_NIVEL_DISC = None


def load_json_payloads() -> list[dict]:
    files = sorted(glob((JSON_DIR / "*.json").as_posix()))
    payloads: list[dict] = []
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            payloads.append(json.load(f))
    return payloads


def main() -> None:
    os.makedirs(DB_DIR.as_posix(), exist_ok=True)

    conn = get_conn(DB_PATH.as_posix())
    # Use default schema path from crawler_app.db.simple_db
    ensure_schema(conn)

    payloads = load_json_payloads()
    if not payloads:
        print("Nenhum JSON encontrado em data/json - rode o coletor primeiro.")
        return

    seen_cursos: set[int] = set()

    for p in payloads:
        numero_curso = int(p.get("numero_curso"))
        nome_curso = p.get("curso")
        catalogo = int(p.get("catalogo")) if str(p.get("catalogo", "")).isdigit() else None
        modalidade = str(p.get("modalidade") or "").strip()
        periodo = str(p.get("periodo") or "").strip()

        if numero_curso not in seen_cursos:
            upsert_curso(
                conn,
                id_curso=numero_curso,
                numero=numero_curso,
                nivel=DEFAULT_NIVEL_CURSO,
                nome=nome_curso,
            )
            seen_cursos.add(numero_curso)

        for d in p.get("disciplinas", []):
            try:
                id_disc = int(d["disciplina_id"]) if isinstance(d["disciplina_id"], (int, str)) else None
            except Exception:
                continue

            upsert_disciplina(
                conn,
                id_disciplina=id_disc,
                sigla=str(d.get("codigo") or "").strip(),
                nome=d.get("nome"),
                creditos=int(d["creditos"]) if str(d.get("creditos", "")).isdigit() else None,
                nivel=DEFAULT_NIVEL_DISC,
                periodicidade=None,
                parte=0,
                ementa=None,
                bibliografia=None,
                quinzenal=0,
                id_instituto=None,
                cursacoes=0,
                reprovacoes=0,
                max_reprovacoes=0,
            )

            tipo = d.get("tipo")
            try:
                semestre_ctx = int(d.get("semestre")) if str(d.get("semestre", "")).isdigit() else None
            except Exception:
                semestre_ctx = None

            upsert_curso_disciplina(
                conn,
                id_curso=numero_curso,
                id_disciplina=id_disc,
                catalogo=catalogo if catalogo is not None else 0,
                modalidade=modalidade or "",
                periodo=periodo or "",
                tipo=tipo,
                semestre=semestre_ctx,
            )

    commit(conn)
    conn.close()
    print(f"OK - Banco criado/populado em: {DB_PATH}")


if __name__ == "__main__":
    main()
