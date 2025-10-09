from __future__ import annotations
import json
import logging
import os
import shutil
from typing import Dict, List

from src.utils.io_raw import ensure_dir

from .config import CURSO_TARGET, CATALOGO_TARGET, PERIODO_TARGET, CP_TARGET, COLLECT_ALL_COURSES
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
      3) Para cada curso (ou apenas CURSO_TARGET se COLLECT_ALL_COURSES=False):
         a) Extrai catálogos
         b) Baixa /ajax/modalidades.php (lista de modalidades)
         c) PARA CADA MODALIDADE → GET /arvore/?curso=...&modalidade=...&catalogo=...&periodo=...&cp=1
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

    # Filtrar cursos a processar
    if COLLECT_ALL_COURSES:
        cursos_to_process = cursos
        logger.info("🌍 Modo: TODOS OS CURSOS (%d cursos encontrados)", len(cursos))
    else:
        cursos_to_process = [c for c in cursos if str(c["curso_id"]) == CURSO_TARGET]
        if not cursos_to_process:
            logger.error("Curso alvo %s não encontrado no select de cursos.", CURSO_TARGET)
            return
        logger.info("🎯 Modo: APENAS CURSO %s", CURSO_TARGET)

    out_dir_json = os.path.join(os.path.dirname(raw_dir), "json")
    ensure_dir(out_dir_json)

    total_modalidades = 0
    total_disciplinas = 0

    # 3) Para cada curso
    for curso_row in cursos_to_process:
        curso_id = curso_row["curso_id"]
        curso_nome = curso_row.get("nome") or f"Curso {curso_id}"
        
        logger.info("\n" + "="*80)
        logger.info("📚 Processando: %s (ID: %s)", curso_nome, curso_id)
        logger.info("="*80)

        # 3a) Página do curso para extrair catálogos
        polite_sleep()
        html_course = fetch_arvore_page(
            session, raw_dir=os.path.join(raw_dir, "cursos"), label=f"curso_{curso_id}", curso_id=curso_id
        )
        catalogs = parse_catalogs_from_arvore(html_course)
        if not catalogs:
            logger.warning("Curso %s: nenhum <select id/name='catalogo'>. Pulando...", curso_id)
            continue

        cat_target_row = next((c for c in catalogs if str(c["catalogo_id"]) == CATALOGO_TARGET), None)
        if not cat_target_row:
            logger.warning("Catálogo %s não encontrado para curso %s. Pulando...", CATALOGO_TARGET, curso_id)
            continue

        # 3b) Modalidades do (curso, catálogo)
        polite_sleep()
        frag = fetch_modalidades_fragment(
            session,
            curso_id=curso_id,
            catalogo_id=CATALOGO_TARGET,
            raw_dir=os.path.join(raw_dir, "modalidades"),
            label=f"modalidades_c{curso_id}_a{CATALOGO_TARGET}",
        )
        modalidades = parse_modalidades_from_fragment(frag)
        # Note: parse_modalidades_from_fragment agora sempre retorna pelo menos uma modalidade
        # (modalidade padrão vazia para cursos sem modalidades específicas)

        logger.info("🔍 Encontradas %d modalidades para curso %s", len(modalidades), curso_id)
        total_modalidades += len(modalidades)

        arvore_dir = os.path.join(raw_dir, "arvore")
        ensure_dir(arvore_dir)

        # 3c) Para cada modalidade → GET arvore + extrai disciplinas + salva JSON
        for m in modalidades:
            mid = m["modalidade_id"]
            sigla = m.get("sigla", mid) or "UNICA"
            logger.info("  📄 Processando modalidade: %s", sigla if sigla != mid else mid)
            
            polite_sleep()
            try:
                html_arvore = fetch_arvore_with_params(
                    session,
                    curso_id=curso_id,
                    catalogo_id=CATALOGO_TARGET,
                    modalidade_id=mid,
                    periodo_id=PERIODO_TARGET,
                    cp=CP_TARGET,
                    raw_dir=arvore_dir,
                )

                disciplinas = parse_disciplinas_from_integralizacao(html_arvore, catalogo=CATALOGO_TARGET)

                # Deduplica disciplinas
                seen = set()
                deduped: List[Dict] = []
                for d in disciplinas:
                    if d["disciplina_id"] in seen:
                        logger.debug("Duplicata pós-parser ignorada: %s (%s)", d["disciplina_id"], d["codigo"])
                        continue
                    seen.add(d["disciplina_id"])
                    deduped.append(d)

                # Use "UNICA" no JSON para modalidades vazias
                modalidade_label = mid if mid else "UNICA"
                
                payload = {
                    "curso": curso_nome,
                    "numero_curso": curso_id,
                    "catalogo": CATALOGO_TARGET,
                    "modalidade": modalidade_label,
                    "periodo": PERIODO_TARGET,
                    "disciplinas": deduped,
                }

                json_name = f"disciplinas_c{curso_id}_a{CATALOGO_TARGET}_m{modalidade_label}_p{PERIODO_TARGET}.json"
                out_json_path = os.path.join(out_dir_json, json_name)
                with open(out_json_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                
                total_disciplinas += len(deduped)
                logger.info("  ✅ JSON salvo: %s (%d disciplinas)", json_name, len(deduped))
            
            except Exception as e:
                logger.error("  ❌ Erro ao processar modalidade %s do curso %s: %s", sigla if sigla != mid else mid or "UNICA", curso_id, e)
                continue

    logger.info("\n" + "="*80)
    logger.info("🎉 COLETA FINALIZADA!")
    logger.info("="*80)
    logger.info("📊 Resumo:")
    logger.info("  • Cursos processados: %d", len(cursos_to_process))
    logger.info("  • Total de modalidades: %d", total_modalidades)
    logger.info("  • Total de disciplinas coletadas: %d", total_disciplinas)
    logger.info("  • Catálogo: %s", CATALOGO_TARGET)
    logger.info("  • Período: %s", PERIODO_TARGET)
    logger.info("="*80)
    
    return {
        "cursos_processados": len(cursos_to_process),
        "total_modalidades": total_modalidades,
        "total_disciplinas": total_disciplinas,
    }