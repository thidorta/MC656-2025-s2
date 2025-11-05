from __future__ import annotations

import json
import logging
import os
import shutil
from pathlib import Path
from typing import Dict, List, Optional

from ..config.settings import CrawlerSettings
from ..parsers.arvore_parsers import (
    parse_catalogs_from_arvore,
    parse_courses_from_arvore,
    parse_disciplinas_from_integralizacao,
    parse_modalidades_from_fragment,
)
from ..types import CurriculumParams
from ..utils.io_raw import ensure_dir
from .arvore_http import fetch_arvore_page, fetch_modalidades_fragment, polite_sleep
from .config import (
    CATALOGO_TARGET,
    COLLECT_ALL_COURSES,
    CP_TARGET,
    CURSO_TARGET,
    PERIODO_TARGET,
)
from .strategies import AjaxStrategy, FullPageStrategy

LOGGER_NAME = "enumerate_pipeline"
logger = logging.getLogger(LOGGER_NAME)


def fetch_with_strategy(
    session,
    settings: CrawlerSettings,
    params: CurriculumParams,
    raw_dir: str,
) -> str:
    ajax = AjaxStrategy()
    full = FullPageStrategy()
    configured = (settings.strategy or "auto").lower()

    if configured == "ajax":
        logger.info("Estrategia configurada: AJAX.")
        return ajax.fetch(session, settings, params, raw_dir)

    if configured == "full":
        logger.info("Estrategia configurada: FULL.")
        return full.fetch(session, settings, params, raw_dir)

    logger.info("Estrategia configurada: AUTO (AJAX com fallback).")
    try:
        return ajax.fetch(session, settings, params, raw_dir)
    except Exception as exc:
        logger.warning("AjaxStrategy falhou (%s). Tentando FullPageStrategy.", exc)
        return full.fetch(session, settings, params, raw_dir)


def _catalogo_as_int(value: str) -> int:
    try:
        return int(str(value))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Catalogo invalido: {value!r}") from exc


def _read_html(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def enumerate_dimensions(
    session,
    settings: CrawlerSettings,
    raw_dir: Optional[str] = None,
):
    raw_root = os.path.abspath(raw_dir or settings.out_dir)

    if os.path.isdir(raw_root):
        logger.info("Limpando pasta RAW: %s", raw_root)
        shutil.rmtree(raw_root, ignore_errors=True)
    ensure_dir(raw_root)

    html_root = fetch_arvore_page(
        session,
        settings,
        raw_dir=os.path.join(raw_root, "root"),
        label="arvore_root",
    )
    cursos = parse_courses_from_arvore(html_root)
    if not cursos:
        logger.error("Nao encontrei <select id/name='curso'> na pagina /arvore/.")
        return

    if COLLECT_ALL_COURSES:
        cursos_to_process = cursos
        logger.info("Modo: TODOS OS CURSOS (%d cursos)", len(cursos))
    else:
        cursos_to_process = [c for c in cursos if str(c["curso_id"]) == CURSO_TARGET]
        if not cursos_to_process:
            logger.error("Curso alvo %s nao encontrado no select de cursos.", CURSO_TARGET)
            return
        logger.info("Modo: APENAS CURSO %s", CURSO_TARGET)

    out_dir_json = os.path.join(os.path.dirname(raw_root), "json")
    ensure_dir(out_dir_json)

    total_modalidades = 0
    total_disciplinas = 0

    catalogo_int = _catalogo_as_int(CATALOGO_TARGET)

    for curso_row in cursos_to_process:
        curso_id_raw = curso_row["curso_id"]
        curso_id = int(str(curso_id_raw))
        curso_nome = curso_row.get("nome") or f"Curso {curso_id}"

        logger.info("\n" + "=" * 80)
        logger.info("Processando: %s (ID: %s)", curso_nome, curso_id)
        logger.info("=" * 80)

        polite_sleep(settings)
        html_course = fetch_arvore_page(
            session,
            settings,
            raw_dir=os.path.join(raw_root, "cursos"),
            label=f"curso_{curso_id}",
            curso_id=curso_id,
        )
        catalogs = parse_catalogs_from_arvore(html_course)
        if not catalogs:
            logger.warning("Curso %s: nenhum <select id/name='catalogo'>. Pulando...", curso_id)
            continue

        cat_target_row = next((c for c in catalogs if str(c["catalogo_id"]) == CATALOGO_TARGET), None)
        if not cat_target_row:
            logger.warning("Catalogo %s nao encontrado para curso %s. Pulando...", CATALOGO_TARGET, curso_id)
            continue

        polite_sleep(settings)
        frag = fetch_modalidades_fragment(
            session,
            settings,
            curso_id=curso_id,
            catalogo_id=catalogo_int,
            raw_dir=os.path.join(raw_root, "modalidades"),
            label=f"modalidades_c{curso_id}_a{CATALOGO_TARGET}",
        )
        modalidades = parse_modalidades_from_fragment(frag)

        logger.info("Encontradas %d modalidades para curso %s", len(modalidades), curso_id)
        total_modalidades += len(modalidades)

        arvore_dir = os.path.join(raw_root, "arvore")
        ensure_dir(arvore_dir)

        for modalidade in modalidades:
            modalidade_id = str(modalidade["modalidade_id"])
            sigla = modalidade.get("sigla", modalidade_id) or "UNICA"
            logger.info("  Processando modalidade: %s", sigla if sigla != modalidade_id else modalidade_id)

            polite_sleep(settings)
            params = CurriculumParams(
                curso_id=curso_id,
                catalogo_id=catalogo_int,
                modalidade_id=modalidade_id,
                periodo_id=str(PERIODO_TARGET),
                cp=str(CP_TARGET),
            )

            try:
                raw_path = fetch_with_strategy(session, settings, params, arvore_dir)
                html_arvore = _read_html(raw_path)
            except Exception as exc:
                logger.error(
                    "  Erro ao obter curriculum para modalidade %s do curso %s: %s",
                    sigla if sigla != modalidade_id else modalidade_id or "UNICA",
                    curso_id,
                    exc,
                )
                continue

            try:
                disciplinas = parse_disciplinas_from_integralizacao(html_arvore, catalogo=CATALOGO_TARGET)
            except Exception as exc:
                logger.error(
                    "  Erro ao parsear curriculum para modalidade %s do curso %s: %s",
                    sigla if sigla != modalidade_id else modalidade_id or "UNICA",
                    curso_id,
                    exc,
                )
                continue

            seen = set()
            deduped: List[Dict] = []
            for item in disciplinas:
                disc_id = item.get("disciplina_id")
                if disc_id in seen:
                    logger.debug("Duplicata pos-parser ignorada: %s (%s)", disc_id, item.get("codigo"))
                    continue
                seen.add(disc_id)
                deduped.append(item)

            modalidade_label = modalidade_id if modalidade_id else "UNICA"
            payload = {
                "curso": curso_nome,
                "numero_curso": curso_id,
                "catalogo": CATALOGO_TARGET,
                "modalidade": modalidade_label,
                "periodo": PERIODO_TARGET,
                "disciplinas": deduped,
            }

            json_name = (
                f"disciplinas_c{curso_id}_a{CATALOGO_TARGET}_"
                f"m{modalidade_label}_p{PERIODO_TARGET}.json"
            )
            out_json_path = os.path.join(out_dir_json, json_name)
            with open(out_json_path, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False, indent=2)

            total_disciplinas += len(deduped)
            logger.info("  JSON salvo: %s (%d disciplinas)", json_name, len(deduped))

    logger.info("\n" + "=" * 80)
    logger.info("COLETA FINALIZADA!")
    logger.info("=" * 80)
    logger.info("Resumo:")
    logger.info("  Cursos processados: %d", len(cursos_to_process))
    logger.info("  Total de modalidades: %d", total_modalidades)
    logger.info("  Total de disciplinas coletadas: %d", total_disciplinas)
    logger.info("  Catalogo: %s", CATALOGO_TARGET)
    logger.info("  Periodo: %s", PERIODO_TARGET)

    return {
        "cursos_processados": len(cursos_to_process),
        "total_modalidades": total_modalidades,
        "total_disciplinas": total_disciplinas,
    }

