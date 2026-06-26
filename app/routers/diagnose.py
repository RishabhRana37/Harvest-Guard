import io
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional
from PIL import Image
from fastapi import APIRouter, File, UploadFile, Form, Header

from app.config import settings
from app.schemas import DiagnosisResult, Prediction, Disease, TreatmentPlan, Treatment
from app.utils.errors import AppError
from app.services import preprocess, inference
from app.db import get_db

router = APIRouter(tags=["Diagnosis"])

@router.post("/diagnose", response_model=DiagnosisResult)
async def diagnose_leaf(
    image: UploadFile = File(...),
    crop_hint: Optional[str] = Form(None),
    x_device_id: str = Header(..., alias="X-Device-Id", description="Anonymous client device identity")
):
    """
    Ingest a crop leaf image, run size and format validations, run real
    deep-learning model inference using MobileNetV2 with temperature calibration,
    enrich predictions with disease knowledge base, and return results.
    """
    # 0. Check model availability
    if not inference.model_loaded:
        raise AppError(
            status_code=503,
            code="MODEL_UNAVAILABLE",
            message="The diagnosis model is currently unavailable."
        )

    # 1. MIME-type validation
    mime = (image.content_type or "").lower()
    if mime not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
        raise AppError(
            status_code=415,
            code="UNSUPPORTED_MEDIA",
            message="Unsupported media type. Only JPEG, PNG, and WebP formats are supported."
        )

    # 2. File size validation
    file_bytes = await image.read()
    if len(file_bytes) > settings.MAX_UPLOAD_BYTES:
        raise AppError(
            status_code=413,
            code="IMAGE_TOO_LARGE",
            message=f"Uploaded image exceeds the maximum allowed size of {settings.MAX_UPLOAD_BYTES // (1024 * 1024)}MB."
        )

    # 3. Image decodability check via Pillow
    try:
        img_temp = Image.open(io.BytesIO(file_bytes))
        img_temp.verify()
    except Exception:
        raise AppError(
            status_code=422,
            code="INVALID_IMAGE",
            message="The uploaded file could not be read or decoded as a valid image."
        )

    # 4. Preprocessing in thread pool
    loop = asyncio.get_running_loop()
    try:
        img = await loop.run_in_executor(None, preprocess.load_image, file_bytes)
        input_array = await loop.run_in_executor(None, preprocess.to_model_input, img)
    except Exception as e:
        raise AppError(
            status_code=422,
            code="INVALID_IMAGE",
            message=f"Failed to preprocess the leaf image: {e}"
        )

    # 5. Model Inference & Temperature scaling in thread pool
    try:
        calibrated_probs = await loop.run_in_executor(None, inference.predict, input_array)
    except Exception as e:
        raise AppError(
            status_code=500,
            code="INTERNAL_ERROR",
            message=f"Model inference failed: {e}"
        )

    # 6. Extract predictions
    prediction, top_k = inference.get_predictions(calibrated_probs)

    # 7. Database enrichment
    db = get_db()
    disease_doc = await db.diseases.find_one({"slug": prediction.slug})
    if not disease_doc:
        raise AppError(
            status_code=404,
            code="NOT_FOUND",
            message=f"Disease metadata not found for slug: {prediction.slug}"
        )
    disease = Disease(**disease_doc)

    # 8. Urgency & Severity mapping logic
    is_healthy = disease_doc.get("is_healthy", False)
    if is_healthy:
        severity = "healthy"
        urgency_days = None
    else:
        severity = disease_doc.get("severity_default", "mild")
        if severity == "mild":
            urgency_days = 3
        elif severity == "severe":
            urgency_days = 1
        else:
            urgency_days = 3

    # 9. Calibration confidence and band mapping
    confidence = prediction.prob
    if confidence >= 0.80:
        confidence_band = "high"
    elif confidence >= 0.60:
        confidence_band = "medium"
    else:
        confidence_band = "low"
    is_confident = confidence >= inference.tau_low

    scan_id = f"scan_{uuid.uuid4().hex[:16]}"
    created_at = datetime.now(timezone.utc)

    result = DiagnosisResult(
        scan_id=scan_id,
        created_at=created_at,
        is_leaf=True,
        is_confident=is_confident,
        confidence=confidence,
        confidence_band=confidence_band,
        severity=severity,
        urgency_days=urgency_days,
        prediction=prediction,
        top_k=top_k,
        heatmap=None,
        disease=disease
    )

    return result

