import os
import json
import logging
import re
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("app.db")

class FallbackCollection:
    """A mock MongoDB collection querying local JSON files in-memory."""
    def __init__(self, collection_name: str):
        self.name = collection_name
        self.filepath = os.path.join(os.path.dirname(__file__), "data", "diseases_seed.json")
        self._data = []
        self._load_fallback_data()

    def _load_fallback_data(self):
        if self.name == "diseases" and os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                logger.info(f"Loaded {len(self._data)} fallback seed items from {self.filepath}")
            except Exception as e:
                logger.error(f"Failed to load fallback seed data: {e}")

    async def find_one(self, query: dict) -> dict:
        slug = query.get("slug")
        if slug:
            for item in self._data:
                if item.get("slug") == slug:
                    return item
        return None

    async def count_documents(self, query: dict) -> int:
        return len(self._apply_query(query))

    def _apply_query(self, query: dict) -> list:
        # Support simple query filters:
        # 1. crop match: {"crop": {"$regex": ..., "$options": "i"}}
        # 2. $or match: [{"name": ...}, {"symptoms": ...}]
        crop_filter = query.get("crop")
        or_filter = query.get("$or")
        
        results = self._data
        
        if crop_filter:
            if isinstance(crop_filter, dict) and "$regex" in crop_filter:
                pattern = crop_filter["$regex"]
                rx = re.compile(pattern, re.IGNORECASE)
                results = [item for item in results if rx.search(item.get("crop", ""))]
            else:
                crop_val = str(crop_filter).lower()
                results = [item for item in results if item.get("crop", "").lower() == crop_val]
                
        if or_filter:
            filtered = []
            for item in results:
                match = False
                for cond in or_filter:
                    for k, v in cond.items():
                        val = item.get(k)
                        if val is None:
                            continue
                        # If query is regex dict
                        if isinstance(v, dict) and "$regex" in v:
                            rx = re.compile(v["$regex"], re.IGNORECASE)
                            if isinstance(val, list):
                                if any(rx.search(str(x)) for x in val):
                                    match = True
                            elif rx.search(str(val)):
                                match = True
                        else:
                            val_str = str(val).lower()
                            query_str = str(v).lower()
                            if query_str in val_str:
                                match = True
                if match:
                    filtered.append(item)
            results = filtered
            
        return results

    def find(self, query: dict, projection: dict = None):
        matched = self._apply_query(query)
        return FallbackCursor(matched, projection)

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        slug = query.get("slug")
        doc = update.get("$set", {})
        if slug:
            for idx, item in enumerate(self._data):
                if item.get("slug") == slug:
                    self._data[idx] = {**item, **doc}
                    self._save_fallback_data()
                    return
            if upsert:
                self._data.append({**query, **doc})
                self._save_fallback_data()
                
    def _save_fallback_data(self):
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save fallback data: {e}")
            
    async def create_index(self, *args, **kwargs):
        pass


class FallbackCursor:
    """Cursor wrapper supporting skip, limit, and to_list methods for pagination."""
    def __init__(self, data: list, projection: dict = None):
        self._data = data
        self._projection = projection
        self._skip = 0
        self._limit = len(data)

    def skip(self, n: int):
        self._skip = n
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    async def to_list(self, length: int) -> list:
        sliced = self._data[self._skip : self._skip + self._limit]
        if not self._projection:
            return sliced
            
        projected = []
        for item in sliced:
            proj_item = {}
            for k, v in self._projection.items():
                if v == 1:
                    proj_item[k] = item.get(k)
            projected.append(proj_item)
        return projected


class FallbackDatabase:
    """Mock database matching MongoDB connection interface."""
    def __init__(self):
        self.diseases = FallbackCollection("diseases")
        self.scans = FallbackCollection("scans")
        self.feedback = FallbackCollection("feedback")


class DatabaseClient:
    """Handles connection to MongoDB via Motor, with local fallback checks."""
    def __init__(self):
        self.client = None
        self.is_connected = False
        self.fallback_db = None

    async def ping(self) -> bool:
        """Pings MongoDB and updates connectivity status flag."""
        if settings.MONGODB_URI:
            try:
                if not self.client:
                    self.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
                await self.client.admin.command("ping")
                self.is_connected = True
                return True
            except Exception:
                self.is_connected = False
                return False
        self.is_connected = False
        return False

    def get_db(self):
        """Returns the active database (MongoDB or local JSON Fallback database)."""
        if self.is_connected and self.client:
            return self.client[settings.DB_NAME]
        else:
            if not self.fallback_db:
                self.fallback_db = FallbackDatabase()
            return self.fallback_db

# Singleton instances
db_client = DatabaseClient()

def get_client() -> AsyncIOMotorClient:
    # Retained helper for startup lifespan loops
    if not db_client.client:
        db_client.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
    return db_client.client

def get_db():
    return db_client.get_db()
