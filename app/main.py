import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.db import get_client, db_client
from app.routers.health import router as health_router
from app.routers.diagnose import router as diagnose_router
from app.routers.diseases import router as diseases_router
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
        else:
            logger.warning("Failed to connect to MongoDB during startup. Using local JSON database.")
    except Exception as e:
        logger.error(f"Error checking MongoDB connection during startup: {e}")
    yield
    # Shutdown actions
    logger.info("Shutting down CropDoc AI Backend Service...")
    # Global client cleanup
    client = get_client()
    if client:
        client.close()
        logger.info("MongoDB client connection closed.")

app = FastAPI(
    title="CropDoc AI API",
    version=settings.VERSION,
    description="Crop disease detection backend API co-locating REST routing and model inference",
    lifespan=lifespan
)

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

app.add_middleware(RequestIdMiddleware)

# Register uniform error envelope handlers
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers under /api/v1 prefix
api_v1_router = APIRouter(prefix=settings.API_V1_STR)
api_v1_router.include_router(health_router)
api_v1_router.include_router(diagnose_router)
api_v1_router.include_router(diseases_router)

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
