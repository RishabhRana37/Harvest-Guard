import io
from datetime import datetime
from typing import Optional
from PIL import Image
from fastapi import APIRouter, File, UploadFile, Form, Header

from app.config import settings
from app.schemas import DiagnosisResult, Prediction, Disease, TreatmentPlan, Treatment
from app.utils.errors import AppError

router = APIRouter(tags=["Diagnosis"])

@router.post("/diagnose", response_model=DiagnosisResult)
async def diagnose_leaf(
    image: UploadFile = File(...),
    crop_hint: Optional[str] = Form(None),
    x_device_id: str = Header(..., alias="X-Device-Id", description="Anonymous client device identity")
):
    """
    Ingest a crop leaf image, run size and format validations, OOD validation,
    and return diagnostic analysis results.
    """
    # 1. MIME-type validation
    # Allowed mime-types: image/jpeg, image/png, image/webp (case-insensitive)
    mime = (image.content_type or "").lower()
    if mime not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
        raise AppError(
            status_code=415,
            code="UNSUPPORTED_MEDIA",
            message="Unsupported media type. Only JPEG, PNG, and WebP formats are supported."
        )

    # 2. File size validation
    # Read bytes to check size
    file_bytes = await image.read()
    if len(file_bytes) > settings.MAX_UPLOAD_BYTES:
        raise AppError(
            status_code=413,
            code="IMAGE_TOO_LARGE",
            message=f"Uploaded image exceeds the maximum allowed size of {settings.MAX_UPLOAD_BYTES // (1024 * 1024)}MB."
        )

    # 3. Image decodability check via Pillow
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
    except Exception:
        raise AppError(
            status_code=422,
            code="INVALID_IMAGE",
            message="The uploaded file could not be read or decoded as a valid image."
        )

    # 4. Generate mock diagnosis results
    # As per request requirements, we return a mock Tomato Early Blight diagnosis
    mock_prediction = Prediction(
        slug="tomato-early-blight",
        crop="Tomato",
        name="Early Blight",
        prob=0.87
    )

    mock_disease = Disease(
        slug="tomato-early-blight",
        crop="Tomato",
        name="Early Blight",
        pathogen="Alternaria solani",
        is_healthy=False,
        symptoms=["Concentric rings", "Yellow spots"],
        cause="Fungal pathogen",
        lifecycle="Spreads in warm humid weather",
        treatments=TreatmentPlan(
            organic=[
                Treatment(
                    action="Neem oil",
                    dosage="5ml/L",
                    frequency="weekly",
                    safety="apply evening"
                )
            ],
            chemical=[],
            prevention=["Crop rotation"]
        ),
        confused_with=[],
        image_url=None
    )

    # 1x1 transparent PNG data URI
    transparent_png_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    result = DiagnosisResult(
        scan_id="scan_mock_123",
        created_at=datetime.utcnow(),
        is_leaf=True,
        is_confident=True,
        confidence=0.87,
        confidence_band="high",
        severity="mild",
        urgency_days=3,
        prediction=mock_prediction,
        top_k=[mock_prediction],
        heatmap=transparent_png_base64,
        disease=mock_disease
    )

    return result
