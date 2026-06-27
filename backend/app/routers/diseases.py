import logging
import time
from typing import Optional, Dict, Any, Tuple

from fastapi import APIRouter, Query, status

from app.db import get_db
from app.schemas import DiseaseListResponse, Disease
from app.utils.errors import AppError

logger = logging.getLogger("app.routers.diseases")
router = APIRouter(prefix="/diseases", tags=["Knowledge Base"])

# Cache structures with TTL of 60 seconds
_list_cache: Dict[Tuple[Optional[str], Optional[str], int, int, str], Tuple[float, DiseaseListResponse]] = {}
_detail_cache: Dict[Tuple[str, str], Tuple[float, Disease]] = {}
CACHE_TTL = 60.0

def invalidate_cache():
    _list_cache.clear()
    _detail_cache.clear()
    logger.info("Disease in-memory cache cleared/invalidated.")

@router.post("/seed", status_code=status.HTTP_200_OK)
async def seed_diseases():
    """
    Idempotently seed the diseases collection from diseases_seed.json and invalidate the cache.
    """
    import os
    import json
    
    # Invalidate cache
    invalidate_cache()
    
    # Seed DB
    db = get_db()
    seed_path = os.path.join(os.path.dirname(__file__), "..", "data", "diseases_seed.json")
    if not os.path.exists(seed_path):
        seed_path = os.path.join(os.path.dirname(__file__), "..", "app", "data", "diseases_seed.json")
        
    if os.path.exists(seed_path):
        try:
            with open(seed_path, "r", encoding="utf-8") as f:
                diseases = json.load(f)
            for doc in diseases:
                slug = doc["slug"]
                await db.diseases.update_one(
                    {"slug": slug},
                    {"$set": doc},
                    upsert=True
                )
            logger.info(f"Successfully seeded {len(diseases)} diseases in database.")
            
            # Reload ML class index cache
            from app.services.inference import initialize_disease_cache
            await initialize_disease_cache()
            
            return {"status": "success", "seeded": len(diseases)}
        except Exception as e:
            logger.error(f"Seeding failed: {e}")
            raise AppError(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code="INTERNAL_ERROR",
                message=f"Seeding failed: {e}"
            )
    return {"status": "error", "message": "Seed file not found."}

@router.get("", response_model=DiseaseListResponse)
async def list_diseases(
    crop: Optional[str] = Query(None, description="Filter by crop name (e.g. Tomato)"),
    q: Optional[str] = Query(None, description="Search term in name or symptoms"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=50, description="Page size"),
    lang: str = Query("en", description="Language code")
):
    """
    List and search crop diseases in the knowledge base.
    """
    cache_key = (crop, q, page, page_size, lang.lower())
    now = time.time()
    if cache_key in _list_cache:
        ts, cached_res = _list_cache[cache_key]
        if now - ts < CACHE_TTL:
            logger.info(f"Disease list cache hit for key: {cache_key}")
            return cached_res

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
                "image_url": 1,
                "i18n": 1
            }
        ).skip(skip).limit(page_size)
        
        items = await cursor.to_list(length=page_size)
        
        # Format items to match schema (Pydantic will validate default/null values for other fields)
        lightweight_items = []
        for item in items:
            from app.utils.i18n import localize_disease
            loc_item = localize_disease(item, lang)
            lightweight_items.append(
                Disease(
                    slug=loc_item["slug"],
                    crop=loc_item["crop"],
                    name=loc_item["name"],
                    pathogen=loc_item.get("pathogen", "None"),
                    is_healthy=loc_item["is_healthy"],
                    symptoms=loc_item.get("symptoms", []),
                    cause=loc_item.get("cause", ""),
                    lifecycle=loc_item.get("lifecycle", ""),
                    treatments=loc_item.get("treatments", {"organic": [], "chemical": [], "prevention": []}),
                    confused_with=loc_item.get("confused_with", []),
                    image_url=loc_item.get("image_url")
                )
            )
            
        res_data = DiseaseListResponse(
            items=lightweight_items,
            page=page,
            page_size=page_size,
            total=total
        )
        # Store in cache
        _list_cache[cache_key] = (time.time(), res_data)
        return res_data
    except Exception as e:
        logger.error(f"Error querying diseases knowledge base: {e}", exc_info=True)
        # Fallback to database down error
        raise AppError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="MODEL_UNAVAILABLE", # Map database errors or similar
            message="Database query failed or connection is unavailable."
        )

@router.get("/{slug}", response_model=Disease)
async def get_disease(slug: str, lang: str = Query("en", description="Language code")):
    """
    Get detailed information about a specific crop disease by slug.
    """
    now = time.time()
    cache_key = (slug, lang.lower())
    if cache_key in _detail_cache:
        ts, cached_res = _detail_cache[cache_key]
        if now - ts < CACHE_TTL:
            logger.info(f"Disease detail cache hit for key: {cache_key}")
            return cached_res

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
        from app.utils.i18n import localize_disease
        loc_disease_dict = localize_disease(disease_dict, lang)
        res_data = Disease(**loc_disease_dict)
        # Store in cache
        _detail_cache[cache_key] = (time.time(), res_data)
        return res_data
    except AppError:
        raise
    except Exception as e:
        logger.error(f"Error fetching disease slug '{slug}': {e}", exc_info=True)
        raise AppError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="MODEL_UNAVAILABLE",
            message="Database query failed or connection is unavailable."
        )
