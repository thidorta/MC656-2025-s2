from __future__ import annotations

from typing import Any, Dict, List, Union
import requests


JSON = Union[Dict[str, Any], List[Dict[str, Any]]]


class GDEClient:
    """Stub client for GDE JSON endpoints.

    This class defines method signatures only; implementation will be added later.
    """

    def __init__(self, session: requests.Session, base_url: str) -> None:
        """Initialize the client with a pre-authenticated session and base URL."""
        raise NotImplementedError("GDEClient.__init__ (stub)")

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

