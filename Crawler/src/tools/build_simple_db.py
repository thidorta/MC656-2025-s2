from __future__ import annotations
import json
import os
from glob import glob
from pathlib import Path

from src.db.simple_db import (
    get_conn,
    ensure_schema,
    upsert_curso,
    upsert_disciplina,
    upsert_curso_disciplina,
    commit,
)

BASE_DIR = Path(__file__).resolve().parents[2]  # project root
OUTPUTS = BASE_DIR / "outputs"
JSON_DIR = OUTPUTS / "json"
DB_PATH = OUTPUTS / "gde_simple.db"
SCHEMA_FILE = (BASE_DIR / "src" / "db" / "simple_schema.sql").as_posix()

# Defaults/assumptions for fields missing in JSON
DEFAULT_NIVEL_CURSO = "G"   # graduação; ajuste se necessário
DEFAULT_NIVEL_DISC  = None   # desconhecido por enquanto


def load_json_payloads() -> list[dict]:
    files = sorted(glob((JSON_DIR / "*.json").as_posix()))
    payloads: list[dict] = []
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            payloads.append(json.load(f))
    return payloads


def main() -> None:
    os.makedirs(OUTPUTS, exist_ok=True)

    conn = get_conn(DB_PATH.as_posix())
    ensure_schema(conn, SCHEMA_FILE)

    payloads = load_json_payloads()
    if not payloads:
        print("Nenhum JSON encontrado em outputs/json – rode o coletor primeiro.")
        return

    # Inserimos o curso 1x por numero_curso
    seen_cursos: set[int] = set()

    for p in payloads:
        numero_curso = int(p.get("numero_curso"))
        nome_curso = p.get("curso")
        catalogo = int(p.get("catalogo")) if str(p.get("catalogo", "")).isdigit() else None
        modalidade = str(p.get("modalidade") or "").strip()
        periodo = str(p.get("periodo") or "").strip()

        if numero_curso not in seen_cursos:
            # Assumindo id_curso = numero_curso
            upsert_curso(
                conn,
                id_curso=numero_curso,
                numero=numero_curso,
                nivel=DEFAULT_NIVEL_CURSO,
                nome=nome_curso,
            )
            seen_cursos.add(numero_curso)

        for d in p.get("disciplinas", []):
            # 1) Dimensão disciplina
            try:
                id_disc = int(d["disciplina_id"]) if isinstance(d["disciplina_id"], (int, str)) else None
            except Exception:
                # ID inválido -> ignora
                continue

            upsert_disciplina(
                conn,
                id_disciplina=id_disc,
                sigla=str(d.get("codigo") or "").strip(),
                nome=d.get("nome"),
                creditos=int(d["creditos"]) if str(d.get("creditos", "")).isdigit() else None,
                nivel=DEFAULT_NIVEL_DISC,
                periodicidade=None,
                # Você havia dito que o semestre pode estar errado; manteremos como 0 na dimensão,
                # e armazenaremos o semestre "do contexto" na tabela de ligação.
                parte=0,
                ementa=None,
                bibliografia=None,
                quinzenal=0,
                id_instituto=None,
                cursacoes=0,
                reprovacoes=0,
                max_reprovacoes=0,
            )

            # 2) Ligação curso↔disciplina no contexto
            tipo = d.get("tipo")  # 'obrigatoria' | 'eletiva' (se presente)
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
    print(f"✅ Banco criado/populado em: {DB_PATH}")


if __name__ == "__main__":
    main()