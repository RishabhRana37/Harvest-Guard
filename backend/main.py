import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.connection import db_manager
from db.seed import seed_diseases
from routers.health import router as health_router
from routers.diseases import router as diseases_router
from routers.scans import router as scans_router
from routers.diagnose import router as diagnose_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("harvest_guard")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Harvest-Guard Backend...")
    # Connect to database (MongoDB with local JSON fallback)
    await db_manager.connect()
    # Seed database with disease specifications
    await seed_diseases()
    yield
    # Shutdown actions
    logger.info("Shutting down Harvest-Guard Backend...")
    if db_manager.client:
        db_manager.client.close()
        logger.info("Database connections closed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for CropDoc AI (Harvest-Guard) Crop Disease Detection",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create and mount the API v1 router
api_v1_router = APIRouter(prefix=settings.API_V1_STR)
api_v1_router.include_router(health_router)
api_v1_router.include_router(diseases_router)
api_v1_router.include_router(scans_router)
api_v1_router.include_router(diagnose_router)

app.include_router(api_v1_router)

# Direct root endpoint
@app.get("/")
def read_root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "operational",
        "docs": "/docs",
        "api_prefix": settings.API_V1_STR
    }
