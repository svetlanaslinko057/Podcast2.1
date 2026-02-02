from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os

# MongoDB connection (configured in server.py)
# Environment variables are already loaded in server.py

async def get_database():
    from server import db
    return db

async def get_gridfs():
    from server import fs
    return fs