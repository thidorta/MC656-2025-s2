from fastapi import APIRouter, HTTPException
from typing import List

router = APIRouter()

# Dados temporários de currículos
fake_curriculum = [
    {
        "id": 1,
        "curso": "Ciência da Computação",
        "ano": 2023,
        "disciplinas_obrigatorias": ["MC102", "MC202", "MC302"],
        "disciplinas_eletivas": ["MC656", "MC750"]
    }
]

@router.get("/")
async def get_curriculums():
    """Retorna lista de todos os currículos"""
    return fake_curriculum

@router.get("/{curriculum_id}")
async def get_curriculum(curriculum_id: int):
    """Retorna um currículo específico por ID"""
    curriculum = next((curr for curr in fake_curriculum if curr["id"] == curriculum_id), None)
    if curriculum is None:
        raise HTTPException(status_code=404, detail="Currículo não encontrado")
    return curriculum
