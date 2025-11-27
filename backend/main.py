import os
import logging
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config.settings import get_settings
from app.db.catalog import open_catalog_connection
from app.db.user_store import init_user_db

# Configure basic logging to ensure app logs appear in the console (including reload worker)
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="GDE API",
    description="API para o sistema GDE - Grade DAC Online",
    version="1.0.0",
)

# CORS configuravel via env; padrao limitado a localhost dev
allowed_origins = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:19006,http://localhost:3000,http://localhost:8081,http://127.0.0.1:8081",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
init_user_db()


@app.get("/")
async def root():
    return {
        "message": "GDE API online",
        "status": "online",
        "version": app.version,
    }


@app.get("/health")
async def health_check():
    settings = get_settings()
    catalog_ok = settings.catalog_db_path.exists()
    user_db_ok = settings.user_auth_db_path.exists()
    db_ok = False
    try:
        conn = open_catalog_connection(settings)
        conn.execute("SELECT 1")
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False

    status = "healthy" if (catalog_ok and db_ok) else "degraded"
    return {
        "status": status,
        "catalog_db_path": str(settings.catalog_db_path),
        "catalog_db_ok": catalog_ok and db_ok,
        "user_db_root": str(settings.user_db_root),
        "user_db_ok": user_db_ok,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
