from __future__ import annotations

import html
import json
import os
import re
import shutil
import sys
import unicodedata
from pathlib import Path
from typing import Dict, Any, List

from dotenv import load_dotenv
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from crawler_app.clients.gde_api import GDEApiClient, Modality
from crawler_app.parsers.arvore_parsers import (
    parse_disciplinas_from_integralizacao,
    _find_integralizacao_pre,
    _OBRIG_BLOCK_RE,
    _ELET_BLOCK_RE,
    _split_semester_groups,
)


def build_client():
    from crawler_app.utils import http_session

    base_url = os.getenv("GDE_BASE_URL", "https://grade.daconline.unicamp.br/")
    session = http_session.create_session()
    http_session.ensure_csrf_cookie(session, base_url)

    username = os.getenv("GDE_USERNAME") or os.getenv("GDE_LOGIN")
    password = os.getenv("GDE_PASSWORD") or os.getenv("GDE_SENHA")
    csrf = os.getenv("GDE_CSRF") or None

    if username and password:
        http_session.login_via_ajax(session, base_url, username, password, csrf=csrf)

    return GDEApiClient(base_url=base_url, session=session)





def normalize_code(code: str | None) -> str:
    if not code:
        return ""
    if not isinstance(code, str):
        code = str(code)
    normalized = unicodedata.normalize("NFKD", code)
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = re.sub(r"\s+", " ", normalized).strip().upper()
    match = re.match(r"([A-Z]{1,3}\s?\d{3})", normalized)
    return match.group(1) if match else normalized


def coerce_semester(value) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        try:
            return int(text)
        except ValueError:
            return None
    return None


def extract_semester_map(html: str, id_to_code: Dict[str, str]) -> Dict[str, int]:
    """Derive recommended semester per code from the integralização HTML."""
    result: Dict[str, int] = {}

    soup = BeautifulSoup(html, "html.parser")
    map_tag = soup.find("map", {"name": "mapa"})
    if map_tag:
        y_slots: Dict[int, int] = {}
        sorted_levels: List[int] = []
        for area in map_tag.find_all("area"):
            shape_id = area.get("id") or ""
            if not shape_id.startswith("Shape_"):
                continue
            coords = area.get("coords") or ""
            try:
                y_val = int(coords.split(",")[1])
            except (IndexError, ValueError):
                continue
            if y_val not in y_slots:
                sorted_levels.append(y_val)
        sorted_levels.sort()
        current_level = 0
        prev_y = None
        for y_val in sorted_levels:
            if prev_y is None or (y_val - prev_y) > 60:
                current_level += 1
            y_slots[y_val] = current_level
            prev_y = y_val

        for area in map_tag.find_all("area"):
            shape_id = area.get("id") or ""
            if not shape_id.startswith("Shape_"):
                continue
            raw_id = shape_id.split("_", 1)[1]
            coords = area.get("coords") or ""
            try:
                y_val = int(coords.split(",")[1])
            except (IndexError, ValueError):
                continue
            semester = y_slots.get(y_val)
            if semester is None:
                continue
            code = id_to_code.get(raw_id)
            if code and code not in result:
                result[code] = semester

    pre = _find_integralizacao_pre(html)
    if not pre:
        return result

    def _populate(section_html: str | None, base_semester: int = 1):
        if not section_html:
            return
        groups = _split_semester_groups(section_html)
        for offset, block in enumerate(groups, start=0):
            semester = base_semester + offset
            soup = BeautifulSoup(block, "html.parser")
            for anchor in soup.find_all("a", class_="sigla"):
                code = normalize_code(anchor.get_text())
                if code and code not in result:
                    result[code] = semester

    obrig_match = _OBRIG_BLOCK_RE.search(pre)
    _populate(obrig_match.group(1) if obrig_match else None, base_semester=1)

    elet_match = _ELET_BLOCK_RE.search(pre)
    _populate(elet_match.group(1) if elet_match else None, base_semester=1)

    return result

def extract_prereqs_from_detail(html_text: str) -> List[List[str]]:
    if not html_text:
        return []
    soup = BeautifulSoup(html_text, "html.parser")
    target_label = None
    for tag in soup.find_all(["b", "strong"]):
        raw_text = tag.get_text(strip=True)
        normalized = "".join(ch for ch in unicodedata.normalize("NFKD", raw_text) if not unicodedata.combining(ch)).lower()
        if "pre" in normalized and "requis" in normalized:
            target_label = tag
            break
    if target_label is None:
        return []
    row = target_label.find_parent("tr")
    if row is None:
        return []
    table = row.find("table")
    if table is None:
        return []
    rows = table.find_all("tr")
    if not rows:
        return []
    target_row = None
    for tr in reversed(rows):
        if tr.find("strong"):
            target_row = tr
            break
    if target_row is None:
        target_row = rows[-1]

    cells = target_row.find_all("td")
    if not cells:
        return []
    target_cell = cells[-1]
    raw_html = target_cell.decode_contents()
    # Split alternatives on "ou"
    chunks = re.split(r"\bou\b", raw_html, flags=re.IGNORECASE)
    alternatives: List[List[str]] = []
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        combo_soup = BeautifulSoup(chunk, "html.parser")
        combo: List[str] = []
        for anchor in combo_soup.find_all("a"):
            code = normalize_code(anchor.get_text())
            if code and code not in combo:
                combo.append(code)
        if combo:
            alternatives.append(combo)

    if alternatives:
        return alternatives

    # Fallback to flat list if no explicit alternatives detected.
    flat: List[str] = []
    for anchor in target_cell.find_all("a"):
        code = normalize_code(anchor.get_text())
        if code and code not in flat:
            flat.append(code)
    return [flat] if flat else []


def get_prereqs_for_discipline(
    client: GDEApiClient,
    *,
    disc_id: int | None,
    year: int,
    cache: Dict[str, List[List[str]]],
) -> List[List[str]]:
    if not disc_id:
        return []
    key = str(disc_id)
    if key in cache:
        return cache[key]
    raw_name = Path(str(year)) / f"disciplina_{disc_id}.html"
    html_text = client._request_html(f"disciplina/{disc_id}/", raw_name=raw_name)
    prereqs = extract_prereqs_from_detail(html_text or "")
    cache[key] = prereqs
    return prereqs


def fetch_arvore_html(client: GDEApiClient, *, course_id: int, catalogo: str, modality: str, periodo: str, cp: str, raw_suffix: str) -> str | None:
    params = {
        "curso": course_id,
        "catalogo": catalogo,
        "modalidade": modality,
        "periodo": periodo,
        "cp": cp,
    }

    raw_name = Path(catalogo) / f"arvore_c{course_id}_a{catalogo}_m{modality}_p{periodo}_cp{cp}_{raw_suffix}.html"
    return client._request_html(client.paths["arvore"], params=params, raw_name=raw_name)


def export_catalog(year: int, output_dir: Path) -> None:
    client = build_client()

    # Clear previous captures for the target year
    if output_dir.exists():
        shutil.rmtree(output_dir)
    raw_year_dir = client.raw_dir / str(year)
    if raw_year_dir.exists():
        shutil.rmtree(raw_year_dir)
    catalog_db_dir = Path("crawler/data/catalog_db") / str(year)
    if catalog_db_dir.exists():
        shutil.rmtree(catalog_db_dir)
    user_db_root = Path("crawler/data/user_db")
    if user_db_root.exists():
        shutil.rmtree(user_db_root)

    raw_year_dir.mkdir(parents=True, exist_ok=True)
    catalog_db_dir.mkdir(parents=True, exist_ok=True)
    user_db_root.mkdir(parents=True, exist_ok=True)

    prereq_cache: Dict[str, List[List[str]]] = {}

    courses = client.get_courses(year=year)
    target_ids_env = os.getenv("EXPORT_ONLY_COURSE_IDS", "").strip()
    target_ids = {
        int(value)
        for value in (target_ids_env.split(",") if target_ids_env else [])
        if value.strip().isdigit()
    }

    print(f"[export] catalog {year} -> {len(courses)} courses")
    if target_ids:
        print(f"[export] filtering to course ids: {sorted(target_ids)}")

    output_dir.mkdir(parents=True, exist_ok=True)

    for course in courses:
        if target_ids and course.id not in target_ids:
            continue

        course_dir = output_dir / f"course_{course.id}"
        course_dir.mkdir(parents=True, exist_ok=True)

        record: Dict[str, Any] = {
            "course": course.model_dump(),
        }

        modalities: List[Modality] = []
        try:
            modalities = client.get_modalities(year=year, course_id=course.id)
        except Exception as exc:  # pragma: no cover - diagnostic output
            record["modalities_error"] = str(exc)

        record["modalities"] = [m.model_dump() for m in modalities]

        if modalities:
            default_modality_obj = next((m for m in modalities if m.selected), modalities[0])
        else:
            default_modality_obj = Modality(code="", label="", selected=True)

        default_modality_code = default_modality_obj.code or ""
        modalities_for_catalog = modalities or [default_modality_obj]

        plane_payload: Dict[str, Any] | None = None
        try:
            curriculum = client.get_curriculum(course_id=course.id, year=year)
            record["curriculum"] = curriculum.model_dump()
            plane_payload = client._fetch_planejador_payload(course_id=course.id, year=year)  # cache hit
        except Exception as exc:  # pragma: no cover
            record["curriculum_error"] = str(exc)

        try:
            offers = client.get_offers(year=year, course_id=course.id)
            record["offers"] = [offer.model_dump() for offer in offers]
        except Exception as exc:  # pragma: no cover
            record["offers_error"] = str(exc)

        try:
            prereqs = client.get_prereqs(course_id=course.id, year=year)
            record["prereqs"] = [p.model_dump() for p in prereqs]
        except Exception as exc:  # pragma: no cover
            record["prereqs_error"] = str(exc)

        try:
            sem_map = client.get_semester_map(course_id=course.id, year=year)
            record["semester_map"] = sem_map.model_dump()
        except Exception as exc:  # pragma: no cover
            record["semester_map_error"] = str(exc)

        out_path = course_dir / "data.json"
        out_path.write_text(
            json.dumps(record, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"  - saved course {course.id} -> {out_path}")

        if plane_payload is None:
            plane_payload = client._fetch_planejador_payload(course_id=course.id, year=year)

        if plane_payload:
            disc_lookup: Dict[str, Dict[str, Any]] = {}
            for item in plane_payload.get("Oferecimentos", {}).values():
                disc = item.get("Disciplina", {})
                if not disc:
                    continue
                keys = [disc.get("siglan"), disc.get("sigla"), disc.get("id")]
                for key in keys:
                    if key is None:
                        continue
                    if isinstance(key, str):
                        raw_key = key.strip()
                        if raw_key:
                            disc_lookup.setdefault(raw_key, disc)
                            if any(ch.isalpha() for ch in raw_key):
                                disc_lookup.setdefault(normalize_code(raw_key), disc)
                    else:
                        disc_lookup.setdefault(str(key), disc)

            # ---------------- Catalog DB ----------------
            catalog_period = client.periodo_default
            course_catalog_root = catalog_db_dir / f"course_{course.id}"
            course_catalog_root.mkdir(parents=True, exist_ok=True)

            for modality_obj in modalities_for_catalog:
                modality_code = (modality_obj.code or "").strip()
                modality_label = modality_obj.label
                raw_rel_path = Path(str(year)) / f"arvore_c{course.id}_a{year}_m{modality_code}_p{catalog_period}_cp1_catalog.html"
                catalog_html = fetch_arvore_html(
                    client,
                    course_id=course.id,
                    catalogo=str(year),
                    modality=modality_code,
                    periodo=catalog_period,
                    cp="1",
                    raw_suffix="catalog",
                )
                catalog_nodes: List[Dict[str, Any]] = []
                if catalog_html:
                    raw_nodes = parse_disciplinas_from_integralizacao(catalog_html, catalogo=str(year))
                    catalog_file = client.raw_dir / raw_rel_path
                    try:
                        persisted_html = catalog_file.read_text(encoding="utf-8")
                    except FileNotFoundError:
                        persisted_html = catalog_html
                    id_to_code = {}
                    for raw in raw_nodes:
                        disc_id = str(raw.get("disciplina_id") or "").strip()
                        code = normalize_code(raw.get("codigo"))
                        if disc_id and code:
                            id_to_code[disc_id] = code
                    semester_map = extract_semester_map(persisted_html, id_to_code)
                    for raw in raw_nodes:
                        code = normalize_code(raw.get("codigo"))
                        original_sem = raw.get("semestre")
                        disc = disc_lookup.get(code)
                        plane_sem = coerce_semester(disc.get("semestre")) if disc else None
                        html_sem = semester_map.get(code, coerce_semester(original_sem))
                        finalized_sem = (
                            plane_sem
                            if plane_sem is not None
                            else html_sem
                            if raw.get("tipo") == "obrigatoria" and html_sem is not None
                            else None
                        )
                        catalog_nodes.append(
                            {
                                **raw,
                                "semestre": finalized_sem,
                                "modalidade": modality_code,
                                "prereqs": get_prereqs_for_discipline(
                                    client,
                                    disc_id=(
                                        disc.get("id")
                                        if disc and disc.get("id")
                                        else int(raw.get("disciplina_id")) if raw.get("disciplina_id") else None
                                    ),
                                    year=year,
                                    cache=prereq_cache,
                                ),
                            }
                        )

                catalog_record = {
                    "course": course.model_dump(),
                    "modalidade": modality_code,
                    "modalidade_label": modality_label,
                    "year": year,
                    "parameters": {
                        "catalogo": str(year),
                        "modalidade": modality_code,
                        "periodo": catalog_period,
                        "cp": "1",
                    },
                    "disciplines": catalog_nodes,
                }
                modality_dir_name = modality_code if modality_code else "default"
                modality_dir = course_catalog_root / modality_dir_name
                modality_dir.mkdir(parents=True, exist_ok=True)
                catalog_path = modality_dir / "data.json"
                catalog_path.write_text(json.dumps(catalog_record, ensure_ascii=False, indent=2), encoding="utf-8")

            # ---------------- User DB ----------------
            planner_id = getattr(client.session, "gde_planejador_id", None) or os.getenv("GDE_PLANEJADOR_ID")
            if planner_id:
                user_dir = user_db_root / str(planner_id)
                user_dir.mkdir(parents=True, exist_ok=True)

                integralizacao_html = plane_payload.get("Arvore", {}).get("integralizacao", "")
                match = re.search(r"Aluno:</strong>\s*<a[^>]*>([^<]+)", integralizacao_html, re.IGNORECASE)
                user_name = html.unescape(match.group(1).strip()) if match else None

                curso_match = re.search(r"Curso:</strong>\s*(\d+)", integralizacao_html, re.IGNORECASE)
                planner_course_id = int(curso_match.group(1)) if curso_match else None
                if planner_course_id is not None and planner_course_id != course.id:
                    continue

                current_period = str(plane_payload.get("Planejado", {}).get("periodo") or client.periodo_default)
                cp_value = plane_payload.get("c")

                user_html = fetch_arvore_html(
                    client,
                    course_id=course.id,
                    catalogo=str(year),
                    modality=default_modality_code,
                    periodo=current_period,
                    cp="0",
                    raw_suffix="user",
                )
                user_nodes: List[Dict[str, Any]] = []
                tipo_map = {
                    str(k): html.unescape(v)
                    for k, v in (plane_payload.get("Arvore", {}).get("tipos") or {}).items()
                }
                if plane_payload:
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
                            "catalogo": int(year),
                            "tipo": tipo_map.get(str(disc_id)) if disc_id is not None else None,
                            "semestre": plane_sem,
                            "missing": not bool(disc.get("tem")),
                            "status": "completed" if disc.get("tem") else "pending",
                            "tem": disc.get("tem"),
                            "pode": disc.get("pode"),
                            "obs": disc.get("obs"),
                            "color": disc.get("cor"),
                            "cp_group": disc.get("c"),
                            "prereqs": get_prereqs_for_discipline(
                                client,
                                disc_id=disc_id,
                                year=year,
                                cache=prereq_cache,
                            ),
                        }
                        offers_subset = []
                        for offer in (item.get("Oferecimentos") or {}).values():
                            offers_subset.append(dict(offer))
                        if offers_subset:
                            node["offers"] = offers_subset
                        user_nodes.append(node)

                    user_nodes.sort(
                        key=lambda entry: (
                            entry.get("semestre") is None,
                            entry.get("semestre") if entry.get("semestre") is not None else 0,
                            entry.get("codigo"),
                        )
                    )
                elif user_html:
                    raw_user_nodes = parse_disciplinas_from_integralizacao(user_html, catalogo=str(year))
                    for raw in raw_user_nodes:
                        code = normalize_code(raw.get("codigo"))
                        if not code:
                            continue
                        disc = disc_lookup.get(code)
                        html_sem = coerce_semester(raw.get("semestre"))
                        plane_sem = coerce_semester(disc.get("semestre")) if disc else None
                        finalized_sem = plane_sem if plane_sem is not None else html_sem
                        user_nodes.append(
                            {
                                **raw,
                                "semestre": finalized_sem,
                                "prereqs": get_prereqs_for_discipline(
                                    client,
                                    disc_id=(
                                        disc.get("id")
                                        if disc and disc.get("id")
                                        else int(raw.get("disciplina_id")) if raw.get("disciplina_id") else None
                                    ),
                                    year=year,
                                    cache=prereq_cache,
                                ),
                            }
                        )

                cp_disciplines = []
                for item in plane_payload.get("Oferecimentos", {}).values():
                    disc = item.get("Disciplina", {})
                    if disc.get("c") == cp_value:
                        offers_subset = []
                        for offer in (item.get("Oferecimentos") or {}).values():
                            offers_subset.append(dict(offer))
                        cp_disciplines.append(
                            {
                                "disciplina": dict(disc),
                                "offers": offers_subset,
                            }
                        )

                user_record = {
                    "planner_id": str(planner_id),
                    "user": {"name": user_name} if user_name else {},
                    "course": course.model_dump(),
                    "year": year,
                    "current_period": current_period,
                    "cp": cp_value,
                    "parameters": {
                        "catalogo": str(year),
                        "modalidade": modality_code,
                        "periodo": current_period,
                        "cp": "0",
                    },
                    "curriculum": user_nodes,
                    "disciplines": cp_disciplines,
                }

                user_path = user_dir / f"course_{course.id}.json"
                user_path.write_text(json.dumps(user_record, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    year = int(os.getenv("EXPORT_CATALOG_YEAR", "2022"))
    output_dir = Path(os.getenv("EXPORT_CATALOG_OUTPUT", f"crawler/data/js_catalog/{year}"))
    export_catalog(year=year, output_dir=output_dir)


if __name__ == "__main__":
    main()
