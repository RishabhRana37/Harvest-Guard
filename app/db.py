import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("app.db")

# Global Motor client instance
_client = None

def get_client() -> AsyncIOMotorClient:
    """Get or initialize the global AsyncIOMotorClient instance."""
    global _client
    if _client is None:
        logger.info(f"Initializing Motor client with URI: {settings.MONGODB_URI}")
        _client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
    return _client

def get_db():
    """Dependency to retrieve the MongoDB database database."""
    client = get_client()
    return client[settings.DB_NAME]
