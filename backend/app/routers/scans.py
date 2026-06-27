from typing import Optional
from fastapi import APIRouter, Header, Query
from app.db import get_db
from app.schemas import (
    DiagnosisResult, Prediction, Disease, ScanListResponse, ScanListItem,
    ScanPredictedInfo, ProgressionResponse, ProgressionItem
)
from app.utils.errors import AppError
from app.services import inference

router = APIRouter(tags=["Scans"])

@router.get("/scans", response_model=ScanListResponse)
async def list_scans(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    crop: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    x_device_id: str = Header(..., alias="X-Device-Id")
):
    """
    List user scan history, paginated and filtered by device, crop, and severity.
    Returns lightweight scan information newest-first.
    """
    db = get_db()
    
    # Fetch all scans for device_id from db (sorted newest-first)
    cursor = db.scans.find({"device_id": x_device_id}).sort("created_at", -1)
    
    if hasattr(cursor, "to_list"):
        all_scans = await cursor.to_list(length=1000)
    else:
        all_scans = await cursor.to_list(1000)
        
    # Map & Filter in memory (supports fallback and DB consistency)
    filtered_items = []
    for doc in all_scans:
        slug = doc.get("predicted_slug")
        disease_info = inference.disease_cache.get(slug, {"crop": "Unknown", "name": "Unknown"})
        
        # Apply crop filter if provided
        if crop and disease_info["crop"].lower() != crop.lower():
            continue
            
        # Apply severity filter if provided
        if severity and doc.get("severity") != severity:
            continue
            
        # Build predicted item info
        predicted_info = None
        if slug:
            predicted_info = ScanPredictedInfo(
                slug=slug,
                crop=disease_info["crop"],
                name=disease_info["name"],
                prob=doc.get("confidence", 0.0)
            )
            
        item = ScanListItem(
            scan_id=doc.get("_id") or doc.get("scan_id"),
            created_at=doc.get("created_at"),
            predicted=predicted_info,
            confidence=doc.get("confidence"),
            confidence_band=doc.get("confidence_band"),
            severity=doc.get("severity"),
            is_leaf=doc.get("is_leaf", True),
            thumb_url=doc.get("thumb_b64") or doc.get("thumb_url")
        )
        filtered_items.append(item)
        
    total = len(filtered_items)
    start = (page - 1) * page_size
    end = start + page_size
    items_paginated = filtered_items[start:end]
    
    return ScanListResponse(
        items=items_paginated,
        page=page,
        page_size=page_size,
        total=total
    )

@router.get("/scans/progression", response_model=ProgressionResponse)
async def get_progression(
    crop: str = Query(..., description="Crop filter (e.g. tomato)"),
    x_device_id: str = Header(..., alias="X-Device-Id")
):
    """
    Get user scan progression for a specific crop over time, ordered oldest to newest.
    Calculates a trend score based on severities.
    """
    db = get_db()
    cursor = db.scans.find({
        "device_id": x_device_id,
        "is_leaf": True
    }).sort("created_at", 1) # Oldest first

    if hasattr(cursor, "to_list"):
        scans_docs = await cursor.to_list(length=1000)
    else:
        scans_docs = await cursor.to_list(1000)

    items = []
    scores = []
    
    for doc in scans_docs:
        slug = doc.get("predicted_slug")
        if not slug:
            continue
            
        disease_info = inference.disease_cache.get(slug, {"crop": "Unknown", "name": "Unknown"})
        if disease_info["crop"].lower() != crop.lower():
            continue
            
        severity = doc.get("severity", "healthy")
        confidence = doc.get("confidence", 0.0)
        
        items.append(ProgressionItem(
            date=doc.get("created_at"),
            slug=slug,
            name=disease_info["name"],
            severity=severity,
            confidence=confidence
        ))
        
        # Mapping score: healthy=0, mild=1, severe=2
        severity_score = 0
        if severity == "mild":
            severity_score = 1
        elif severity == "severe":
            severity_score = 2
        scores.append(severity_score)

    # Heuristic trend check
    trend = "stable"
    if len(scores) >= 2:
        mid = len(scores) // 2
        first_half = scores[:mid]
        second_half = scores[mid:]
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)
        
        if avg_second > avg_first + 0.1:
            trend = "worsening"
        elif avg_second < avg_first - 0.1:
            trend = "improving"
        else:
            trend = "stable"

    return ProgressionResponse(items=items, trend=trend)

@router.get("/scans/{id}", response_model=DiagnosisResult)
async def get_single_scan(
    id: str,
    x_device_id: str = Header(..., alias="X-Device-Id")
):
    """
    Retrieve full DiagnosisResult for a scan. Enforces device ownership (403).
    Heatmap output is returned as null on re-fetch.
    """
    db = get_db()
    scan_doc = await db.scans.find_one({"_id": id})
    if not scan_doc:
        scan_doc = await db.scans.find_one({"scan_id": id})
        
    if not scan_doc:
        raise AppError(
            status_code=404,
            code="NOT_FOUND",
            message="Scan not found."
        )
        
    if scan_doc.get("device_id") != x_device_id:
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="Access denied to this scan history resource."
        )
        
    pred_slug = scan_doc.get("predicted_slug")
    disease_info = inference.disease_cache.get(pred_slug, {"crop": "Unknown", "name": "Unknown"})
    
    prediction = None
    if pred_slug:
        prediction = Prediction(
            slug=pred_slug,
            crop=disease_info["crop"],
            name=disease_info["name"],
            prob=scan_doc.get("confidence", 0.0)
        )
        
    top_k_list = []
    for tk in scan_doc.get("top_k", []):
        tk_slug = tk.get("slug")
        tk_info = inference.disease_cache.get(tk_slug, {"crop": "Unknown", "name": "Unknown"})
        top_k_list.append(
            Prediction(
                slug=tk_slug,
                crop=tk_info["crop"],
                name=tk_info["name"],
                prob=tk.get("prob") or tk.get("confidence") or 0.0
            )
        )
        
    disease = None
    if pred_slug:
        disease_doc = await db.diseases.find_one({"slug": pred_slug})
        if disease_doc:
            disease = Disease(**disease_doc)
            
    is_confident = scan_doc.get("is_confident", False)
    if "is_confident" not in scan_doc and scan_doc.get("confidence") is not None:
        is_confident = scan_doc.get("confidence", 0.0) >= inference.tau_low
        
    severity = scan_doc.get("severity")
    urgency_days = 1 if severity == "severe" else (None if severity == "healthy" else 3)

    from app.services.explain import generate_explanation
    result_dict = {
        "is_leaf": scan_doc.get("is_leaf", True),
        "prediction": {"crop": prediction.crop, "name": prediction.name} if prediction else None,
        "confidence_band": scan_doc.get("confidence_band"),
        "confidence": scan_doc.get("confidence"),
        "severity": severity,
        "urgency_days": urgency_days,
        "heatmap": scan_doc.get("heatmap_b64")
    }
    explanation = generate_explanation(result_dict)

    return DiagnosisResult(
        scan_id=id,
        created_at=scan_doc.get("created_at"),
        is_leaf=scan_doc.get("is_leaf", True),
        is_confident=is_confident,
        confidence=scan_doc.get("confidence"),
        confidence_band=scan_doc.get("confidence_band"),
        severity=severity,
        urgency_days=urgency_days,
        prediction=prediction,
        top_k=top_k_list,
        heatmap=scan_doc.get("heatmap_b64"),  # Return stored heatmap on re-fetch
        disease=disease,
        explanation=explanation
    )
