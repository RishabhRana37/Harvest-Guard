import uuid
import time
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.utils.limiter import limiter

from app.config import settings
from app.db import get_client, db_client
from app.routers.health import router as health_router
from app.routers.diagnose import router as diagnose_router
from app.routers.diseases import router as diseases_router
from app.routers.scans import router as scans_router
from app.routers.feedback import router as feedback_router
from app.routers.metrics import router as metrics_router
from app.routers.report import router as report_router

from app.services.inference import load_model_artifacts, initialize_disease_cache, warmup
from app.services.metrics import metrics_tracker
from app.utils.errors import (
    AppError,
    request_id_var,
    app_error_handler,
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("app.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting CropDoc AI Backend Service...")
    # Initialize Motor client and run ping verification
    try:
        connected = await db_client.ping()
        if connected:
            logger.info("Successfully connected to MongoDB.")
            # Ensure indexes exist
            db = db_client.get_db()
            await db.scans.create_index([("device_id", 1), ("created_at", -1)])
            await db.feedback.create_index([("scan_id", 1)])
            logger.info("Created indexes on scans and feedback collections.")
        else:
            logger.warning("Failed to connect to MongoDB during startup. Using local JSON database.")
    except Exception as e:
        logger.error(f"Error checking MongoDB connection during startup: {e}")

        
    # Load ML Model artifacts
    load_model_artifacts()
    # Initialize memory disease cache for top_k names mapping
    await initialize_disease_cache()
    # Run a warmup prediction to initialize TF graphs
    warmup()
    
    yield

    # Shutdown actions
    logger.info("Shutting down CropDoc AI Backend Service...")
    # Global client cleanup
    client = get_client()
    if client:
        client.close()
        logger.info("MongoDB client connection closed.")

# Shared rate limiter imported from app.utils.limiter

app = FastAPI(
    title="CropDoc AI API",
    version=settings.VERSION,
    description="Crop disease detection backend API co-locating REST routing and model inference",
    lifespan=lifespan
)
app.state.limiter = limiter

# CORS configuration
# Parsed from comma-separated env origins
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Custom Structured JSON Logging Middleware
class JsonLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        
        response = await call_next(request)
        
        process_time_ms = (time.perf_counter() - start_time) * 1000
        req_id = request_id_var.get("req_unknown")
        
        log_data = {
            "request_id": req_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "total_ms": round(process_time_ms, 2)
        }
        
        if request.url.path.endswith("/diagnose"):
            log_data["is_leaf"] = getattr(request.state, "is_leaf", None)
            log_data["predicted_slug"] = getattr(request.state, "predicted_slug", None)
            log_data["confidence"] = getattr(request.state, "confidence", None)
            log_data["latency_breakdown"] = {
                "preprocess_ms": round(getattr(request.state, "preprocess_ms", 0.0), 2),
                "infer_ms": round(getattr(request.state, "infer_ms", 0.0), 2),
                "gradcam_ms": round(getattr(request.state, "gradcam_ms", 0.0), 2)
            }
            
        print(json.dumps(log_data))
        logger.info(json.dumps(log_data))
        
        # Record metrics in-memory
        metrics_tracker.record_request(response.status_code)
        
        return response

# Global Request ID Middleware
class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate a unique request ID (prefixed with req_)
        req_id = f"req_{uuid.uuid4().hex[:16]}"
        # Set the request ID in the context variable for the duration of this request
        token = request_id_var.set(req_id)
        try:
            response = await call_next(request)
            # Add request ID to response headers
            response.headers["X-Request-Id"] = req_id
            return response
        finally:
            # Clean up context variable
            request_id_var.reset(token)

app.add_middleware(JsonLoggingMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestIdMiddleware)

# Register uniform error envelope handlers
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Custom Rate Limit Handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    req_id = request_id_var.get("req_unknown")
    retry_after = getattr(exc, "retry_after", 60)
    
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "RATE_LIMITED",
                "message": f"Rate limit exceeded. Please try again after {retry_after} seconds.",
                "request_id": req_id
            }
        },
        headers={
            "Retry-After": str(retry_after)
        }
    )

# Include routers under /api/v1 prefix
api_v1_router = APIRouter(prefix=settings.API_V1_STR)
api_v1_router.include_router(health_router)
api_v1_router.include_router(diagnose_router)
api_v1_router.include_router(diseases_router)
api_v1_router.include_router(scans_router)
api_v1_router.include_router(feedback_router)
api_v1_router.include_router(metrics_router)
api_v1_router.include_router(report_router)

app.include_router(api_v1_router)

# Basic root endpoint
@app.get("/")
def read_root():
    return {
        "service": "CropDoc AI API",
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1_prefix": settings.API_V1_STR
    }
