from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os

_client: Optional[AsyncIOMotorClient] = None

def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        mongodb_uri = os.getenv("MONGODB_URI", "mongodb://10.60.184.61:27017")
        _client = AsyncIOMotorClient(
            mongodb_uri,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
        )
    return _client

def get_db():
    db_name = os.getenv("MONGODB_DB", "uno_online")
    return get_client()[db_name]

def get_rooms_collection():
    return get_db()["rooms"]

def get_games_collection():
    return get_db()["games"]