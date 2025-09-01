from __future__ import annotations
import json
import logging
import os
import shutil
from typing import Dict, List

from src.utils.io_raw import ensure_dir

from .config import CURSO_TARGET, CATALOGO_TARGET, PERIODO_TARGET, CP_TARGET
from .arvore_http import (
    polite_sleep,
    fetch_arvore_page,
    fetch_modalidades_fragment,
    fetch_arvore_with_params,
)
from src.parsers.arvore_parsers import (
    parse_courses_from_arvore,
    parse_catalogs_from_arvore,
    parse_modalidades_from_fragment,
    parse_disciplinas_from_integralizacao,
)

LOGGER_NAME = "enumerate_pipeline"
logger = logging.getLogger(LOGGER_NAME)


def enumerate_dimensions(session, raw_dir: str):
    """
    Fluxo (sem DB):
      1) Limpa e recria outputs/raw
      2) Abre /arvore/ raiz e extrai cursos
      3) Seleciona curso-alvo e extrai catálogos
      4) Baixa /ajax/modalidades.php (lista de modalidades)
      5) PARA CADA MODALIDADE → GET /arvore/?curso=...&modalidade=...&catalogo=...&periodo=...&cp=1
         - salva HTML
         - extrai disciplinas (com catalogo/tipo/semestre)
         - salva JSON por modalidade (com metadados: curso, numero_curso, catalogo, modalidade, periodo)
    """
    # 1) Apaga e recria raw_dir
    if os.path.isdir(raw_dir):
        logger.info("🧹 Limpando pasta RAW: %s", raw_dir)
        shutil.rmtree(raw_dir, ignore_errors=True)
    ensure_dir(raw_dir)

    # 2) Cursos na página raiz
    html_root = fetch_arvore_page(session, raw_dir=os.path.join(raw_dir, "root"), label="arvore_root")
    cursos = parse_courses_from_arvore(html_root)
    if not cursos:
        logger.error("Não encontrei <select id/name='curso'> na página /arvore/. Veja outputs/raw/root/arvore_root.html.")
        return

    curso_target_row = next((c for c in cursos if str(c["curso_id"]) == CURSO_TARGET), None)
    if not curso_target_row:
        logger.error("Curso alvo %s não encontrado no select de cursos.", CURSO_TARGET)
        return

    curso_nome = curso_target_row.get("nome") or ""

    # 3) Página do curso para extrair catálogos
    polite_sleep()
    html_course = fetch_arvore_page(
        session, raw_dir=os.path.join(raw_dir, "cursos"), label=f"curso_{CURSO_TARGET}", curso_id=CURSO_TARGET
    )
    catalogs = parse_catalogs_from_arvore(html_course)
    if not catalogs:
        logger.error("Curso %s: nenhum <select id/name='catalogo'>.", CURSO_TARGET)
        return

    cat_target_row = next((c for c in catalogs if str(c["catalogo_id"]) == CATALOGO_TARGET), None)
    if not cat_target_row:
        logger.error("Catálogo alvo %s não encontrado na página do curso.", CATALOGO_TARGET)
        return

    # 4) Modalidades do (curso, catálogo)
    polite_sleep()
    frag = fetch_modalidades_fragment(
        session,
        curso_id=CURSO_TARGET,
        catalogo_id=CATALOGO_TARGET,
        raw_dir=os.path.join(raw_dir, "modalidades"),
        label=f"modalidades_c{CURSO_TARGET}_a{CATALOGO_TARGET}",
    )
    modalidades = parse_modalidades_from_fragment(frag)
    if not modalidades:
        logger.warning("(curso=%s, catalogo=%s) sem modalidades extraídas.", CURSO_TARGET, CATALOGO_TARGET)
        return

    # 5) Para cada modalidade → GET arvore + extrai disciplinas + salva JSON
    arvore_dir = os.path.join(raw_dir, "arvore")
    ensure_dir(arvore_dir)

    out_dir_json = os.path.join(os.path.dirname(raw_dir), "json")
    ensure_dir(out_dir_json)

    logger.info(
        "🔁 Baixando Árvore por modalidade (curso=%s, catálogo=%s, período=%s) …",
        CURSO_TARGET,
        CATALOGO_TARGET,
        PERIODO_TARGET,
    )

    for m in modalidades:
        mid = m["modalidade_id"]
        polite_sleep()
        html_arvore = fetch_arvore_with_params(
            session,
            curso_id=CURSO_TARGET,
            catalogo_id=CATALOGO_TARGET,
            modalidade_id=mid,
            periodo_id=PERIODO_TARGET,
            cp=CP_TARGET,
            raw_dir=arvore_dir,
        )

        disciplinas = parse_disciplinas_from_integralizacao(html_arvore, catalogo=CATALOGO_TARGET)

        # TODO: semestre pode estar incorreto; corrigiremos depois.
        seen = set()
        deduped: List[Dict] = []
        for d in disciplinas:
            if d["disciplina_id"] in seen:
                logger.debug("Duplicata pós-parser ignorada: %s (%s)", d["disciplina_id"], d["codigo"])
                continue
            seen.add(d["disciplina_id"])
            deduped.append(d)

        payload = {
            "curso": curso_nome,
            "numero_curso": CURSO_TARGET,
            "catalogo": CATALOGO_TARGET,
            "modalidade": mid,
            "periodo": PERIODO_TARGET,
            "disciplinas": deduped,
        }

        json_name = f"disciplinas_c{CURSO_TARGET}_a{CATALOGO_TARGET}_m{mid}_p{PERIODO_TARGET}.json"
        out_json_path = os.path.join(out_dir_json, json_name)
        with open(out_json_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        logger.info("💾 JSON salvo: %s (disciplinas=%d)", out_json_path, len(deduped))

    logger.info("--- RESUMO ---")
    logger.info(
        "curso=%s, catalogo=%s, modalidades=%d", CURSO_TARGET, CATALOGO_TARGET, len(modalidades)
    )
    return {
        "curso": CURSO_TARGET,
        "catalogo": CATALOGO_TARGET,
        "modalidades": modalidades,
    }