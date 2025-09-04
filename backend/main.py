from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(
    title="GDE API",
    description="API para o sistema GDE - Grade DAC Online",
    version="1.0.0"
)

# Configuração CORS para permitir requisições do app mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique os domínios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas
app.include_router(router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "GDE API está funcionando!", "status": "online", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2025-09-03"}

@app.get("/test")
async def test_endpoint():
    return {
        "message": "Endpoint de teste funcionando!",
        "data": {
            "courses": ["MC102", "MC202", "MC302"],
            "total": 3
        }
    }

@app.get("/popup-message")
async def popup_message():
    return {
        "title": "🎉 Sucesso na Comunicação!",
        "message": "O backend FastAPI respondeu com sucesso!\n\n✅ Servidor: Online\n✅ API: Funcionando\n✅ Integração: Perfeita",
        "timestamp": "2025-09-03",
        "status": "success",
        "backend_info": {
            "framework": "FastAPI",
            "version": "1.0.0",
            "endpoint": "/popup-message"
        }
    }

@app.get("/api/v1/test")
async def test_endpoint():
    return {"message": "Endpoint de teste funcionando!", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
