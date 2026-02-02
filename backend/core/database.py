"""
Core Database Module
Single source of truth for database connection
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from typing import Optional
import os
import logging

logger = logging.getLogger(__name__)

# Global database instances
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None
_fs: Optional[AsyncIOMotorGridFSBucket] = None


async def init_database() -> AsyncIOMotorDatabase:
    """Initialize database connection"""
    global _client, _db, _fs
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'fomo_voice_club')
    
    _client = AsyncIOMotorClient(mongo_url)
    _db = _client[db_name]
    _fs = AsyncIOMotorGridFSBucket(_db)
    
    logger.info(f"Database connected: {db_name}")
    return _db


async def close_database():
    """Close database connection"""
    global _client
    if _client:
        _client.close()
        logger.info("Database connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """Get database instance - use as FastAPI dependency"""
    if _db is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return _db


def get_gridfs() -> AsyncIOMotorGridFSBucket:
    """Get GridFS instance for file storage"""
    if _fs is None:
        raise RuntimeError("GridFS not initialized. Call init_database() first.")
    return _fs


# FastAPI Dependency
async def get_database() -> AsyncIOMotorDatabase:
    """FastAPI dependency for database injection"""
    return get_db()
