import os
import json
import logging
from db.connection import db_manager

logger = logging.getLogger("harvest_guard.seed")

async def seed_diseases():
    try:
        # Resolve path to diseases_seed.json
        current_dir = os.path.dirname(os.path.dirname(__file__))
        seed_path = os.path.join(current_dir, "data", "diseases_seed.json")
        
        if not os.path.exists(seed_path):
            logger.error(f"Seeding file not found at {seed_path}")
            return
            
        with open(seed_path, "r", encoding="utf-8") as f:
            diseases = json.load(f)
            
        logger.info(f"Loaded {len(diseases)} diseases from seed file. Seeding database...")
        
        for disease in diseases:
            await db_manager.save_disease(disease)
            
        logger.info("Database seeding completed successfully.")
    except Exception as e:
        logger.error(f"Error during database seeding: {e}")
