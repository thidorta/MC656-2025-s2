from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from bs4 import BeautifulSoup
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SRC_DIR = ROOT / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from crawler_app.clients.gde_api import GDEApiClient  # noqa: E402
from crawler_app.utils import http_session  # noqa: E402


def normalize_code(code: str | None) -> str:
    if not code:
        return ""
    return str(code).strip().upper()


def coerce_semester(value) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if text.isdigit():
        try:
            return int(text)
        except ValueError:
            return None
    return None


def build_client() -> GDEApiClient:
    base_url = os.getenv("GDE_BASE_URL", "https://grade.daconline.unicamp.br/")
    session = http_session.create_session()
    http_session.ensure_csrf_cookie(session, base_url)

    username = os.getenv("GDE_USERNAME") or os.getenv("GDE_LOGIN")
    password = os.getenv("GDE_PASSWORD") or os.getenv("GDE_SENHA")
    csrf = os.getenv("GDE_CSRF") or None

    if username and password:
        http_session.login_via_ajax(session, base_url, username, password, csrf=csrf)

    return GDEApiClient(base_url=base_url, session=session)


def _extract_user_info(integralizacao_html: str) -> tuple[Optional[str], Optional[int]]:
    user_name = None
    course_id = None

    match = re.search(r"Aluno:</strong>\s*<a[^>]*>([^<]+)", integralizacao_html, re.IGNORECASE)
    if match:
        user_name = html.unescape(match.group(1).strip())

    curso_match = re.search(r"Curso:</strong>\s*(\d+)", integralizacao_html, re.IGNORECASE)
    if curso_match:
        course_id = int(curso_match.group(1))

    return user_name, course_id


def _extract_meta_from_integralizacao(integralizacao_html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(integralizacao_html or "", "html.parser")
    text = soup.get_text(" ")
    norm = " ".join(text.split())

    def find_first(pattern: str) -> Optional[str]:
        m = re.search(pattern, norm, re.IGNORECASE)
        return m.group(1).strip() if m else None

    course_name = None
    course_id = None
    m_course = re.search(r"Curso:\s*(\d+)\s*-\s*(.+?)\s+Modalidade:", norm, re.IGNORECASE)
    if m_course:
        course_id = int(m_course.group(1))
        course_name = m_course.group(2).strip()

    meta = {
        "name": find_first(r"Aluno:\s*([^\n]+)"),
        "ra": find_first(r"Registro Acad[eê]mico\s*\(RA\):\s*(\d+)"),
        "course_id": course_id,
        "course_name": course_name,
        "modalidade": find_first(r"Modalidade:\s*(.+?)\s+Cat[aá]logo:"),
        "catalogo": find_first(r"Cat[aá]logo:\s*(\d{4})"),
        "ingresso": find_first(r"Ingresso:\s*(.+?)\s+Limite para Integraliza[cç][aã]o:"),
        "limite_integralizacao": find_first(r"Limite para Integraliza[cç][aã]o:\s*(.+?)\s+Semestre Atual"),
        "semestre_atual": find_first(r"Semestre Atual\s*:\s*([0-9\-\.\sºoª]+)"),
        "cp_atual": find_first(r"CP\s*:\s*([\d\.,]+)"),
        "cpf_previsto": find_first(r"CPF\s*:\s*([\d\.,]+)"),
    }
    return {k: v for k, v in meta.items() if v is not None}


def _slice_section(text: str, start_phrase: str, end_markers: List[str]) -> str:
    txt_low = text.lower()
    start = txt_low.find(start_phrase.lower())
    if start == -1:
        return ""
    start += len(start_phrase)
    ends = [txt_low.find(marker.lower(), start) for marker in end_markers if txt_low.find(marker.lower(), start) != -1]
    end = min(ends) if ends else len(text)
    return text[start:end].strip()


def _parse_code_credit_block(block_text: str) -> List[str]:
    items: List[str] = []
    for m in re.finditer(r"([A-Z]{1,3}\s?\d{3})\s*\((\d+)\)", block_text):
        code = m.group(1).strip()
        credits = m.group(2)
        items.append(f"{code}({credits})")
    if not items:
        for m in re.finditer(r"([A-Z]{1,3}\s?\d{3})", block_text):
            code = m.group(1).strip()
            if code and code not in items:
                items.append(code)
    return items


def extract_missing_sections(integralizacao_html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(integralizacao_html or "", "html.parser")
    text = " ".join(soup.get_text(" ").split())

    obrig_block = _slice_section(
        text,
        "Disciplinas Obrigatórias que ainda devem ser cursadas:",
        ["Disciplinas Eletivas", "Disciplinas sendo cursadas", "Códigos utilizados"],
    )
    elet_block = _slice_section(
        text,
        "Disciplinas Eletivas que ainda devem ser cursadas:",
        ["Disciplinas sendo cursadas", "Códigos utilizados"],
    )

    return {
        "faltantes_obrigatorias": _parse_code_credit_block(obrig_block),
        "faltantes_obrigatorias_text": obrig_block,
        "faltantes_eletivas": _parse_code_credit_block(elet_block),
        "faltantes_eletivas_text": elet_block,
    }


def build_user_nodes(
    plane_payload: Dict[str, Any],
    *,
    year: int,
    client: GDEApiClient,
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    tipo_map = {
        str(k): html.unescape(v) for k, v in (plane_payload.get("Arvore", {}).get("tipos") or {}).items()
    }

    prereq_lookup: Dict[str, List[List[str]]] = {}
    try:
        prereqs = client.get_prereqs(course_id=0, year=year)
        for item in prereqs:
            prereq_lookup[item.course_code] = item.requirements
    except Exception:
        prereq_lookup = {}

    user_nodes: List[Dict[str, Any]] = []
    cp_disciplines: List[Dict[str, Any]] = []
    cp_value = plane_payload.get("c")

    for item in plane_payload.get("Oferecimentos", {}).values():
        disc = item.get("Disciplina", {})
        if not disc:
            continue
        disc_id = disc.get("id")
        code = normalize_code(disc.get("sigla") or disc.get("siglan"))
        if not code:
            continue
        plane_sem = coerce_semester(disc.get("semestre"))
        node: Dict[str, Any] = {
            "disciplina_id": str(disc_id) if disc_id is not None else None,
            "codigo": code,
            "nome": str(disc.get("nome") or code),
            "creditos": disc.get("creditos"),
            "catalogo": int(year) if year else None,
            "tipo": tipo_map.get(str(disc_id)) if disc_id is not None else None,
            "semestre": plane_sem,
            "missing": not bool(disc.get("tem")),
            "status": "completed" if disc.get("tem") else "pending",
            "tem": disc.get("tem"),
            "pode": disc.get("pode"),
            "obs": disc.get("obs"),
            "color": disc.get("cor"),
            "cp_group": disc.get("c"),
            "prereqs": prereq_lookup.get(code, []),
        }
        offers_subset = []
        for offer in (item.get("Oferecimentos") or {}).values():
            offers_subset.append(dict(offer))
        if offers_subset:
            node["offers"] = offers_subset
        user_nodes.append(node)

        if disc.get("c") == cp_value:
            cp_offers = []
            for offer in (item.get("Oferecimentos") or {}).values():
                cp_offers.append(dict(offer))
            cp_disciplines.append(
                {
                    "disciplina": dict(disc),
                    "offers": cp_offers,
                }
            )

    user_nodes.sort(
        key=lambda entry: (
            entry.get("semestre") is None,
            entry.get("semestre") if entry.get("semestre") is not None else 0,
            entry.get("codigo"),
        )
    )
    return user_nodes, cp_disciplines


def infer_catalog_year(payload: Dict[str, Any]) -> int:
    for candidate in (
        payload.get("Planejado", {}).get("catalogo"),
        payload.get("catalogo"),
        os.getenv("PLANNER_YEAR"),
        os.getenv("EXPORT_CATALOG_YEAR"),
        os.getenv("CATALOGO_TARGET"),
    ):
        if candidate and str(candidate).isdigit():
            return int(candidate)
    return 0


def infer_course_name(course_id: int, year: int, client: GDEApiClient) -> Optional[str]:
    try:
        courses = client.get_courses(year=year)
        for course in courses:
            if int(course.id) == int(course_id):
                return course.name
    except Exception:
        return None
    return None


def export_user_db(planner_id: Optional[str]) -> Path:
    client = build_client()

    resolved_planner = planner_id or getattr(client.session, "gde_planejador_id", None)
    if not resolved_planner:
        raise SystemExit("Planner ID não encontrado. Defina GDE_PLANEJADOR_ID ou faça login que expose o planejador.")

    payload = client._fetch_planejador_payload(course_id=0, year=0)
    if not payload:
        raise SystemExit("Não foi possível obter o payload do planejador.")

    integralizacao_html = payload.get("Arvore", {}).get("integralizacao", "") or ""
    user_name, payload_course_id = _extract_user_info(integralizacao_html)
    resolved_course_id = payload_course_id
    if resolved_course_id is None:
        raise SystemExit("Não foi possível identificar o curso associado ao planejador.")

    meta = _extract_meta_from_integralizacao(integralizacao_html)
    catalog_year = infer_catalog_year(payload) or int(meta.get("catalogo", 0) or 0)
    course_name = meta.get("course_name") or (
        infer_course_name(resolved_course_id, catalog_year, client) if catalog_year else None
    )

    current_period = str(payload.get("Planejado", {}).get("periodo") or client.periodo_default)
    cp_value = payload.get("c")

    user_nodes, cp_disciplines = build_user_nodes(payload, year=catalog_year or 0, client=client)
    missing_sections = extract_missing_sections(integralizacao_html)

    user_record = {
        "planner_id": str(resolved_planner),
        "user": {"name": user_name or meta.get("name"), "ra": meta.get("ra")},
        "course": {"id": resolved_course_id, "name": course_name} if resolved_course_id else {},
        "year": catalog_year,
        "current_period": current_period,
        "cp": cp_value,
        "parameters": {
            "catalogo": str(catalog_year) if catalog_year else "",
            "periodo": current_period,
            "cp": "0",
        },
        "planejado": {
            "periodo": payload.get("Planejado", {}).get("periodo"),
            "periodo_nome": payload.get("Planejado", {}).get("periodo_nome"),
            "periodo_atual": payload.get("Planejado", {}).get("periodo_atual"),
            "periodo_atual_nome": payload.get("Planejado", {}).get("periodo_atual_nome"),
            "data_matricula_inicio": payload.get("Planejado", {}).get("data_matricula_inicio"),
            "data_matricula_fim": payload.get("Planejado", {}).get("data_matricula_fim"),
            "data_alteracao_inicio": payload.get("Planejado", {}).get("data_alteracao_inicio"),
            "data_alteracao_fim": payload.get("Planejado", {}).get("data_alteracao_fim"),
        },
        "integralizacao_meta": {
            "catalogo": meta.get("catalogo"),
            "modalidade": meta.get("modalidade"),
            "ingresso": meta.get("ingresso"),
            "limite_integralizacao": meta.get("limite_integralizacao"),
            "semestre_atual": meta.get("semestre_atual"),
            "cp_atual": meta.get("cp_atual"),
            "cpf_previsto": meta.get("cpf_previsto"),
        },
        "faltantes": missing_sections,
        "curriculum": user_nodes,
        "disciplines": cp_disciplines,
    }

    target_dir = DATA_DIR / "user_db" / str(resolved_planner)
    if target_dir.exists():
        shutil.rmtree(target_dir, ignore_errors=True)
    target_dir.mkdir(parents=True, exist_ok=True)

    user_path = target_dir / f"course_{resolved_course_id}.json"
    user_path.write_text(json.dumps(user_record, ensure_ascii=False, indent=2), encoding="utf-8")

    raw_target_dir = DATA_DIR / "raw" / (str(catalog_year) if catalog_year else "planner")
    raw_target_dir.mkdir(parents=True, exist_ok=True)
    raw_path = raw_target_dir / f"planejador_{resolved_planner}.json"
    raw_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    return user_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Exporta snapshot do planejador para data/user_db.")
    parser.add_argument("--planner-id", help="Override do planner ID (padrão: GDE_PLANEJADOR_ID ou detectado no login)")
    return parser.parse_args()


def main() -> None:
    load_dotenv(ROOT / ".env")
    args = parse_args()

    out_path = export_user_db(planner_id=args.planner_id)
    print(f"[user-db] Snapshot salvo em: {out_path}")


if __name__ == "__main__":
    main()
