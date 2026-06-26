import os
import json
import logging
import asyncio
from typing import Dict, List, Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError

from config import settings

logger = logging.getLogger("harvest_guard.db")

class JSONFallbackDatabase:
    """
    A lightweight, file-based fallback database for local execution
    when MongoDB is not available.
    """
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.data: Dict[str, List[Any]] = {
            "diseases": [],
            "scans": [],
            "feedback": []
        }
        self.lock = asyncio.Lock()
        self._load()

    def _load(self):
        try:
            if os.path.exists(self.filepath):
                with open(self.filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    if content.strip():
                        self.data = json.loads(content)
                        # Ensure all expected collections exist
                        for key in ["diseases", "scans", "feedback"]:
                            if key not in self.data:
                                self.data[key] = []
                logger.info(f"Loaded fallback database from {self.filepath}")
            else:
                self._save_sync()
                logger.info(f"Initialized new fallback database at {self.filepath}")
        except Exception as e:
            logger.error(f"Error loading fallback database: {e}")

    def _save_sync(self):
        try:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving fallback database: {e}")

    async def save(self):
        async with self.lock:
            # Run blocking file write in executor
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self._save_sync)

    async def insert_one(self, collection: str, document: Dict[str, Any]) -> Dict[str, Any]:
        if collection not in self.data:
            self.data[collection] = []
        self.data[collection].append(document)
        await self.save()
        return document

    async def find(self, collection: str, query: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        docs = self.data.get(collection, [])
        if not query:
            return docs
            
        filtered = []
        for doc in docs:
            match = True
            for k, v in query.items():
                # Simple query matching (supports direct equality)
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                filtered.append(doc)
        return filtered

    async def find_one(self, collection: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        results = await self.find(collection, query)
        return results[0] if results else None


class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Any = None
        self.fallback_db: Optional[JSONFallbackDatabase] = None
        self.is_fallback: bool = False

    async def connect(self):
        fallback_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "db_fallback.json")
        
        if not settings.MONGODB_URI:
            logger.warning("MONGODB_URI is not set. Falling back to local JSON database.")
            self._init_fallback(fallback_path)
            return

        try:
            # Try to connect with a short timeout (2.5s) to fail fast if DB is down
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI, 
                serverSelectionTimeoutMS=2500
            )
            # Verify connection
            await self.client.admin.command('ping')
            self.db = self.client[settings.DB_NAME]
            self.is_fallback = False
            logger.info("Connected to MongoDB successfully.")
        except (ServerSelectionTimeoutError, Exception) as e:
            logger.error(f"MongoDB connection failed: {e}. Falling back to local JSON database.")
            if self.client:
                self.client.close()
            self._init_fallback(fallback_path)

    def _init_fallback(self, path: str):
        self.fallback_db = JSONFallbackDatabase(path)
        self.is_fallback = True

    # Database API wrappers
    async def get_disease(self, slug: str) -> Optional[Dict[str, Any]]:
        if self.is_fallback:
            return await self.fallback_db.find_one("diseases", {"slug": slug})
        else:
            return await self.db.diseases.find_one({"slug": slug})

    async def list_diseases(self, query: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        if self.is_fallback:
            return await self.fallback_db.find("diseases", query)
        else:
            cursor = self.db.diseases.find(query or {})
            return await cursor.to_list(length=100)

    async def save_disease(self, disease_data: Dict[str, Any]):
        if self.is_fallback:
            # Check if already exists to prevent duplicate seeding
            existing = await self.fallback_db.find_one("diseases", {"slug": disease_data["slug"]})
            if not existing:
                await self.fallback_db.insert_one("diseases", disease_data)
        else:
            await self.db.diseases.update_one(
                {"slug": disease_data["slug"]},
                {"$set": disease_data},
                upsert=True
            )

    async def save_scan(self, scan_data: Dict[str, Any]):
        if self.is_fallback:
            await self.fallback_db.insert_one("scans", scan_data)
        else:
            await self.db.scans.insert_one(scan_data)

    async def get_scan(self, scan_id: str) -> Optional[Dict[str, Any]]:
        if self.is_fallback:
            return await self.fallback_db.find_one("scans", {"scan_id": scan_id})
        else:
            return await self.db.scans.find_one({"scan_id": scan_id})

    async def list_scans(self, query: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        if self.is_fallback:
            scans = await self.fallback_db.find("scans", query)
            # Sort reverse chronological (newest first) by created_at
            scans.sort(key=lambda s: s.get("created_at", ""), reverse=True)
            return scans
        else:
            cursor = self.db.scans.find(query or {}).sort("created_at", -1)
            return await cursor.to_list(length=100)

    async def save_feedback(self, feedback_data: Dict[str, Any]):
        if self.is_fallback:
            await self.fallback_db.insert_one("feedback", feedback_data)
        else:
            await self.db.feedback.insert_one(feedback_data)

db_manager = DatabaseManager()
