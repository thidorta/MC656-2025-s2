from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
# Importação temporariamente comentada
# from app.models.course import Course, CourseCreate, CourseResponse

# Modelo temporário inline
class CourseResponse(BaseModel):
    id: int
    codigo: str
    nome: str
    creditos: int
    descricao: str

class CourseCreate(BaseModel):
    codigo: str
    nome: str
    creditos: int
    descricao: str

router = APIRouter()

# Dados temporários (depois será conectado com o banco)
fake_courses = [
    {
        "id": 1,
        "codigo": "MC102",
        "nome": "Algoritmos e Programação de Computadores",
        "creditos": 6,
        "descricao": "Introdução à programação de computadores"
    },
    {
        "id": 2,
        "codigo": "MC202",
        "nome": "Estruturas de Dados",
        "creditos": 6,
        "descricao": "Estruturas de dados fundamentais"
    }
]

@router.get("/", response_model=List[CourseResponse])
async def get_courses():
    """Retorna lista de todos os cursos"""
    return fake_courses

@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: int):
    """Retorna um curso específico por ID"""
    course = next((course for course in fake_courses if course["id"] == course_id), None)
    if course is None:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    return course

@router.get("/codigo/{course_code}", response_model=CourseResponse)
async def get_course_by_code(course_code: str):
    """Retorna um curso específico por código"""
    course = next((course for course in fake_courses if course["codigo"] == course_code), None)
    if course is None:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    return course

@router.post("/", response_model=CourseResponse)
async def create_course(course: CourseCreate):
    """Cria um novo curso"""
    new_id = max([course["id"] for course in fake_courses]) + 1
    new_course = {
        "id": new_id,
        **course.dict()
    }
    fake_courses.append(new_course)
    return new_course
