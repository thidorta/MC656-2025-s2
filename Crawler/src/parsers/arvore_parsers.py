from __future__ import annotations
import logging
import re
from typing import Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup

LOGGER_NAME = "arvore_parsers"
logger = logging.getLogger(LOGGER_NAME)

# -------------------------
# Helpers
# -------------------------

def _extract_options(html: str, select_id_or_name: str) -> List[Tuple[str, str]]:
    """Return (value, label) pairs for the target <select> regardless of attribute order."""
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    select = soup.find("select", id=select_id_or_name)
    if select is None:
        select = soup.find("select", attrs={"name": select_id_or_name})

    if select is None:
        logger.debug("Select '%s' nao encontrado", select_id_or_name)
        return []

    options: List[Tuple[str, str]] = []
    for option in select.find_all("option"):
        value = option.get("value") or ""
        if isinstance(value, list):
            value = " ".join(value)
        value = value.strip()
        if not value:
            continue
        label = option.get_text(strip=True)
        options.append((value, label))

    seen = set()
    uniq: List[Tuple[str, str]] = []
    for value, label in options:
        if value in seen:
            continue
        seen.add(value)
        uniq.append((value, label))

    logger.debug("Select '%s': %d opcoes", select_id_or_name, len(uniq))
    return uniq

# -------------------------
# Course/catalog/modalidade parsers
# -------------------------

def parse_courses_from_arvore(html: str) -> List[Dict[str, object]]:
    courses = _extract_options(html, "curso")
    out: List[Dict[str, object]] = []
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


def parse_catalogs_from_arvore(html: str) -> List[Dict[str, str | int | None]]:
    cats = _extract_options(html, "catalogo")
    out: List[Dict[str, str | int | None]] = []
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
    uniq: List[Dict[str, str | int | None]] = []
    for row in out:
        if row["catalogo_id"] not in seen:
            uniq.append(row)
            seen.add(row["catalogo_id"])
    logger.info("Catalogos encontrados: %d", len(uniq))
    return uniq


def parse_modalidades_from_fragment(html: str) -> List[Dict[str, str | None]]:
    modos: List[Tuple[str, str]] = []
    modos.extend(_extract_options(html, "modalidade"))

    soup = BeautifulSoup(html or "", "html.parser")

    for tag in soup.find_all(attrs={"data-sigla": True}):
        data_sigla = tag.get("data-sigla") or ""
        if isinstance(data_sigla, list):
            val = " ".join(data_sigla).strip()
        else:
            val = str(data_sigla).strip()
        if val:
            modos.append((val, val))

    for tag in soup.find_all(href=True):
        href = tag.get("href") or ""
        parsed = urlparse(str(href))
        qs = parse_qs(parsed.query)
        for val in qs.get("modalidade", []):
            cleaned = (val or "").strip()
            if cleaned:
                modos.append((cleaned, cleaned))

    out: List[Dict[str, str | None]] = []
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

    if not out:
        logger.info("Nenhuma modalidade especifica encontrada - usando modalidade padrao")
        out.append({
            "modalidade_id": "",
            "sigla": "UNICA",
            "descricao": "Modalidade unica",
        })
    else:
        logger.info("Modalidades extraidas: %d", len(out))

    return out

# -------------------------
# Integralizacao / disciplinas
# -------------------------

_OBRIG_BLOCK_RE = re.compile(
    r"(?:<strong>\s*)?Disciplinas\s+Obrigat(?:&oacute;|&Oacute;|\u00f3|o)rias[^:]*:\s*(?:</strong>)?\s"
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
    if not html:
        return None

    soup = BeautifulSoup(html, "html.parser")
    container = soup.find("div", id="integralizacao")
    if container is None:
        return None

    pre = container.find("pre")
    if pre is None:
        return None

    return pre.decode_contents()


def _split_semester_groups(section: str) -> List[str]:
    s = (section or "").replace("\r\n", "\n").replace("\r", "\n")
    s = "\n".join(line.rstrip() for line in s.split("\n"))
    s = re.sub(r"\n{3,}", "\n\n", s)
    return [b.strip() for b in s.split("\n\n") if b.strip()]


def _extract_disciplina_nodes(block_html: str) -> List[Tuple[str, str, str, Optional[int]]]:
    """Parse the HTML for one semester block and extract disciplina metadata."""
    soup = BeautifulSoup(block_html or "", "html.parser")
    nodes: List[Tuple[str, str, str, Optional[int]]] = []

    for anchor in soup.find_all("a", class_="sigla"):
        href = anchor.get("href") or ""
        match = re.search(r"/disciplina/(\d+)/", str(href))
        if not match:
            continue
        disciplina_id = match.group(1)
        title_val = anchor.get("title") or ""
        if isinstance(title_val, list):
            nome = " ".join(title_val).strip()
        else:
            nome = str(title_val).strip()
        codigo = _normalize_codigo(anchor.get_text())

        # Look for the first "(N)" sequence after the anchor to obtain credits.
        rendered_block = block_html
        anchor_markup = str(anchor)
        creditos: Optional[int] = None
        pos = rendered_block.find(anchor_markup)
        if pos != -1:
            tail = rendered_block[pos + len(anchor_markup):]
            mcred = re.search(r"\((\d+)\)", tail)
            if mcred:
                try:
                    creditos = int(mcred.group(1))
                except ValueError:
                    creditos = None

        nodes.append((disciplina_id, nome, codigo, creditos))

    return nodes


def parse_disciplinas_from_integralizacao(html: str, catalogo: str) -> List[Dict]:
    pre = _find_integralizacao_pre(html)
    if not pre:
        logger.warning("Bloco <pre> da integralizacao nao encontrado.")
        return []

    results: List[Dict] = []
    seen_ids: set[str] = set()

    def _collect_from_section(section_text: Optional[str], tipo: str):
        if not section_text:
            logger.info("Secao '%s' nao encontrada.", tipo)
            return

        groups = _split_semester_groups(section_text)
        logger.info("Secao '%s': %d blocos (semestres) detectados.", tipo, len(groups))

        for idx, block in enumerate(groups, start=1):
            found_any = False
            for disciplina_id, nome, codigo, creditos in _extract_disciplina_nodes(block):
                if disciplina_id in seen_ids:
                    logger.debug("Duplicata ignorada (id=%s, codigo=%s).", disciplina_id, codigo)
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
                logger.debug("Nenhuma ancora encontrada no bloco '%s' (semestre=%d).", tipo, idx)

    obrig_match = _OBRIG_BLOCK_RE.search(pre)
    _collect_from_section(obrig_match.group(1) if obrig_match else None, "obrigatoria")

    elet_match = _ELET_BLOCK_RE.search(pre)
    _collect_from_section(elet_match.group(1) if elet_match else None, "eletiva")

    logger.info("Total de disciplinas coletadas (sem duplicatas): %d", len(results))
    return results
