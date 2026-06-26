import logging
import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Query, Header, HTTPException, status
from models.schemas import (
    ScanListResponse, 
    ScanSummary, 
    DiagnosisResult, 
    FeedbackRequest, 
    FeedbackResponse
)
from db.connection import db_manager

logger = logging.getLogger("harvest_guard.routers.scans")
router = APIRouter(tags=["Scans & Feedback"])

@router.get("/scans", response_model=ScanListResponse)
async def list_scans(
    x_device_id: str = Header(..., description="Anonymous client device identity"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    crop: Optional[str] = Query(None),
    severity: Optional[str] = Query(None)
):
    """
    Get scan history associated with the X-Device-Id.
    """
    # Fetch all scans for this device
    query = {"device_id": x_device_id}
    if crop:
        # Search is case insensitive
        query["prediction.crop"] = crop.capitalize()
    if severity:
        query["severity"] = severity.lower()
        
    all_scans = await db_manager.list_scans(query)
    
    summaries = []
    for item in all_scans:
        # Transform full DiagnosisResult record to ScanSummary layout
        pred = item.get("prediction")
        predicted = None
        if pred:
            predicted = {
                "slug": pred.get("slug"),
                "crop": pred.get("crop"),
                "name": pred.get("name"),
                "prob": pred.get("prob")
            }
            
        summaries.append(ScanSummary(
            scan_id=item["scan_id"],
            created_at=item["created_at"],
            predicted=predicted,
            confidence=item.get("confidence"),
            confidence_band=item.get("confidence_band"),
            severity=item.get("severity"),
            is_leaf=item.get("is_leaf", True),
            # In production, image_thumb_ref would resolve to a URL. 
            # We fallback to the primary Base64 image or a mock URL.
            thumb_url=item.get("local_image_url") or item.get("heatmap") or "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        ))
        
    total = len(summaries)
    start = (page - 1) * page_size
    end = start + page_size
    
    return ScanListResponse(
        items=summaries[start:end],
        page=page,
        page_size=page_size,
        total=total
    )

@router.get("/scans/{id}", response_model=DiagnosisResult)
async def get_scan_by_id(
    id: str,
    x_device_id: str = Header(..., description="Anonymous client device identity")
):
    """
    Retrieve details of a single scan. Re-verification of client ownership is enforced.
    """
    scan = await db_manager.get_scan(id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Scan not found."
                }
            }
        )
        
    # Check device ownership to prevent unauthorized data exposure
    if scan.get("device_id") != x_device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Access denied for this scan."
                }
            }
        )
        
    return DiagnosisResult(**scan)

@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    body: FeedbackRequest,
    x_device_id: str = Header(..., description="Anonymous client device identity")
):
    """
    Collect thumbs-up/down ratings on diagnosis accuracy for offline retraining pipelines.
    """
    # Verify scan exists and belongs to this device
    scan = await db_manager.get_scan(body.scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Referenced scan does not exist."
                }
            }
        )
        
    if scan.get("device_id") != x_device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Cannot submit feedback for a scan you do not own."
                }
            }
        )
        
    feedback_id = "feed_" + str(uuid.uuid4().hex[:12])
    feedback_doc = {
        "feedback_id": feedback_id,
        "scan_id": body.scan_id,
        "device_id": x_device_id,
        "agreed": body.agreed,
        "corrected_slug": body.corrected_slug,
        "note": body.note,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    
    await db_manager.save_feedback(feedback_doc)
    
    return FeedbackResponse(
        feedback_id=feedback_id,
        scan_id=body.scan_id,
        received=True
    )
