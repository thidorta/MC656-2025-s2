from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CurriculumParams:
    curso_id: int
    catalogo_id: int
    modalidade_id: str
    periodo_id: str
    cp: str

