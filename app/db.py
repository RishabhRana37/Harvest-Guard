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
        if collection_name == "diseases":
            filename = "diseases_seed.json"
        elif collection_name == "scans":
            filename = "scans_fallback.json"
        elif collection_name == "feedback":
            filename = "feedback_fallback.json"
        else:
            filename = f"{collection_name}_fallback.json"
            
        self.filepath = os.path.join(os.path.dirname(__file__), "data", filename)
        self._data = []
        self._load_fallback_data()

    def _load_fallback_data(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                logger.info(f"Loaded {len(self._data)} fallback items for {self.name} from {self.filepath}")
            except Exception as e:
                logger.error(f"Failed to load fallback data for {self.name}: {e}")

    def _parse_dates(self, doc: dict) -> dict:
        if not doc:
            return doc
        doc_copy = dict(doc)
        from datetime import datetime
        if "created_at" in doc_copy and isinstance(doc_copy["created_at"], str):
            try:
                dt_str = doc_copy["created_at"]
                if dt_str.endswith("Z"):
                    dt_str = dt_str[:-1] + "+00:00"
                doc_copy["created_at"] = datetime.fromisoformat(dt_str)
            except Exception:
                pass
        return doc_copy

    async def insert_one(self, doc: dict):
        doc_copy = dict(doc)
        if "_id" not in doc_copy:
            import uuid
            doc_copy["_id"] = str(uuid.uuid4())
            
        from datetime import datetime
        for k, v in list(doc_copy.items()):
            if isinstance(v, datetime):
                doc_copy[k] = v.isoformat()
            elif isinstance(v, list):
                new_list = []
                for item in v:
                    if isinstance(item, dict):
                        new_dict = {}
                        for ik, iv in item.items():
                            if isinstance(iv, datetime):
                                new_dict[ik] = iv.isoformat()
                            else:
                                new_dict[ik] = iv
                        new_list.append(new_dict)
                    else:
                        new_list.append(item)
                doc_copy[k] = new_list
                
        self._data.append(doc_copy)
        self._save_fallback_data()

    async def find_one(self, query: dict) -> dict:
        for item in self._data:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                return self._parse_dates(item)
        return None

    async def count_documents(self, query: dict) -> int:
        return len(self._apply_query(query))

    def _apply_query(self, query: dict) -> list:
        results = self._data
        filtered = []
        for item in results:
            match = True
            for k, v in query.items():
                if k == "crop":
                    item_crop = item.get("crop", "")
                    if isinstance(v, dict) and "$regex" in v:
                        rx = re.compile(v["$regex"], re.IGNORECASE)
                        if not rx.search(str(item_crop)):
                            match = False
                            break
                    else:
                        if str(item_crop).lower() != str(v).lower():
                            match = False
                            break
                elif k == "$or":
                    or_match = False
                    for cond in v:
                        cond_match = True
                        for ck, cv in cond.items():
                            val = item.get(ck)
                            if val is None:
                                cond_match = False
                                break
                            if isinstance(cv, dict) and "$regex" in cv:
                                rx = re.compile(cv["$regex"], re.IGNORECASE)
                                if isinstance(val, list):
                                    if not any(rx.search(str(x)) for x in val):
                                        cond_match = False
                                        break
                                elif not rx.search(str(val)):
                                    cond_match = False
                                    break
                            else:
                                if str(cv).lower() not in str(val).lower():
                                    cond_match = False
                                    break
                        if cond_match:
                            or_match = True
                            break
                    if not or_match:
                        match = False
                        break
                else:
                    if item.get(k) != v:
                        match = False
                        break
            if match:
                filtered.append(self._parse_dates(item))
                
        return filtered

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
    """Cursor wrapper supporting skip, limit, sort and to_list methods for pagination."""
    def __init__(self, data: list, projection: dict = None):
        self._data = data
        self._projection = projection
        self._skip = 0
        self._limit = len(data)

    def sort(self, *args, **kwargs):
        try:
            self._data = sorted(
                self._data,
                key=lambda x: x.get("created_at").isoformat() if hasattr(x.get("created_at"), "isoformat") else str(x.get("created_at")),
                reverse=True
            )
        except Exception:
            pass
        return self

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
