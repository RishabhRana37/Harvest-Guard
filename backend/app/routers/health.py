from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.db import db_client
from app.config import settings
from app.services import inference

router = APIRouter(tags=["Health"])

@router.get("/ping")
async def ping():
    """
    Lightweight health-ping check for fast uptime monitoring.
    Does not check DB or load model.
    """
    return {"ok": True}

@router.get("/health")
async def health_check():
    """
    Service readiness health check endpoint.
    Verifies connection to MongoDB and reports application status.
    Returns 200 ready only if warmup succeeded, otherwise 503 not-ready.
    """
    connected = await db_client.ping()
    db_status = "connected" if connected else "down"

    is_ready = bool(inference.warmup_succeeded)
    status_str = "ready" if is_ready else "not-ready"
    status_code = 200 if is_ready else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": status_str,
            "model_loaded": inference.warmup_succeeded,
            "db": db_status,
            "version": settings.VERSION
        }
    )



