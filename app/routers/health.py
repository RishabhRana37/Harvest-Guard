from fastapi import APIRouter
from app.db import get_db
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """
    Service health check endpoint.
    Verifies connection to MongoDB and reports application status.
    """
    db_status = "down"
    try:
        db = get_db()
        # Ping the database to verify live connectivity
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "down"

    return {
        "status": "ok",
        "model_loaded": False,
        "db": db_status,
        "version": settings.VERSION
    }
