from __future__ import annotations

import html
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException, status

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/119.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}


def _base_url() -> str:
    return os.getenv("GDE_BASE_URL", "https://grade.daconline.unicamp.br").rstrip("/")


def _create_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(DEFAULT_HEADERS)
    return s


def _ensure_csrf(session: requests.Session, base_url: str) -> Optional[str]:
    for path in ("/arvore/", "/login/", "/"):
        try:
            resp = session.get(base_url + path, timeout=20)
            resp.raise_for_status()
        except Exception:
            continue
        csrf = session.cookies.get("csrfptoken")
        if csrf:
            return csrf
    return session.cookies.get("csrfptoken")


def _login(session: requests.Session, base_url: str, username: str, password: str, csrf: Optional[str]) -> str:
    url = base_url + "/ajax/login.php"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": base_url,
        "Referer": base_url + "/login/",
    }
    if csrf:
        headers["X-CSRFP-TOKEN"] = csrf

    data = {
        "old": "1",
        "token": "",
        "login": username,
        "senha": password,
        "lembrar": "t",
        "OK": "+",
    }

    resp = session.post(url, headers=headers, data=data, timeout=30)
    if resp.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas para o GDE")

    planner_resp = session.get(base_url + "/planejador/", timeout=20)
    planner_resp.raise_for_status()
    match = re.search(r"InicializarPlanejador\([\"'](\d+)[\"']\)", planner_resp.text)
    if not match:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não foi possível identificar o planner ID.")
    return match.group(1)


def _fetch_planejador_payload(session: requests.Session, base_url: str, planner_id: str) -> Dict[str, Any]:
    base_host = base_url.rstrip("/")
    periodo = os.getenv("GDE_PLANEJADOR_PERIODO", os.getenv("PERIODO_TARGET", "20261"))
    post_data = {
        "id": str(planner_id),
        "a": "c",
        "c": 0,
        "pp": str(periodo),
        "pa": "",
    }
    headers = {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": base_host,
        "Referer": base_host + "/planejador/",
    }
    csrf_cookie = session.cookies.get("csrfptoken")
    if csrf_cookie:
        headers["X-CSRFP-TOKEN"] = csrf_cookie

    resp = session.post(
        base_host + "/ajax/planejador.php",
        headers=headers,
        data=post_data,
        timeout=25,
    )
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao obter o payload do planejador (HTTP {resp.status_code}). Verifique credenciais/rede.",
        )
    try:
        payload = resp.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Resposta do planejador invalida. Tente novamente em instantes.",
        )
    if not isinstance(payload, dict) or not payload:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payload do planejador vazio. Pode ser instabilidade no GDE.",
        )
    return payload


def _normalize_code(code: str | None) -> str:
    if not code:
        return ""
    return str(code).strip().upper()


def _coerce_int(value: Any) -> Optional[int]:
    try:
        return int(str(value))
    except Exception:
        return None


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

    return {
        "name": find_first(r"Aluno:\s*([^\n]+)"),
        "ra": find_first(r"Registro Acad[eǦ]mico\s*\(RA\):\s*(\d+)"),
        "course_id": course_id,
        "course_name": course_name,
        "modalidade": find_first(r"Modalidade:\s*(.+?)\s+Cat[aǭ]logo:"),
        "catalogo": find_first(r"Cat[aǭ]logo:\s*(\d{4})"),
        "ingresso": find_first(r"Ingresso:\s*(.+?)\s+Limite para Integraliza[c��][aǜ]o:"),
        "limite_integralizacao": find_first(r"Limite para Integraliza[c��][aǜ]o:\s*(.+?)\s+Semestre Atual"),
        "semestre_atual": find_first(r"Semestre Atual\s*:\s*([0-9\-\.\s��o��]+)"),
        "cp_atual": find_first(r"CP\s*:\s*([\d\.,]+)"),
        "cpf_previsto": find_first(r"CPF\s*:\s*([\d\.,]+)"),
    }


def _extract_ra_fallback(integralizacao_html: str) -> Optional[str]:
    text = " ".join(BeautifulSoup(integralizacao_html or "", "html.parser").get_text(" ").split())
    patterns = [
        r"RA[:\s]*([0-9]{3,})",
        r"Registro\s+Academico[:\s]*([0-9]{3,})",
        r"Registro\s+Acad[eA]mico[:\s]*([0-9]{3,})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


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


def _extract_missing_sections(integralizacao_html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(integralizacao_html or "", "html.parser")
    text = " ".join(soup.get_text(" ").split())

    obrig_block = _slice_section(
        text,
        "Disciplinas Obrigat��rias que ainda devem ser cursadas:",
        ["Disciplinas Eletivas", "Disciplinas sendo cursadas", "C��digos utilizados"],
    )
    elet_block = _slice_section(
        text,
        "Disciplinas Eletivas que ainda devem ser cursadas:",
        ["Disciplinas sendo cursadas", "C��digos utilizados"],
    )

    return {
        "faltantes_obrigatorias": _parse_code_credit_block(obrig_block),
        "faltantes_obrigatorias_text": obrig_block,
        "faltantes_eletivas": _parse_code_credit_block(elet_block),
        "faltantes_eletivas_text": elet_block,
    }


def _build_user_nodes(payload: Dict[str, Any], year: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    tipo_map = {
        str(k): html.unescape(v) for k, v in (payload.get("Arvore", {}).get("tipos") or {}).items()
    }

    prereq_lookup: Dict[str, List[List[str]]] = {}
    extras = payload.get("Extras") or []
    if isinstance(extras, dict):
        extras = extras.get("items") or extras
        extras = extras if isinstance(extras, list) else []
    for item in extras:
        if not isinstance(item, dict):
            continue
        code = (
            item.get("code")
            or item.get("courseCode")
            or item.get("disciplina")
            or item.get("sigla")
            or item.get("siglan")
        )
        requirements = item.get("requirements") or item.get("prereqs") or []
        if code:
            prereq_lookup[_normalize_code(code)] = requirements if isinstance(requirements, list) else []

    user_nodes: List[Dict[str, Any]] = []
    cp_disciplines: List[Dict[str, Any]] = []
    cp_value = payload.get("c")

    def _normalize_offers(raw_offers: Dict[str, Any]) -> List[Dict[str, Any]]:
        offers_out: List[Dict[str, Any]] = []
        for offer in (raw_offers or {}).values():
            offer_entry: Dict[str, Any] = dict(offer)
            events = []
            event_src = (offer or {}).get("eventSources", {}) or {}
            for evt in event_src.get("events", []) or []:
                start_iso = evt.get("start")
                end_iso = evt.get("end")
                day_idx = None
                start_hour = None
                end_hour = None
                try:
                    from datetime import datetime

                    if start_iso:
                        dt = datetime.fromisoformat(str(start_iso).replace("Z", "+00:00"))
                        day_idx = dt.weekday()
                        start_hour = dt.hour
                    if end_iso:
                        dt_end = datetime.fromisoformat(str(end_iso).replace("Z", "+00:00"))
                        end_hour = dt_end.hour
                except Exception:
                    pass
                events.append(
                    {
                        "title": evt.get("title"),
                        "start": start_iso,
                        "end": end_iso,
                        "day": day_idx,
                        "start_hour": start_hour,
                        "end_hour": end_hour,
                    }
                )
            if events:
                offer_entry["events"] = events
            offers_out.append(offer_entry)
        return offers_out

    for item in payload.get("Oferecimentos", {}).values():
        disc = item.get("Disciplina", {})
        if not disc:
            continue
        disc_id = disc.get("id")
        code = _normalize_code(disc.get("sigla") or disc.get("siglan"))
        if not code:
            continue
        plane_sem = _coerce_int(disc.get("semestre"))
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
        offers_subset = _normalize_offers(item.get("Oferecimentos") or {})
        if offers_subset:
            node["offers"] = offers_subset
        user_nodes.append(node)

        if disc.get("c") == cp_value:
            cp_offers = _normalize_offers(item.get("Oferecimentos") or {})
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


def _infer_catalog_year(payload: Dict[str, Any], meta: Dict[str, Any]) -> int:
    for candidate in (
        payload.get("Planejado", {}).get("catalogo"),
        payload.get("catalogo"),
        os.getenv("PLANNER_YEAR"),
        os.getenv("EXPORT_CATALOG_YEAR"),
        os.getenv("CATALOGO_TARGET"),
        meta.get("catalogo"),
    ):
        if candidate and str(candidate).isdigit():
            return int(candidate)
    return 0


def build_user_db_snapshot(planner_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    integralizacao_html = payload.get("Arvore", {}).get("integralizacao", "") or ""
    user_name, payload_course_id = _extract_user_info(integralizacao_html)
    meta = _extract_meta_from_integralizacao(integralizacao_html)
    ra_fallback = _extract_ra_fallback(integralizacao_html)
    catalog_year = _infer_catalog_year(payload, meta)
    current_period = str(payload.get("Planejado", {}).get("periodo") or os.getenv("PERIODO_TARGET", ""))
    cp_value = payload.get("c")

    user_nodes, cp_disciplines = _build_user_nodes(payload, year=catalog_year or 0)
    missing_sections = _extract_missing_sections(integralizacao_html)

    course_name = meta.get("course_name")
    resolved_course_id = payload_course_id or meta.get("course_id")

    return {
        "planner_id": str(planner_id),
        "user": {"name": user_name or meta.get("name"), "ra": meta.get("ra") or ra_fallback},
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


def fetch_user_db_with_credentials(username: str, password: str) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
    """
    Performs a live login against GDE using the provided credentials and returns:
    - planner_id
    - user_db snapshot (dict)
    - raw planner payload (dict)

    No data is written to disk; everything is kept in memory.
    """
    base_url = _base_url()
    session = _create_session()
    csrf = _ensure_csrf(session, base_url)
    planner_id = _login(session, base_url, username, password, csrf)
    payload = _fetch_planejador_payload(session, base_url, planner_id)
    snapshot = build_user_db_snapshot(planner_id, payload)
    return planner_id, snapshot, payload
