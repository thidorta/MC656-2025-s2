from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from html import unescape
from pydantic import BaseModel, Field

from ..collectors.config import CATALOGO_TARGET, CP_TARGET, PERIODO_TARGET
from ..parsers.arvore_parsers import parse_disciplinas_from_integralizacao


CRAWLER_ROOT = Path(__file__).resolve().parents[3]
RAW_SUBDIR = Path("data") / "raw"


class Modality(BaseModel):
    code: str
    label: str
    selected: bool = False


class Course(BaseModel):
    id: int
    name: str
    code: Optional[str] = None


class Offer(BaseModel):
    course_code: str
    term: Optional[str] = None
    class_id: Optional[str] = None
    raw: Dict[str, Any] = Field(default_factory=dict)


class CurriculumNode(BaseModel):
    code: str
    name: str
    period: int = 0
    category: Optional[str] = None


class CurriculumEdge(BaseModel):
    src: str
    dst: str
    type: str = "prereq"


class Curriculum(BaseModel):
    course_id: int
    year: int
    modality: str
    nodes: List[CurriculumNode] = Field(default_factory=list)
    edges: List[CurriculumEdge] = Field(default_factory=list)


class Prereq(BaseModel):
    course_code: str
    requirements: List[str] = Field(default_factory=list)


class SemesterEntry(BaseModel):
    code: str
    recommended_semester: Optional[int] = None


class SemesterMap(BaseModel):
    course_id: int
    year: int
    entries: List[SemesterEntry] = Field(default_factory=list)


class GDEApiClient:
    """Client for GDE front-end endpoints with graceful HTML fallbacks."""

    def __init__(self, base_url: str, session: requests.Session) -> None:
        self.base_url = base_url if base_url.endswith("/") else f"{base_url}/"
        self.session = session
        self.project_root = CRAWLER_ROOT
        self.raw_dir = self.project_root / RAW_SUBDIR

        self.paths = {
            "courses": os.getenv("GDE_PATH_COURSES", ""),
            "offers": os.getenv("GDE_PATH_OFFERS", "ajax/planejador.php"),
            "curriculum": os.getenv("GDE_PATH_CURRICULUM", "ajax/planejador.php"),
            "prereqs": os.getenv("GDE_PATH_PREREQS", "ajax/planejador.php"),
            "semester_map": os.getenv("GDE_PATH_SEM_MAP", "ajax/planejador.php"),
            "modalities": os.getenv("GDE_PATH_MODALITIES", "ajax/modalidades.php"),
            "arvore": os.getenv("GDE_PATH_ARVORE", "arvore/"),
        }

        self.catalogo_default = str(CATALOGO_TARGET)
        self.periodo_default = str(PERIODO_TARGET)
        self.cp_default = str(CP_TARGET)
        self._planejador_cache: Dict[tuple[int, int], Optional[Dict[str, Any]]] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_modalities(self, year: int, course_id: int) -> List[Modality]:
        path = self.paths["modalities"]
        modalities: List[Modality] = []

        if path:
            payload = self._request_json(
                path,
                params={"year": year, "courseId": course_id},
                raw_name=Path(str(year)) / f"modalidades_c{course_id}_{year}.json",
            )
            if payload:
                items = self._ensure_iterable(payload)
                for item in items:
                    code = str(item.get("code") or item.get("id") or item.get("value") or "").strip()
                    label = str(item.get("label") or item.get("name") or item.get("descricao") or code)
                    selected = bool(item.get("selected") or item.get("isSelected"))
                    if code:
                        modalities.append(Modality(code=code, label=label, selected=selected))
        if modalities:
            return modalities

        html = self._request_html(
            path or "ajax/modalidades.php",
            params={"c": course_id, "a": year, "o": 1},
            raw_name=Path(str(year)) / f"modalidades_c{course_id}_a{year}.html",
        )
        if not html:
            return modalities

        soup = BeautifulSoup(html, "html.parser")
        select = soup.find("select", id="modalidade")
        if not select:
            return modalities
        for option in select.find_all("option"):
            code = (option.get("value") or "").strip()
            if not code:
                continue
            label = option.get_text(strip=True)
            selected = option.has_attr("selected")
            modalities.append(Modality(code=code, label=label, selected=selected))
        return modalities

    def get_courses(self, year: int) -> List[Course]:
        courses: List[Course] = []
        if self.paths["courses"]:
            payload = self._request_json(
                self.paths["courses"],
                params={"year": year},
                raw_name=Path(str(year)) / "courses.json",
            )
            if payload:
                items = self._ensure_iterable(payload)
                for item in items:
                    course_id = self._safe_int(item.get("id") or item.get("curso_id") or item.get("numero"))
                    if course_id is None:
                        continue
                    code = str(item.get("code") or item.get("sigla") or "").strip() or None
                    name = str(item.get("name") or item.get("nome") or code or course_id)
                    courses.append(Course(id=course_id, code=code, name=name))
        if courses:
            return courses

        html = self._request_html(
            self.paths["arvore"],
            params={"catalogo": year, "periodo": self.periodo_default, "cp": self.cp_default},
            raw_name=Path(str(year)) / "courses_fallback.html",
        )
        if not html:
            return courses

        soup = BeautifulSoup(html, "html.parser")
        select = soup.find("select", id="curso")
        if not select:
            return courses
        for option in select.find_all("option"):
            raw_id = option.get("value") or ""
            course_id = self._safe_int(raw_id)
            if course_id is None:
                continue
            label = option.get_text(strip=True)
            code = None
            if "(" in label and ")" in label:
                code = label.split("(")[-1].split(")")[0].strip() or None
            courses.append(Course(id=course_id, name=label, code=code))
        return courses

    def get_offers(self, year: int, course_id: int) -> List[Offer]:
        offers: List[Offer] = []
        payload = self._fetch_planejador_payload(course_id=course_id, year=year)
        if payload and payload.get("Oferecimentos"):
            periodo = payload.get("Planejado", {}).get("periodo")
            for item in payload["Oferecimentos"].values():
                disc = item.get("Disciplina", {})
                base_code = (disc.get("sigla") or disc.get("siglan") or "").strip()
                turmas = item.get("Oferecimentos") or {}
                for turma_data in turmas.values():
                    offers.append(
                        Offer(
                            course_code=turma_data.get("siglan") or base_code,
                            term=str(periodo) if periodo else None,
                            class_id=turma_data.get("turma"),
                            raw=turma_data,
                        )
                    )
        if offers:
            return offers

        # HTML fallback: extract placeholder offers from curriculum page
        curriculum = self.get_curriculum(course_id=course_id, year=year)
        for node in curriculum.nodes:
            offers.append(Offer(course_code=node.code, term=None, class_id=None))
        return offers

    def get_curriculum(self, course_id: int, year: int) -> Curriculum:
        payload = self._fetch_planejador_payload(course_id=course_id, year=year)
        modality = self._resolve_modality(year=year, course_id=course_id)
        if payload and payload.get("Oferecimentos"):
            tipo_map = {
                str(k): unescape(v)
                for k, v in (payload.get("Arvore", {}).get("tipos") or {}).items()
            }
            nodes_by_code: Dict[str, CurriculumNode] = {}
            for item in payload["Oferecimentos"].values():
                disc = item.get("Disciplina", {})
                code = (disc.get("sigla") or disc.get("siglan") or "").strip()
                if not code:
                    continue
                node_id = str(disc.get("id") or "")
                name = str(disc.get("nome") or code)
                period = self._safe_int(disc.get("semestre")) or 0
                category = tipo_map.get(node_id)
                node = CurriculumNode(code=code, name=name, period=period, category=category)
                nodes_by_code.setdefault(code, node)

            if nodes_by_code:
                return Curriculum(
                    course_id=course_id,
                    year=year,
                    modality=modality,
                    nodes=list(nodes_by_code.values()),
                    edges=[],
                )
        html = self._request_html(
            self.paths["arvore"],
            params=self._arvore_params(course_id=course_id, catalogo=year, modality=modality),
            raw_name=Path(str(year)) / f"arvore_c{course_id}_a{year}_s{modality}.html",
        )
        if not html:
            return Curriculum(course_id=course_id, year=year, modality=modality)

        parsed = parse_disciplinas_from_integralizacao(html, catalogo=str(year))
        nodes = [
            CurriculumNode(
                code=str(item.get("codigo") or item.get("disciplina_id") or "").strip(),
                name=str(item.get("nome") or "").strip(),
                period=self._safe_int(item.get("semestre")) or 0,
                category=str(item.get("tipo") or "").strip() or None,
            )
            for item in parsed
            if item.get("codigo")
        ]
        return Curriculum(course_id=course_id, year=year, modality=modality, nodes=nodes, edges=[])

    def get_prereqs(self, course_id: int, year: int) -> List[Prereq]:
        payload = self._fetch_planejador_payload(course_id=course_id, year=year)
        prereqs: List[Prereq] = []
        if payload and payload.get("Extras"):
            items = self._ensure_iterable(payload["Extras"])
            for item in items:
                code = str(item.get("code") or item.get("courseCode") or item.get("disciplina") or "").strip()
                if not code:
                    continue
                requirements = item.get("requirements") or item.get("prereqs") or []
                if isinstance(requirements, str):
                    requirements = [requirements]
                prereqs.append(Prereq(course_code=code, requirements=list(requirements)))
        if prereqs:
            return prereqs

        curriculum = self.get_curriculum(course_id=course_id, year=year)
        for edge in curriculum.edges:
            match = next((p for p in prereqs if p.course_code == edge.dst), None)
            if match is None:
                match = Prereq(course_code=edge.dst)
                prereqs.append(match)
            match.requirements.append(edge.src)
        return prereqs

    def get_semester_map(self, course_id: int, year: int) -> SemesterMap:
        entries: List[SemesterEntry] = []
        payload = self._fetch_planejador_payload(course_id=course_id, year=year)
        if payload and payload.get("Oferecimentos"):
            for item in payload["Oferecimentos"].values():
                disc = item.get("Disciplina", {})
                code = (disc.get("sigla") or disc.get("siglan") or "").strip()
                if not code:
                    continue
                semester = self._safe_int(disc.get("semestre"))
                entries.append(SemesterEntry(code=code, recommended_semester=semester))
        if not entries:
            curriculum = self.get_curriculum(course_id=course_id, year=year)
            for node in curriculum.nodes:
                entries.append(SemesterEntry(code=node.code, recommended_semester=node.period or None))
        return SemesterMap(course_id=course_id, year=year, entries=entries)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _build_url(self, path: str) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        return urljoin(self.base_url, path.lstrip("/"))

    def _request_json(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        method: str = "GET",
        raw_name: Optional[Path] = None,
        timeout: float = 20.0,
    ) -> Optional[Any]:
        if not path:
            return None

        url = self._build_url(path)
        method = method.upper()
        base_host = self.base_url.rstrip("/")
        headers = {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        }
        csrf_cookie = self.session.cookies.get("csrfptoken")
        if method == "POST":
            headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
            headers["Origin"] = base_host
            if "planejador" in path:
                headers["Referer"] = base_host + "/planejador/"
            if csrf_cookie:
                headers["X-CSRFP-TOKEN"] = csrf_cookie

        request_kwargs = {
            "headers": headers,
            "timeout": timeout,
        }
        if method == "POST":
            request_kwargs["data"] = data or params or {}
        else:
            request_kwargs["params"] = params or {}

        try:
            if method == "POST":
                response = self.session.post(url, **request_kwargs)
            else:
                response = self.session.get(url, **request_kwargs)
        except Exception:
            return None

        text = response.text or ""
        if raw_name:
            self._write_raw(raw_name, text)

        if response.status_code >= 400 or not text.strip():
            return None

        try:
            return response.json()
        except Exception:
            return None

    def _request_html(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        raw_name: Optional[Path] = None,
        timeout: float = 20.0,
    ) -> Optional[str]:
        url = self._build_url(path)
        try:
            response = self.session.get(
                url,
                params=params,
                headers={
                    "Accept": "text/html, */*; q=0.01",
                    "X-Requested-With": "XMLHttpRequest",
                },
                timeout=timeout,
            )
        except Exception:
            return None

        text = response.text or ""
        if raw_name:
            self._write_raw(raw_name, text)

        if response.status_code >= 400 or not text:
            return None
        return text

    def _fetch_planejador_payload(self, *, course_id: int, year: int) -> Optional[Dict[str, Any]]:
        key = (course_id, year)
        if key in self._planejador_cache:
            return self._planejador_cache[key]

        path = self.paths.get("offers")
        if not path:
            self._planejador_cache[key] = None
            return None

        periodo_param = self.periodo_default or str(year)
        planner_id = os.getenv("GDE_PLANEJADOR_ID") or getattr(self.session, "gde_planejador_id", None)
        post_data = {
            "id": str(planner_id or "0"),
            "a": "c",
            "c": 0 if planner_id else course_id,
            "pp": periodo_param,
            "pa": "",
        }

        payload = self._request_json(
            path,
            data=post_data,
            method="POST",
            raw_name=Path(str(year)) / f"planejador_c{course_id}.json",
        )

        if isinstance(payload, dict) and payload:
            self._planejador_cache[key] = payload
        else:
            self._planejador_cache[key] = None

        return self._planejador_cache[key]

    def _write_raw(self, relative_path: Path, content: str) -> None:
        target = self.raw_dir / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    def _ensure_iterable(self, payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, dict):
            if "items" in payload and isinstance(payload["items"], list):
                return [item for item in payload["items"] if isinstance(item, dict)]
            return [payload]
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        return []

    def _safe_int(self, value: Any) -> Optional[int]:
        try:
            return int(str(value))
        except (TypeError, ValueError):
            return None

    def _resolve_modality(self, year: int, course_id: int) -> str:
        modalities = self.get_modalities(year=year, course_id=course_id)
        for modality in modalities:
            if modality.selected:
                return modality.code
        if modalities:
            return modalities[0].code
        return "AA"

    def _arvore_params(self, *, course_id: int, catalogo: int, modality: str) -> Dict[str, Any]:
        return {
            "curso": course_id,
            "modalidade": modality,
            "catalogo": str(catalogo),
            "periodo": self.periodo_default,
            "cp": self.cp_default,
        }
