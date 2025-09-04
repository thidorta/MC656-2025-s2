from fastapi import APIRouter
# Importações temporariamente comentadas até criarmos os endpoints
# from app.api.endpoints import courses, curriculum

router = APIRouter()

# Rota temporária para teste
@router.get("/test")
async def test_endpoint():
    return {"message": "API funcionando!"}

# Incluir endpoints (comentado temporariamente)
# router.include_router(courses.router, prefix="/courses", tags=["courses"])
# router.include_router(curriculum.router, prefix="/curriculum", tags=["curriculum"])
