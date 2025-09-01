from __future__ import annotations
import logging
import re
from typing import Dict, List, Tuple, Optional

LOGGER_NAME = "arvore_parsers"
logger = logging.getLogger(LOGGER_NAME)

# -------------------------
# Helpers
# -------------------------

def _extract_options(html: str, select_id_or_name: str) -> List[Tuple[str, str]]:
    patt_select = re.compile(
        rf"<select[^>]+(?:id|name)\s*=\s*['\"]{re.escape(select_id_or_name)}['\"][\s\S]*?</select>",
        re.IGNORECASE,
    )
    m = patt_select.search(html or "")
    if not m:
        logger.debug("Select '%s' não encontrado", select_id_or_name)
        return []
    select_html = m.group(0)

    options: List[Tuple[str, str]] = []
    for mo in re.finditer(
        r"<option\s+[^>]*value\s*=\s*['\"]([^'\"]+)['\"][^>]*>(.*?)</option>",
        select_html,
        re.IGNORECASE | re.DOTALL,
    ):
        val = (mo.group(1) or "").strip()
        lbl = re.sub(r"<[^>]*>", "", mo.group(2) or "").strip()
        if val:
            options.append((val, lbl))

    seen = set()
    uniq: List[Tuple[str, str]] = []
    for v, l in options:
        if v not in seen:
            uniq.append((v, l))
            seen.add(v)
    logger.debug("Select '%s': %d opções", select_id_or_name, len(uniq))
    return uniq

# -------------------------
# Course/catalog/modalidade parsers
# -------------------------

def parse_courses_from_arvore(html: str) -> List[Dict[str, str]]:
    courses = _extract_options(html, "curso")
    out: List[Dict[str, str]] = []
    for cid, label in courses:
        m = re.search(r"\(([A-Z]{2,8})\)\s*$", label or "")
        sigla = m.group(1) if m else None
        out.append({
            "curso_id": cid,
            "nome": label,
            "sigla": sigla or None,
            "unidade": None,
            "ativo": 1,
        })
    logger.info("Cursos encontrados: %d", len(out))
    return out


def parse_catalogs_from_arvore(html: str) -> List[Dict[str, str]]:
    cats = _extract_options(html, "catalogo")
    out: List[Dict[str, str]] = []
    for val, _label in cats:
        ano = None
        m = re.search(r"(\d{4})", val or "")
        if m:
            ano = int(m.group(1))
        out.append({
            "catalogo_id": val,
            "ano": ano,
            "vigente": 0,
            "vigencia_ini": None,
            "vigencia_fim": None,
        })
    seen = set()
    uniq: List[Dict[str, str]] = []
    for row in out:
        if row["catalogo_id"] not in seen:
            uniq.append(row)
            seen.add(row["catalogo_id"])
    logger.info("Catálogos encontrados: %d", len(uniq))
    return uniq


def parse_modalidades_from_fragment(html: str) -> List[Dict[str, str]]:
    modos: List[Tuple[str, str]] = []
    modos.extend(_extract_options(html, "modalidade"))

    for m in re.finditer(r"[?&]modalidade=([A-Za-z0-9_]+)", html or "", re.IGNORECASE):
        val = (m.group(1) or "").strip()
        if val:
            modos.append((val, val))

    for m in re.finditer(r"data-?sigla\s*=\s*['\"]([A-Za-z0-9_]+)['\"]", html or "", re.IGNORECASE):
        val = (m.group(1) or "").strip()
        if val:
            modos.append((val, val))

    out: List[Dict[str, str]] = []
    seen = set()
    for val, label in modos:
        if not val or val in seen:
            continue
        out.append({
            "modalidade_id": val,
            "sigla": val,
            "descricao": label if label and label != val else None,
        })
        seen.add(val)
    logger.info("Modalidades extraídas: %d", len(out))
    return out

# -------------------------
# Integralização / disciplinas
# -------------------------

_ANCHOR_RE = re.compile(
    r'<a\s+href="[^"]*/disciplina/(\d+)/"\s+class="sigla"\s+title="([^"]+)"[^>]*>([^<]+)</a>\s*\((\d+)\)',
    re.IGNORECASE,
)

_OBRIG_BLOCK_RE = re.compile(
    r"(?:<strong>\s*)?Disciplinas\s+Obrigat(?:&oacute;|&Oacute;|ó|o)rias[^:]*:\s*(?:</strong>)?\s"
    r"([\s\S]*?)"
    r"(?=(?:<strong>\s*)?Disciplinas\s+Eletivas|</pre>|$)",
    re.IGNORECASE,
)

_ELET_BLOCK_RE = re.compile(
    r"(?:<strong>\s*)?Disciplinas\s+Eletivas[^:]*:\s*(?:</strong>)?\s"
    r"([\s\S]*?)"
    r"(?=</pre>|$)",
    re.IGNORECASE,
)


def _normalize_codigo(c: str) -> str:
    return re.sub(r"\s+", " ", (c or "").strip())


def _find_integralizacao_pre(html: str) -> Optional[str]:
    mdiv = re.search(r'<div[^>]+id=["\']integralizacao["\'][^>]*>([\s\S]*?)</div>', html or "", re.IGNORECASE)
    if not mdiv:
        return None
    bloco = mdiv.group(1)
    mpre = re.search(r"<pre>([\s\S]*?)</pre>", bloco or "", re.IGNORECASE)
    if not mpre:
        return None
    return mpre.group(1)


def _split_semester_groups(section: str) -> List[str]:
    s = (section or "").replace("\r\n", "\n").replace("\r", "\n")
    s = "\n".join(line.rstrip() for line in s.split("\n"))
    s = re.sub(r"\n{3,}", "\n\n", s)
    return [b.strip() for b in s.split("\n\n") if b.strip()]


def parse_disciplinas_from_integralizacao(html: str, catalogo: str) -> List[Dict]:
    pre = _find_integralizacao_pre(html)
    if not pre:
        logger.warning("Bloco <pre> da integralização não encontrado.")
        return []

    results: List[Dict] = []
    seen_ids: set[str] = set()

    def _collect_from_section(section_text: Optional[str], tipo: str):
        if not section_text:
            logger.info("Seção '%s' não encontrada.", tipo)
            return

        groups = _split_semester_groups(section_text)
        logger.info("Seção '%s': %d blocos (semestres) detectados.", tipo, len(groups))

        for idx, block in enumerate(groups, start=1):
            found_any = False
            for m in _ANCHOR_RE.finditer(block):
                disciplina_id, nome, codigo, cred = m.groups()
                codigo = _normalize_codigo(codigo)
                try:
                    creditos = int(cred)
                except Exception:
                    creditos = None

                if disciplina_id in seen_ids:
                    logger.debug("Duplicata ignorada (id=%s, código=%s).", disciplina_id, codigo)
                    continue

                results.append({
                    "disciplina_id": disciplina_id,
                    "codigo": codigo,
                    "nome": nome.strip(),
                    "creditos": creditos,
                    "catalogo": int(catalogo) if str(catalogo).isdigit() else catalogo,
                    "tipo": tipo,
                    "semestre": (idx if tipo == "obrigatoria" else None),
                })
                seen_ids.add(disciplina_id)
                found_any = True

            if not found_any:
                logger.debug("Nenhuma âncora encontrada no bloco '%s' (semestre=%d).", tipo, idx)

    obrig_match = _OBRIG_BLOCK_RE.search(pre)
    _collect_from_section(obrig_match.group(1) if obrig_match else None, "obrigatoria")

    elet_match = _ELET_BLOCK_RE.search(pre)
    _collect_from_section(elet_match.group(1) if elet_match else None, "eletiva")

    logger.info("Total de disciplinas coletadas (sem duplicatas): %d", len(results))
    return results