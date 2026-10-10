from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.core.database import engine, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):

    init_db()
    yield



app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Gozel Esnaf — Yerel Ön Muhasebe Sistemi (Gozel Software)",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

from backend.app.api.router import api_v1_router
app.include_router(api_v1_router)


@app.get("/", tags=["Genel"])
def root_info():
    return {
        "app": settings.APP_NAME,
        "developer": settings.DEVELOPER,
        "version": settings.APP_VERSION,
        "status": "calisiyor",
        "docs": "/docs",
    }


@app.get("/health", tags=["Sistem"])
@app.get("/api/health", tags=["Sistem"])
def health_check():
    try:
        with engine.connect() as conn:
            journal_mode = conn.execute(text("PRAGMA journal_mode;")).scalar()
            foreign_keys = conn.execute(text("PRAGMA foreign_keys;")).scalar()
        return {
            "status": "ok",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "database": {
                "status": "connected",
                "journal_mode": str(journal_mode).upper(),
                "foreign_keys_enabled": bool(foreign_keys),
            },
        }
    except Exception as e:
        return {
            "status": "error",
            "app": settings.APP_NAME,
            "error": "Veritabanı bağlantı hatası",
            "detail": str(e),
        }
