# app/routers/model.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/model/info")
async def model_info():
    from app.services.inference import engine
    return {
        "loaded": engine.is_loaded,
        "backbone": "MobileNetV2",
        "num_classes": len(engine.class_index) if engine.is_loaded else 0,
        "input_size": [224, 224],
        "temperature": getattr(engine, "temperature", None),
        "tau_low": getattr(engine, "tau_low", None),
        "metrics": getattr(engine, "metrics", {}),   # load from metrics.json at startup
        "version": "1.0.0",
    }
