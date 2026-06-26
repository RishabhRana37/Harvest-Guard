import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status
from models.schemas import DiseaseListResponse, Disease
from db.connection import db_manager

logger = logging.getLogger("harvest_guard.routers.diseases")
router = APIRouter(prefix="/diseases", tags=["Knowledge Base"])

@router.get("", response_model=DiseaseListResponse)
async def list_diseases(
    crop: Optional[str] = Query(None, description="Filter by crop name (e.g. Tomato)"),
    q: Optional[str] = Query(None, description="Search term in name or symptoms"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=50, description="Page size")
):
    """
    Search and filter crop diseases in the knowledge base.
    """
    all_diseases = await db_manager.list_diseases()
    
    filtered_items = []
    for item in all_diseases:
        # Pydantic conversion validation checks
        disease = Disease(**item)
        
        # Apply crop filter
        if crop and disease.crop.lower() != crop.lower():
            continue
            
        # Apply query search
        if q:
            query = q.lower()
            in_name = query in disease.name.lower()
            in_crop = query in disease.crop.lower()
            in_symptoms = any(query in sym.lower() for sym in disease.symptoms)
            in_pathogen = query in disease.pathogen.lower()
            
            if not (in_name or in_crop or in_symptoms or in_pathogen):
                continue
                
        filtered_items.append(disease)
        
    # Paginate results
    total = len(filtered_items)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_items = filtered_items[start:end]
    
    return DiseaseListResponse(
        items=paginated_items,
        page=page,
        page_size=page_size,
        total=total
    )

@router.get("/{slug}", response_model=Disease)
async def get_disease(slug: str):
    """
    Get detailed information about a specific crop disease by slug.
    """
    disease_dict = await db_manager.get_disease(slug)
    if not disease_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Unknown disease slug."
                }
            }
        )
    return Disease(**disease_dict)
