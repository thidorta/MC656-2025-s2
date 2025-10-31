from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
import requests
import os
from pathlib import Path

from bs4 import BeautifulSoup


JSON = Union[Dict[str, Any], List[Dict[str, Any]]]


class GDEClient:
    """Stub client for GDE JSON endpoints.

    This class defines method signatures only; implementation will be added later.
    """

    def __init__(self, session: requests.Session, base_url: str) -> None:
        """Initialize the client with a pre-authenticated session and base URL."""
        self.session = session
        self.base_url = base_url.rstrip("/")

    def get_courses(self, year: int) -> JSON:
        """List courses for a given catalog year (JSON)."""
        raise NotImplementedError("GDEClient.get_courses (stub)")

    def get_offers(self, year: int, course_id: str) -> JSON:
        """List class offers for a given year and course (JSON)."""
        raise NotImplementedError("GDEClient.get_offers (stub)")

    def get_curriculum(self, course_id: str, year: int) -> JSON:
        """Get curriculum structure for a course and year (JSON)."""
        raise NotImplementedError("GDEClient.get_curriculum (stub)")

    def get_prereqs(self, course_id: str, year: int) -> JSON:
        """Get prerequisites for a course and year (JSON)."""
        raise NotImplementedError("GDEClient.get_prereqs (stub)")

    def get_semester_map(self, course_id: str, year: int) -> JSON:
        """Get recommended semester mapping for a course and year (JSON)."""
        raise NotImplementedError("GDEClient.get_semester_map (stub)")

    # -------------------- HTML/XHR helpers --------------------

    def _default_headers_html(self) -> Dict[str, str]:
        return {
            "Accept": "text/html, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        }

    def _default_headers_json(self) -> Dict[str, str]:
        return {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        }

    def _join(self, path: str) -> str:
        p = path if path.startswith("/") else "/" + path
        return f"{self.base_url}{p}"

    def _request_text(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        save_raw_to: Optional[str] = None,
        timeout: float = 20.0,
    ) -> str:
        url = self._join(path)
        resp = self.session.get(url, params=params or {}, headers=self._default_headers_html(), timeout=timeout)
        resp.raise_for_status()
        text = resp.text or ""
        if save_raw_to:
            raw_path = Path(save_raw_to)
            os.makedirs(raw_path.parent.as_posix(), exist_ok=True)
            raw_path.write_text(text, encoding="utf-8")
        return text

    def _request_json(
        self,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        save_raw_to: Optional[str] = None,
        timeout: float = 20.0,
    ) -> Optional[Any]:
        url = self._join(path)
        resp = self.session.get(url, params=params or {}, headers=self._default_headers_json(), timeout=timeout)
        resp.raise_for_status()
        body_text = resp.text or ""
        if save_raw_to:
            raw_path = Path(save_raw_to)
            os.makedirs(raw_path.parent.as_posix(), exist_ok=True)
            raw_path.write_text(body_text, encoding="utf-8")
        ctype = resp.headers.get("Content-Type", "").lower()
        if "application/json" in ctype or body_text.strip().startswith(('{', '[')):
            try:
                return resp.json()
            except Exception:
                return None
        return None

    # -------------------- Public HTML endpoint: modalidades --------------------

    def get_modalities(
        self,
        *,
        course_id: int,
        year: int,
        selected: str = "AA",
        order: int = 1,
    ) -> List[Dict[str, Union[str, bool]]]:
        html = self._request_text(
            "ajax/modalidades.php",
            params={"c": course_id, "a": year, "s": selected, "o": order},
            save_raw_to=f"data/raw/{year}/modalidades_c{course_id}_a{year}_s{selected}_o{order}.html",
        )

        soup = BeautifulSoup(html or "", "html.parser")
        select = soup.find("select", id="modalidade")
        options: List[Dict[str, Union[str, bool]]] = []
        if not select:
            return options

        for opt in select.find_all("option"):
            code = (opt.get("value") or "").strip()
            if not code:
                continue
            label = opt.get_text(strip=True)
            is_sel = opt.has_attr("selected")
            options.append({"code": code, "label": label, "selected": bool(is_sel)})
        return options

    # -------------------- Public JSON/HTML endpoint: courses --------------------

    def get_courses(self, year: int) -> JSON:
        """List courses for a given catalog year.

        Tries JSON endpoint first; falls back to parsing an HTML <select id="curso"> if needed.
        """
        # Attempt JSON (typical for XHR endpoints)
        json_raw = self._request_json(
            "ajax/cursos.php",
            params={"a": year},
            save_raw_to=f"data/raw/{year}/cursos_a{year}.json",
        )
        if json_raw is not None:
            return json_raw  # type: ignore[return-value]

        # Fallback to HTML fragment with <select id="curso">
        html = self._request_text(
            "ajax/cursos.php",
            params={"a": year},
            save_raw_to=f"data/raw/{year}/cursos_a{year}.html",
        )

        soup = BeautifulSoup(html or "", "html.parser")
        select = soup.find("select", id="curso")
        items: List[Dict[str, Any]] = []
        if not select:
            return items
        for opt in select.find_all("option"):
            cid = (opt.get("value") or "").strip()
            if not cid:
                continue
            label = opt.get_text(strip=True)
            items.append({"curso_id": cid, "nome": label})
        return items

    # -------------------- Public JSON/HTML endpoint: curriculum/arvore --------------------

    def _normalize_node(self, obj: Dict[str, Any]) -> Dict[str, Any]:
        code = (
            obj.get("code")
            or obj.get("codigo")
            or obj.get("sigla")
            or obj.get("id")
            or ""
        )
        name = obj.get("name") or obj.get("nome") or obj.get("title") or ""
        period_raw = obj.get("period") or obj.get("semestre") or 0
        try:
            period = int(period_raw) if str(period_raw).isdigit() else 0
        except Exception:
            period = 0
        category = obj.get("category") or obj.get("tipo") or None
        return {"code": str(code), "name": str(name), "period": period, "category": category}

    def _normalize_edge(self, obj: Dict[str, Any]) -> Dict[str, Any]:
        src = obj.get("src") or obj.get("from") or obj.get("origem") or obj.get("de") or ""
        dst = obj.get("dst") or obj.get("to") or obj.get("destino") or obj.get("para") or ""
        etype = obj.get("type") or obj.get("tipo") or "prereq"
        return {"src": str(src), "dst": str(dst), "type": str(etype)}

    def get_curriculum(self, course_id: int, year: int, modality: str = "AA") -> Dict[str, Any]:
        """Fetch curriculum graph for a given course/year/modality.

        Preference is JSON. If not JSON, falls back to parsing minimal HTML anchors inside the curriculum container.
        Always saves one RAW response per call.
        """
        raw_base = f"data/raw/{year}/arvore_c{course_id}_a{year}_s{modality}"

        payload = self._request_json(
            "ajax/arvore.php",
            params={"c": course_id, "a": year, "s": modality},
            save_raw_to=f"{raw_base}.json",
        )
        if payload is not None:
            nodes_src: List[Dict[str, Any]] = []
            edges_src: List[Dict[str, Any]] = []
            if isinstance(payload, dict):
                nodes_src = list(payload.get("nodes") or payload.get("disciplinas") or [])  # type: ignore[assignment]
                edges_src = list(payload.get("edges") or payload.get("links") or [])  # type: ignore[assignment]
            elif isinstance(payload, list):
                nodes_src = payload  # type: ignore[assignment]

            nodes = [self._normalize_node(n) for n in nodes_src if isinstance(n, dict)]
            edges = [self._normalize_edge(e) for e in edges_src if isinstance(e, dict)]

            return {
                "course_id": course_id,
                "year": year,
                "modality": modality,
                "nodes": nodes,
                "edges": edges,
            }

        # HTML fallback
        html = self._request_text(
            "ajax/arvore.php",
            params={"c": course_id, "a": year, "s": modality},
            save_raw_to=f"{raw_base}.html",
        )

        soup = BeautifulSoup(html or "", "html.parser")
        container = soup.find(id="integralizacao") or soup
        nodes_map: Dict[str, Dict[str, Any]] = {}
        for a in container.find_all("a", class_="sigla"):
            code = (a.get_text(strip=True) or "").strip()
            if not code:
                continue
            name = (a.get("title") or "").strip()
            nodes_map[code] = {"code": code, "name": name, "period": 0, "category": None}

        nodes = list(nodes_map.values())
        edges: List[Dict[str, Any]] = []

        return {
            "course_id": course_id,
            "year": year,
            "modality": modality,
            "nodes": nodes,
            "edges": edges,
        }
