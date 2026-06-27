from fastapi import APIRouter
from app.services.metrics import metrics_tracker

router = APIRouter(tags=["Metrics"])

@router.get("/metrics")
def get_metrics_endpoint():
    """
    Exposes in-memory server metrics: total request counts, error rate,
    OOD-rejections, and p50/p95 latency percentiles for the diagnose endpoint.
    """
    return metrics_tracker.get_metrics()
