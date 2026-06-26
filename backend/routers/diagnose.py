import logging
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, Header, HTTPException, status
from models.schemas import DiagnosisResult, Prediction
from services.inference_service import inference_engine
from db.connection import db_manager

logger = logging.getLogger("harvest_guard.routers.diagnose")
router = APIRouter(tags=["Diagnosis"])

@router.post("/diagnose", response_model=DiagnosisResult)
async def diagnose_leaf(
    image: UploadFile = File(...),
    crop_hint: Optional[str] = Form(None),
    x_device_id: str = Header(..., description="Anonymous client device identity")
):
    """
    Ingest a crop leaf image, validate format/size, perform OOD check,
    predict disease, generate Grad-CAM explainability overlay, and return diagnosis.
    """
    # 1. Validate MIME type
    if image.content_type not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "error": {
                    "code": "UNSUPPORTED_MEDIA",
                    "message": "Only JPEG, PNG, and WebP images are supported."
                }
            }
        )
        
    # Read file bytes to check size and execute OOD check
    file_bytes = await image.read()
    
    # 2. Validate file size (max 8MB)
    MAX_SIZE = 8 * 1024 * 1024
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "error": {
                    "code": "IMAGE_TOO_LARGE",
                    "message": "Uploaded leaf image exceeds maximum limit of 8MB."
                }
            }
        )
        
    # 3. Validate image integrity
    if not inference_engine.validate_image(file_bytes):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "INVALID_IMAGE",
                    "message": "The uploaded file could not be decoded as a valid image."
                }
            }
        )
        
    # 4. Out-of-Distribution Leaf Check
    is_leaf, img_pil = inference_engine.check_is_leaf(file_bytes)
    scan_id = "scan_" + str(uuid.uuid4().hex[:12])
    created_at = datetime.utcnow().isoformat() + "Z"
    
    if not is_leaf:
        # Non-leaf OOD response structure
        result = DiagnosisResult(
            scan_id=scan_id,
            created_at=created_at,
            is_leaf=False,
            is_confident=False,
            confidence=None,
            confidence_band=None,
            severity=None,
            urgency_days=None,
            prediction=None,
            top_k=[],
            heatmap=None,
            disease=None
        )
        
        # Save scan in history anyway for OOD tracking
        await db_manager.save_scan({
            **result.model_dump(),
            "device_id": x_device_id
        })
        
        return result

    # 5. Calibrate and Predict
    predicted_slug, confidence, confidence_band, top_k = inference_engine.run_prediction(crop_hint)
    
    # Fetch database profile enrichment
    disease_dict = await db_manager.get_disease(predicted_slug)
    
    # Assess severity and urgency
    is_healthy = "healthy" in predicted_slug
    severity, urgency_days = inference_engine.calculate_severity(is_healthy)
    
    # 6. Generate Grad-CAM heat overlay
    heatmap = None
    if not is_healthy:
        heatmap = inference_engine.generate_heatmap(severity)
        
    # Assemble predictions list matching response models
    top_k_objs = [
        Prediction(slug=p["slug"], crop=p["crop"], name=p["name"], prob=p["prob"]) 
        for p in top_k
    ]
    
    primary_pred = next((p for p in top_k_objs if p.slug == predicted_slug), top_k_objs[0])
    
    result = DiagnosisResult(
        scan_id=scan_id,
        created_at=created_at,
        is_leaf=True,
        is_confident=(confidence_band != "low"),
        confidence=confidence,
        confidence_band=confidence_band,
        severity=severity,
        urgency_days=urgency_days,
        prediction=primary_pred,
        top_k=top_k_objs,
        heatmap=heatmap,
        disease=disease_dict
    )
    
    # Save scan to DB history linked to anonymous client identity
    await db_manager.save_scan({
        **result.model_dump(),
        "device_id": x_device_id
    })
    
    return result
