from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from ..collectors.config import CATALOGO_TARGET, CP_TARGET, PERIODO_TARGET
from ..parsers.arvore_parsers import parse_disciplinas_from_integralizacao


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
    """Client for GDE JSON endpoints with HTML fallback for parity."""

    def __init__(self, base_url: str, session: requests.Session) -> None:
        self.base_url = base_url if base_url.endswith("/") else f"{base_url}/"
        self.session = session
        self.project_root = Path(__file__).resolve().parents[2]
        self.raw_dir = self.project_root / RAW_SUBDIR

        self.paths = {
            "courses": os.getenv("GDE_PATH_COURSES", "api/courses"),
            "offers": os.getenv("GDE_PATH_OFFERS", "api/offers"),
            "curriculum": os.getenv("GDE_PATH_CURRICULUM", "api/curriculum"),
            "prereqs": os.getenv("GDE_PATH_PREREQS", "api/prereqs"),
            "semester_map": os.getenv("GDE_PATH_SEM_MAP", "api/semester-map"),
            "modalities": os.getenv("GDE_PATH_MODALITIES", "api/offers"),
            "arvore": os.getenv("GDE_PATH_ARVORE", "arvore/"),
        }

        self.catalogo_default = os.getenv("GDE_CATALOGO_DEFAULT", CATALOGO_TARGET)
        self.periodo_default = os.getenv("GDE_PERIODO_DEFAULT", PERIODO_TARGET)
        self.cp_default = os.getenv("GDE_CP_DEFAULT", CP_TARGET)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_modalities(self, year: int, course_id: int) -> List[Modality]:
        payload = self._request_json(
            self.paths["modalities"],
            params={"year": year, "courseId": course_id},
            raw_name=Path(str(year)) / f"modalidades_c{course_id}_{year}.json",
        )
        modalities: List[Modality] = []
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
            "ajax/modalidades.php",
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
        payload = self._request_json(
            self.paths["courses"],
            params={"year": year},
            raw_name=Path(str(year)) / "courses.json",
        )
        courses: List[Course] = []
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
        payload = self._request_json(
            self.paths["offers"],
            params={"year": year, "courseId": course_id},
            raw_name=Path(str(year)) / f"offers_c{course_id}.json",
        )
        offers: List[Offer] = []
        if payload:
            items = self._ensure_iterable(payload)
            for item in items:
                course_code = str(item.get("courseCode") or item.get("code") or item.get("curso") or course_id)
                term = item.get("term") or item.get("ano_semestre")
                class_id = item.get("classId") or item.get("turma")
                offers.append(Offer(course_code=course_code, term=term, class_id=class_id, raw=item))
        if offers:
            return offers

        # HTML fallback: extract placeholder offers from curriculum page
        curriculum = self.get_curriculum(course_id=course_id, year=year)
        for node in curriculum.nodes:
            offers.append(Offer(course_code=node.code, term=None, class_id=None))
        return offers

    def get_curriculum(self, course_id: int, year: int) -> Curriculum:
        payload = self._request_json(
            self.paths["curriculum"],
            params={"year": year, "courseId": course_id},
            raw_name=Path(str(year)) / f"curriculum_c{course_id}.json",
        )
        modality = self._resolve_modality(year=year, course_id=course_id)
        if payload:
            nodes: List[CurriculumNode] = []
            edges: List[CurriculumEdge] = []
            items = payload.get("nodes") if isinstance(payload, dict) else payload
            if isinstance(items, list):
                for item in items:
                    code = str(item.get("code") or item.get("sigla") or item.get("id") or "").strip()
                    if not code:
                        continue
                    name = str(item.get("name") or item.get("nome") or code)
                    period = self._safe_int(item.get("period") or item.get("semestre")) or 0
                    category = item.get("category") or item.get("tipo")
                    nodes.append(CurriculumNode(code=code, name=name, period=period, category=category))
            raw_edges = payload.get("edges") if isinstance(payload, dict) else []
            if isinstance(raw_edges, list):
                for edge in raw_edges:
                    src = str(edge.get("src") or edge.get("from") or "").strip()
                    dst = str(edge.get("dst") or edge.get("to") or "").strip()
                    if not src or not dst:
                        continue
                    etype = str(edge.get("type") or edge.get("tipo") or "prereq")
                    edges.append(CurriculumEdge(src=src, dst=dst, type=etype))
            return Curriculum(course_id=course_id, year=year, modality=modality, nodes=nodes, edges=edges)

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
        payload = self._request_json(
            self.paths["prereqs"],
            params={"year": year, "courseId": course_id},
            raw_name=Path(str(year)) / f"prereqs_c{course_id}.json",
        )
        prereqs: List[Prereq] = []
        if payload:
            items = self._ensure_iterable(payload)
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
        payload = self._request_json(
            self.paths["semester_map"],
            params={"year": year, "courseId": course_id},
            raw_name=Path(str(year)) / f"semester_map_c{course_id}.json",
        )
        entries: List[SemesterEntry] = []
        if payload:
            items = self._ensure_iterable(payload)
            for item in items:
                code = str(item.get("code") or item.get("disciplina") or "").strip()
                if not code:
                    continue
                semester = self._safe_int(item.get("recommendedSemester") or item.get("semestre"))
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
        raw_name: Optional[Path] = None,
        timeout: float = 20.0,
    ) -> Optional[Any]:
        url = self._build_url(path)
        try:
            response = self.session.get(
                url,
                params=params,
                headers={
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "X-Requested-With": "XMLHttpRequest",
                },
                timeout=timeout,
            )
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
