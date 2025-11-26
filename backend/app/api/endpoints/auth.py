from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Usuário e senha temporários
TEMP_USERNAME = "teste"
TEMP_PASSWORD = "123"

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    if not payload.username or not payload.password:
        raise HTTPException(status_code=400, detail="Credenciais obrigatórias")

    # Validação temporária
    if payload.username != TEMP_USERNAME or payload.password != TEMP_PASSWORD:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = f"dev-token-{payload.username}"
    return LoginResponse(access_token=token)
