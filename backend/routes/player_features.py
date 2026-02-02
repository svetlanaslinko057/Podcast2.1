"""
Podcast Player Features Router
Handles bookmarks, chapters, and transcripts
"""
from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["player"])

# Shared database reference (will be set in server.py)
db = None

def set_db(database):
    global db
    db = database


class Chapter(BaseModel):
    title: str
    start_time: int  # seconds
    end_time: int  # seconds
    description: Optional[str] = None


class Bookmark(BaseModel):
    timestamp: int  # seconds
    note: Optional[str] = None


# ============= BOOKMARKS =============

@router.post("/podcasts/{podcast_id}/bookmarks")
async def add_bookmark(
    podcast_id: str,
    user_id: str = Form(...),
    timestamp: int = Form(...),
    note: Optional[str] = Form(None)
):
    """Add a bookmark to a podcast"""
    try:
        bookmark = {
            "user_id": user_id,
            "podcast_id": podcast_id,
            "timestamp": timestamp,
            "note": note,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Create bookmarks collection if not exists
        bookmarks_collection = db['bookmarks']
        result = await bookmarks_collection.insert_one(bookmark)
        
        bookmark["id"] = str(result.inserted_id)
        bookmark.pop("_id", None)
        
        logger.info(f"📌 Bookmark added: podcast={podcast_id}, timestamp={timestamp}")
        return JSONResponse(bookmark, status_code=201)
        
    except Exception as e:
        logger.error(f"Failed to add bookmark: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/bookmarks")
async def get_bookmarks(podcast_id: str, user_id: str):
    """Get all bookmarks for a podcast by user"""
    try:
        bookmarks_collection = db['bookmarks']
        
        bookmarks = await bookmarks_collection.find({
            "podcast_id": podcast_id,
            "user_id": user_id
        }).sort("timestamp", 1).to_list(100)
        
        # Convert ObjectId to string
        for bookmark in bookmarks:
            bookmark["id"] = str(bookmark["_id"])
            bookmark.pop("_id", None)
        
        return bookmarks
        
    except Exception as e:
        logger.error(f"Failed to get bookmarks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str, user_id: str):
    """Delete a bookmark"""
    try:
        bookmarks_collection = db['bookmarks']
        
        result = await bookmarks_collection.delete_one({
            "_id": ObjectId(bookmark_id),
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        
        logger.info(f"🗑️ Bookmark deleted: {bookmark_id}")
        return {"message": "Bookmark deleted"}
        
    except Exception as e:
        logger.error(f"Failed to delete bookmark: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= CHAPTERS =============

@router.post("/podcasts/{podcast_id}/chapters")
async def add_chapters(
    podcast_id: str,
    chapters: List[Chapter]
):
    """Add chapters to a podcast"""
    try:
        podcasts_collection = db['podcasts']
        
        chapters_data = [chapter.dict() for chapter in chapters]
        
        result = await podcasts_collection.update_one(
            {"_id": ObjectId(podcast_id)},
            {"$set": {"chapters": chapters_data}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        logger.info(f"📚 Chapters added: podcast={podcast_id}, count={len(chapters_data)}")
        return {"message": "Chapters added", "count": len(chapters_data)}
        
    except Exception as e:
        logger.error(f"Failed to add chapters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/chapters")
async def get_chapters(podcast_id: str):
    """Get chapters for a podcast"""
    try:
        podcasts_collection = db['podcasts']
        
        podcast = await podcasts_collection.find_one(
            {"_id": ObjectId(podcast_id)},
            {"chapters": 1}
        )
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        return podcast.get("chapters", [])
        
    except Exception as e:
        logger.error(f"Failed to get chapters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= RESUME POSITION =============

@router.get("/podcasts/{podcast_id}/resume")
async def get_resume_position(podcast_id: str, user_id: str):
    """Get last playback position for cross-device resume"""
    try:
        # Check listening_sessions collection
        sessions_collection = db['listening_sessions']
        
        session = await sessions_collection.find_one(
            {
                "podcast_id": podcast_id,
                "user_id": user_id
            },
            sort=[("created_at", -1)]
        )
        
        if session and session.get("current_position"):
            return {
                "position": session["current_position"],
                "duration": session.get("duration", 0),
                "last_updated": session.get("created_at")
            }
        
        return {"position": 0, "duration": 0}
        
    except Exception as e:
        logger.error(f"Failed to get resume position: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= TRANSCRIPT =============

@router.post("/podcasts/{podcast_id}/transcript")
async def add_transcript(
    podcast_id: str,
    transcript: str = Form(...),
    timestamps: Optional[str] = Form(None)
):
    """Add transcript to podcast (from Whisper API or manual)"""
    try:
        podcasts_collection = db['podcasts']
        
        update_data = {"transcript": transcript}
        if timestamps:
            # Parse timestamps if provided (JSON format)
            import json
            update_data["transcript_timestamps"] = json.loads(timestamps)
        
        result = await podcasts_collection.update_one(
            {"_id": ObjectId(podcast_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        logger.info(f"📝 Transcript added: podcast={podcast_id}")
        return {"message": "Transcript added successfully"}
        
    except Exception as e:
        logger.error(f"Failed to add transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/transcript")
async def get_transcript(podcast_id: str):
    """Get podcast transcript"""
    try:
        podcasts_collection = db['podcasts']
        
        podcast = await podcasts_collection.find_one(
            {"_id": ObjectId(podcast_id)},
            {"transcript": 1, "transcript_timestamps": 1}
        )
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        return {
            "transcript": podcast.get("transcript", ""),
            "timestamps": podcast.get("transcript_timestamps", [])
        }
        
    except Exception as e:
        logger.error(f"Failed to get transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))
