import io
import uuid
import logging
import asyncio
import time
from datetime import datetime, timezone
from typing import Optional
from PIL import Image
from fastapi import APIRouter, File, UploadFile, Form, Header, BackgroundTasks, Request

from app.config import settings
from app.schemas import DiagnosisResult, Prediction, Disease, TreatmentPlan, Treatment
from app.utils.errors import AppError
from app.services import preprocess, inference
from app.utils.limiter import limiter
from app.services.metrics import metrics_tracker
from app.db import get_db

logger = logging.getLogger("app.routers.diagnose")

async def save_scan_history(scan_doc: dict):
    """
    Persist scan document to MongoDB (scans collection).
    Catches all exceptions to ensure it is completely non-blocking/silent.
    """
    try:
        db = get_db()
        await db.scans.insert_one(scan_doc)
        logger.info(f"Scan {scan_doc.get('scan_id')} persisted successfully in background.")
    except Exception as e:
        logger.error(f"Failed to persist scan in background: {e}")

def make_thumbnail_b64(img: Image.Image) -> str:
    try:
        resample = Image.Resampling.LANCZOS
    except AttributeError:
        try:
            resample = Image.LANCZOS
        except AttributeError:
            resample = Image.ANTIALIAS
            
    thumb = img.resize((96, 96), resample)
    buf = io.BytesIO()
    thumb.convert("RGB").save(buf, format="JPEG", quality=85)
    import base64
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"

from asyncio import Semaphore
router = APIRouter(tags=["Diagnosis"])

# In-process semaphore limiting concurrent inferences to 2
inference_semaphore = Semaphore(2)

async def _diagnose_leaf_internal(
    request: Request,
    background_tasks: BackgroundTasks,
    x_device_id: str,
    loop,
    t_start: float,
    input_array,
    original_np,
    quality_res,
    thumb_uri
) -> DiagnosisResult:
    # 5. Model Inference with Test-Time Augmentation (TTA) in thread pool
    from app.services.tta import tta_probs
    import numpy as np
    infer_start = time.perf_counter()
    try:
        calibrated_probs = await loop.run_in_executor(None, tta_probs, inference, input_array)
    except Exception as e:
        raise AppError(
            status_code=500,
            code="INTERNAL_ERROR",
            message=f"Model inference failed: {e}"
        )
    infer_ms = (time.perf_counter() - infer_start) * 1000
    request.state.infer_ms = infer_ms

    probs = calibrated_probs[0]
    max_prob = float(np.max(probs))
    entropy = float(-np.sum(probs * np.log(probs + 1e-15)))

    # 5.b Quality Assessment in thread pool
    from app.services.quality import assess_quality
    quality_res = await loop.run_in_executor(None, assess_quality, original_np)
    
    # If not is_acceptable AND model max prob is low, we reject
    if not quality_res["is_acceptable"] and max_prob < inference.tau_low:
        tips_str = " ".join(quality_res["tips"])
        raise AppError(
            status_code=422,
            code="INVALID_IMAGE",
            message=f"Image quality is too poor for diagnosis. Tips: {tips_str}"
        )

    # 6. OOD leaf gate check in thread pool
    from app.services.ood import check_is_leaf
    is_leaf = await loop.run_in_executor(None, check_is_leaf, original_np, max_prob, entropy)
    request.state.is_leaf = is_leaf

    scan_id = f"scan_{uuid.uuid4().hex[:16]}"
    created_at = datetime.now(timezone.utc)

    if not is_leaf:
        request.state.predicted_slug = None
        request.state.confidence = None
        request.state.gradcam_ms = 0.0

        # Record metrics
        metrics_tracker.record_ood_rejection()
        metrics_tracker.record_diagnose_latency((time.perf_counter() - t_start) * 1000)

        # Return DiagnosisResult with is_leaf:false and other prediction/disease/heatmap fields as null
        from app.services.explain import generate_explanation
        explanation = generate_explanation({"is_leaf": False})

        scan_doc = {
            "_id": scan_id,
            "scan_id": scan_id,
            "created_at": created_at,
            "device_id": x_device_id,
            "predicted_slug": None,
            "confidence": None,
            "confidence_band": None,
            "is_leaf": False,
            "severity": None,
            "top_k": [],
            "thumb_b64": thumb_uri,
            "heatmap_b64": None,
            "quality": quality_res
        }
        background_tasks.add_task(save_scan_history, scan_doc)

        return DiagnosisResult(
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
            disease=None,
            explanation=explanation,
            quality=quality_res
        )

    request.state.is_leaf = True

    # 7. Extract predictions
    prediction, top_k = inference.get_predictions(calibrated_probs)

    # 8. Grad-CAM generation in thread pool
    from app.services.gradcam import gradcam_plus_plus, overlay_to_b64, active_fraction
    predicted_idx = int(np.argmax(probs))
    gradcam_start = time.perf_counter()
    try:
        raw_heatmap = await loop.run_in_executor(
            None,
            gradcam_plus_plus,
            inference.model,
            input_array,
            predicted_idx
        )
        heatmap_uri = await loop.run_in_executor(
            None,
            overlay_to_b64,
            original_np,
            raw_heatmap
        )
    except Exception as e:
        raise AppError(
            status_code=500,
            code="INTERNAL_ERROR",
            message=f"Failed to generate Grad-CAM explainability map: {e}"
        )
    gradcam_ms = (time.perf_counter() - gradcam_start) * 1000
    request.state.gradcam_ms = gradcam_ms

    # 9. Database enrichment
    db = get_db()
    disease_doc = await db.diseases.find_one({"slug": prediction.slug})
    if not disease_doc:
        raise AppError(
            status_code=404,
            code="NOT_FOUND",
            message=f"Disease metadata not found for slug: {prediction.slug}"
        )
    disease = Disease(**disease_doc)

    # 10. Severity grading logic
    is_healthy = disease_doc.get("is_healthy", False)
    if is_healthy:
        severity = "healthy"
        urgency_days = None
    else:
        fraction = active_fraction(raw_heatmap)
        if fraction < 0.30:
            severity = "mild"
            urgency_days = 3
        else:
            severity = "severe"
            urgency_days = 1

    # 11. Calibration confidence and band mapping
    confidence = prediction.prob
    if confidence >= 0.80:
        confidence_band = "high"
    elif confidence >= 0.60:
        confidence_band = "medium"
    else:
        confidence_band = "low"
    is_confident = confidence >= inference.tau_low

    # Set state values for Logging
    request.state.predicted_slug = prediction.slug
    request.state.confidence = confidence

    # Record latency in metrics tracker
    metrics_tracker.record_diagnose_latency((time.perf_counter() - t_start) * 1000)

    # Persist scan history in background including heatmap_b64
    scan_doc = {
        "_id": scan_id,
        "scan_id": scan_id,
        "created_at": created_at,
        "device_id": x_device_id,
        "predicted_slug": prediction.slug,
        "confidence": confidence,
        "confidence_band": confidence_band,
        "is_leaf": True,
        "severity": severity,
        "top_k": [{"slug": tk.slug, "prob": tk.prob} for tk in top_k],
        "thumb_b64": thumb_uri,
        "heatmap_b64": heatmap_uri,
        "quality": quality_res
    }
    background_tasks.add_task(save_scan_history, scan_doc)

    from app.services.explain import generate_explanation
    result_dict = {
        "is_leaf": True,
        "prediction": {"crop": prediction.crop, "name": prediction.name},
        "confidence_band": confidence_band,
        "confidence": confidence,
        "severity": severity,
        "urgency_days": urgency_days,
        "heatmap": heatmap_uri
    }
    explanation = generate_explanation(result_dict)

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
        heatmap=heatmap_uri,
        disease=disease,
        explanation=explanation,
        quality=quality_res
    )

    return result

@router.post("/diagnose", response_model=DiagnosisResult)
@limiter.limit("30/minute")
async def diagnose_leaf(
    request: Request,
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    crop_hint: Optional[str] = Form(None),
    x_device_id: str = Header(..., alias="X-Device-Id", description="Anonymous client device identity")
):
    """
    Ingest a crop leaf image, run size and format validations, run real
    deep-learning model inference using MobileNetV2 with temperature calibration,
    enrich predictions with disease knowledge base, and return results.
    """
    t_start = time.perf_counter()
    preprocess_start = time.perf_counter()

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

    # 4. Preprocessing in thread pool (with image sanitization)
    loop = asyncio.get_running_loop()
    try:
        sanitized_bytes, img = await loop.run_in_executor(None, preprocess.sanitize_image, file_bytes)
        import numpy as np
        original_np = np.array(img)
        input_array = await loop.run_in_executor(None, preprocess.to_model_input, img)
        thumb_uri = await loop.run_in_executor(None, make_thumbnail_b64, img)
    except AppError:
        raise
    except Exception as e:
        raise AppError(
            status_code=422,
            code="INVALID_IMAGE",
            message=f"Failed to preprocess the leaf image: {e}"
        )
    preprocess_ms = (time.perf_counter() - preprocess_start) * 1000
    request.state.preprocess_ms = preprocess_ms

    # Acquire semaphore to throttle parallel model inferences
    await inference_semaphore.acquire()
    try:
        return await _diagnose_leaf_internal(
            request=request,
            background_tasks=background_tasks,
            x_device_id=x_device_id,
            loop=loop,
            t_start=t_start,
            input_array=input_array,
            original_np=original_np,
            quality_res=None, # will be computed inside thread pool
            thumb_uri=thumb_uri
        )
    finally:
        inference_semaphore.release()
