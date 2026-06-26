import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, status

from app.db import get_db
from app.schemas import DiseaseListResponse, Disease
from app.utils.errors import AppError

logger = logging.getLogger("app.routers.diseases")
router = APIRouter(prefix="/diseases", tags=["Knowledge Base"])

@router.get("", response_model=DiseaseListResponse)
async def list_diseases(
    crop: Optional[str] = Query(None, description="Filter by crop name (e.g. Tomato)"),
    q: Optional[str] = Query(None, description="Search term in name or symptoms"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=50, description="Page size")
):
    """
    List and search crop diseases in the knowledge base.
    """
    db = get_db()
    
    # Build filter query
    filter_query: Dict[str, Any] = {}
    
    if crop:
        # Case-insensitive crop match
        filter_query["crop"] = {"$regex": f"^{crop}$", "$options": "i"}
        
    if q:
        # Search in name and symptoms list
        filter_query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"symptoms": {"$regex": q, "$options": "i"}}
        ]
        
    try:
        # 1. Count total documents matching query
        total = await db.diseases.count_documents(filter_query)
        
        # 2. Query paginated results with lightweight projection
        skip = (page - 1) * page_size
        cursor = db.diseases.find(
            filter_query,
            projection={
                "slug": 1,
                "crop": 1,
                "name": 1,
                "is_healthy": 1,
                "image_url": 1
            }
        ).skip(skip).limit(page_size)
        
        items = await cursor.to_list(length=page_size)
        
        # Format items to match schema (Pydantic will validate default/null values for other fields)
        lightweight_items = []
        for item in items:
            # Pydantic validation handles missing properties with default/None values
            # We enforce casting to dict and returning them
            lightweight_items.append(
                Disease(
                    slug=item["slug"],
                    crop=item["crop"],
                    name=item["name"],
                    pathogen=item.get("pathogen", "None"),
                    is_healthy=item["is_healthy"],
                    symptoms=item.get("symptoms", []),
                    cause=item.get("cause", ""),
                    lifecycle=item.get("lifecycle", ""),
                    treatments=item.get("treatments", {"organic": [], "chemical": [], "prevention": []}),
                    confused_with=item.get("confused_with", []),
                    image_url=item.get("image_url")
                )
            )
            
        return DiseaseListResponse(
            items=lightweight_items,
            page=page,
            page_size=page_size,
            total=total
        )
    except Exception as e:
        logger.error(f"Error querying diseases knowledge base: {e}", exc_info=True)
        # Fallback to database down error
        raise AppError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="MODEL_UNAVAILABLE", # Map database errors or similar
            message="Database query failed or connection is unavailable."
        )

@router.get("/{slug}", response_model=Disease)
async def get_disease(slug: str):
    """
    Get detailed information about a specific crop disease by slug.
    """
    db = get_db()
    try:
        disease_dict = await db.diseases.find_one({"slug": slug})
        if not disease_dict:
            raise AppError(
                status_code=status.HTTP_404_NOT_FOUND,
                code="NOT_FOUND",
                message="Unknown disease slug."
            )
        # Parse into Pydantic model
        return Disease(**disease_dict)
    except AppError:
        raise
    except Exception as e:
        logger.error(f"Error fetching disease slug '{slug}': {e}", exc_info=True)
        raise AppError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="MODEL_UNAVAILABLE",
            message="Database query failed or connection is unavailable."
        )
