from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db.catalog import CatalogRepository, get_catalog_repo


class CurriculumOption(BaseModel):
    curriculum_id: int
    year: int
    modalidade: str
    modalidade_label: Optional[str] = None


class CurriculumSummary(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    options: List[CurriculumOption]


class DisciplineResponse(BaseModel):
    disciplina_id: Optional[str] = None
    codigo: str
    nome: str
    creditos: Optional[int] = None
    catalogo: Optional[int] = None
    tipo: Optional[str] = None
    semestre: Optional[int] = None
    modalidade: Optional[str] = None
    cp_group: Optional[int] = None
    status: Optional[str] = None
    missing: Optional[bool] = None
    tem: Optional[bool] = None
    pode: Optional[bool] = None
    obs: Optional[str] = None
    color: Optional[str] = None
    metadata: dict = {}
    prereqs: List[List[str]] = []


class CurriculumDetailResponse(BaseModel):
    curriculum_id: int
    course: dict
    year: int
    modalidade: str
    modalidade_label: Optional[str] = None
    parameters: dict
    disciplinas_obrigatorias: List[DisciplineResponse]
    disciplinas_eletivas: List[DisciplineResponse]
    disciplines: List[DisciplineResponse]


router = APIRouter()


@router.get("/", response_model=List[CurriculumSummary])
async def get_curriculums(repo: CatalogRepository = Depends(get_catalog_repo)):
    """Lista todos os currículos disponíveis agrupados por curso."""
    items = repo.list_curriculums()
    return items


@router.get("/{course_id}", response_model=CurriculumDetailResponse)
async def get_curriculum(
    course_id: int,
    year: Optional[int] = None,
    modalidade: Optional[str] = None,
    repo: CatalogRepository = Depends(get_catalog_repo),
):
    """
    Retorna um currículo específico para o curso informado.
    - `year`: filtra por ano específico (mais recente por padrão)
    - `modalidade`: filtra por modalidade (ex.: CO, AX)
    """
    data = repo.get_curriculum(course_id=course_id, year=year, modality_code=modalidade)

    def to_model(entry: dict) -> DisciplineResponse:
        metadata = entry.get("metadata") or {}
        return DisciplineResponse(
            **{
                **{k: v for k, v in entry.items() if k != "metadata"},
                "metadata": metadata,
            }
        )

    detail = CurriculumDetailResponse(
        curriculum_id=data["curriculum_id"],
        course=data["course"],
        year=data["year"],
        modalidade=data["modalidade"],
        modalidade_label=data["modalidade_label"],
        parameters=data["parameters"],
        disciplinas_obrigatorias=[to_model(d) for d in data["disciplinas_obrigatorias"]],
        disciplinas_eletivas=[to_model(d) for d in data["disciplinas_eletivas"]],
        disciplines=[to_model(d) for d in data["disciplines"]],
    )
    return detail
