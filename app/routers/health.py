from fastapi import APIRouter
from app.db import db_client
from app.config import settings
from app.services import inference

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """
    Service health check endpoint.
    Verifies connection to MongoDB and reports application status.
    """
    connected = await db_client.ping()
    db_status = "connected" if connected else "down"

    return {
        "status": "ok",
        "model_loaded": inference.model_loaded,
        "db": db_status,
        "version": settings.VERSION
    }


