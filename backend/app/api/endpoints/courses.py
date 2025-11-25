from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.catalog import CatalogRepository, get_catalog_repo


class CourseResponse(BaseModel):
    id: int
    codigo: str
    nome: str
    creditos: Optional[int] = None
    descricao: Optional[str] = None


router = APIRouter()


@router.get("/", response_model=List[CourseResponse])
async def get_courses(repo: CatalogRepository = Depends(get_catalog_repo)):
    """Retorna lista de todos os cursos."""
    courses = repo.list_courses()
    return [CourseResponse(**course) for course in courses]


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: int, repo: CatalogRepository = Depends(get_catalog_repo)):
    """Retorna um curso especifico por ID."""
    course = repo.get_course_by_id(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    return CourseResponse(**course)


@router.get("/codigo/{course_code}", response_model=CourseResponse)
async def get_course_by_code(course_code: str, repo: CatalogRepository = Depends(get_catalog_repo)):
    """Retorna um curso especifico por código."""
    course = repo.get_course_by_code(course_code)
    if course is None:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    return CourseResponse(**course)


@router.post("/", response_model=CourseResponse, status_code=405)
async def create_course():
    """Catálogo é somente leitura."""
    raise HTTPException(status_code=405, detail="Catálogo é somente leitura")
