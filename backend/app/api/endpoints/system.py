from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/popup-message")
async def popup_message():
    now = datetime.now(tz=timezone.utc).isoformat()
    return {
        "title": "Backend online",
        "message": "O backend FastAPI respondeu com sucesso.",
        "timestamp": now,
        "status": "success",
        "backend_info": {
            "framework": "FastAPI",
            "version": "1.0.0",
            "endpoint": "/api/v1/popup-message",
        },
    }


@router.get("/test")
async def test_endpoint():
    return {"message": "API funcionando", "timestamp": datetime.now(tz=timezone.utc).isoformat()}
