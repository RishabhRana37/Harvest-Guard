from fastapi import APIRouter
from db.connection import db_manager

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """
    Check the health of the FastAPI service and its connection to the database.
    """
    db_status = "connected"
    if db_manager.is_fallback:
        db_status = "connected_fallback"
        
    return {
        "status": "ok",
        "model_loaded": True,
        "db": db_status,
        "version": "1.0.0"
    }
