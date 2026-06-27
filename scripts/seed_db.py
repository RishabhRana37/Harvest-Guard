import os
import json
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("seed_db")

# Import settings and db helpers from app
# We add current directory to path in execution if needed, or import directly
from app.config import settings

async def seed():
    # 1. Load seed JSON
    seed_file_path = os.path.join("app", "data", "diseases_seed.json")
    if not os.path.exists(seed_file_path):
        logger.error(f"Seed file not found at {seed_file_path}")
        return
        
    with open(seed_file_path, "r", encoding="utf-8") as f:
        diseases = json.load(f)
        
    logger.info(f"Loaded {len(diseases)} diseases from seed file.")

    # 2. Connect to MongoDB
    logger.info(f"Connecting to MongoDB with URI: {settings.MONGODB_URI}")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    
    # 3. Create unique index on slug and index on class_index
    logger.info("Ensuring collection indexes...")
    await db.diseases.create_index([("slug", ASCENDING)], unique=True)
    await db.diseases.create_index([("class_index", ASCENDING)])
    logger.info("Indexes verified.")

    # 4. Idempotently upsert each record
    logger.info("Upserting seed documents...")
    for doc in diseases:
        slug = doc["slug"]
        await db.diseases.update_one(
            {"slug": slug},
            {"$set": doc},
            upsert=True
        )
    
    logger.info("Database seeding complete.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
