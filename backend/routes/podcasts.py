"""
Podcasts Routes - Podcast management endpoints
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, List
import uuid
from datetime import datetime, timezone
import io

from models import Podcast, PodcastCreate

router = APIRouter(prefix="/podcasts", tags=["podcasts"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


async def get_fs():
    """Get GridFS instance"""
    from server import fs
    return fs


@router.post("", response_model=Podcast)
async def create_podcast(podcast: PodcastCreate):
    """Create new podcast"""
    db = await get_db()
    
    podcast_dict = podcast.model_dump()
    podcast_obj = Podcast(**podcast_dict)
    
    doc = podcast_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.podcasts.insert_one(doc)
    
    await db.authors.update_one(
        {"id": podcast.author_id},
        {"$inc": {"podcasts_count": 1}}
    )
    
    # Trigger webhook
    try:
        from webhook_service import webhook_service
        if webhook_service:
            await webhook_service.trigger_webhooks('podcast.created', {
                'podcast_id': podcast_obj.id,
                'title': podcast_obj.title,
                'author_id': podcast_obj.author_id,
                'description': podcast_obj.description,
                'tags': podcast_obj.tags
            })
    except Exception:
        # Webhook service not available, continue
        pass
    
    return podcast_obj


@router.get("")
async def get_podcasts(
    limit: int = 50,
    skip: int = 0,
    author_id: Optional[str] = None,
    tag: Optional[str] = None,
    is_live: Optional[bool] = None
):
    """Get all podcasts with optional filters"""
    db = await get_db()
    
    query = {}
    if author_id:
        query["author_id"] = author_id
    if tag:
        query["tags"] = tag
    if is_live is not None:
        query["is_live"] = is_live
    
    podcasts = await db.podcasts.find(query, {"_id": 0}) \
        .sort("created_at", -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(limit)
    
    return podcasts


@router.get("/{podcast_id}")
async def get_podcast(podcast_id: str):
    """Get podcast by ID"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id}, {"_id": 0})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Increment views
    await db.podcasts.update_one(
        {"id": podcast_id},
        {"$inc": {"views_count": 1}}
    )
    
    return podcast


@router.put("/{podcast_id}")
async def update_podcast(
    podcast_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    visibility: Optional[str] = Form(None)
):
    """Update podcast"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    update_data = {}
    if title:
        update_data["title"] = title
    if description:
        update_data["description"] = description
    if tags:
        update_data["tags"] = tags.split(",")
    if visibility:
        update_data["visibility"] = visibility
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow().isoformat()
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": update_data}
        )
    
    updated = await db.podcasts.find_one({"id": podcast_id}, {"_id": 0})
    return updated


@router.post("/{podcast_id}/end-stream")
async def end_podcast_stream(podcast_id: str):
    """End a live podcast stream"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    if not podcast.get("is_live"):
        raise HTTPException(status_code=400, detail="Podcast is not live")
    
    # Update podcast to end live status
    await db.podcasts.update_one(
        {"id": podcast_id},
        {"$set": {
            "is_live": False,
            "ended_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    return {"success": True, "message": "Stream ended successfully"}


@router.delete("/{podcast_id}")
async def delete_podcast(podcast_id: str):
    """Delete podcast"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Delete audio file from GridFS
    if podcast.get("audio_file_id"):
        fs = await get_fs()
        try:
            await fs.delete(podcast["audio_file_id"])
        except Exception:
            pass
    
    # Delete podcast
    await db.podcasts.delete_one({"id": podcast_id})
    
    # Update author's podcast count
    await db.authors.update_one(
        {"id": podcast["author_id"]},
        {"$inc": {"podcasts_count": -1}}
    )
    
    # Trigger webhook
    from webhook_service import webhook_service
    await webhook_service.trigger_webhooks('podcast.deleted', {
        'podcast_id': podcast_id,
        'title': podcast.get('title'),
        'author_id': podcast.get('author_id')
    })
    
    return {"message": "Podcast deleted"}


@router.get("/{podcast_id}/audio")
async def stream_audio(podcast_id: str):
    """Stream audio file"""
    db = await get_db()
    fs = await get_fs()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast or not podcast.get("audio_file_id"):
        raise HTTPException(status_code=404, detail="Audio not found")
    
    try:
        from bson import ObjectId
        file_id = ObjectId(podcast["audio_file_id"])
        grid_out = await fs.open_download_stream(file_id)
        audio_data = await grid_out.read()
        
        # Increment listens
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$inc": {"listens_count": 1}}
        )
        
        audio_format = podcast.get("audio_format", "mp3")
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type=f"audio/{audio_format}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error streaming audio: {str(e)}")


@router.post("/{podcast_id}/upload-audio")
async def upload_audio(
    podcast_id: str,
    audio: UploadFile = File(...)
):
    """Upload audio file for podcast"""
    db = await get_db()
    fs = await get_fs()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Read audio file
    audio_content = await audio.read()
    
    # Delete old audio if exists
    if podcast.get("audio_file_id"):
        try:
            from bson import ObjectId
            await fs.delete(ObjectId(podcast["audio_file_id"]))
        except Exception:
            pass
    
    # Upload to GridFS
    file_id = await fs.upload_from_stream(
        audio.filename,
        io.BytesIO(audio_content),
        metadata={"podcast_id": podcast_id}
    )
    
    # Generate audio URL for the podcast
    audio_url = f"/api/podcasts/{podcast_id}/audio"
    
    # Update podcast with audio URL and file info
    await db.podcasts.update_one(
        {"id": podcast_id},
        {"$set": {
            "audio_file_id": str(file_id),
            "audio_url": audio_url,
            "file_size": len(audio_content),
            "audio_format": audio.filename.split(".")[-1] if "." in audio.filename else "mp3"
        }}
    )
    
    return {"message": "Audio uploaded", "file_id": str(file_id), "audio_url": audio_url}


@router.post("/{podcast_id}/end-live")
async def end_live_broadcast(podcast_id: str):
    """End a live broadcast"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    if not podcast.get("is_live"):
        raise HTTPException(status_code=400, detail="Podcast is not live")
    
    # Calculate duration
    ended_at = datetime.now(timezone.utc)
    started_at = podcast.get("live_started_at") or podcast.get("created_at")
    
    if isinstance(started_at, str):
        started_at = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
    
    duration_seconds = int((ended_at - started_at).total_seconds()) if started_at else 0
    duration_mins = duration_seconds // 60
    duration_secs = duration_seconds % 60
    duration_formatted = f"{duration_mins}:{duration_secs:02d}"
    
    # Update podcast
    await db.podcasts.update_one(
        {"id": podcast_id},
        {
            "$set": {
                "is_live": False,
                "live_ended_at": ended_at.isoformat(),
                "duration": duration_formatted,
                "duration_seconds": duration_seconds
            }
        }
    )
    
    return {
        "success": True,
        "message": "Live broadcast ended",
        "duration": duration_formatted
    }


@router.post("/{podcast_id}/reaction")
async def add_reaction(
    podcast_id: str,
    user_id: str = Form(...),
    emoji: str = Form("❤️")
):
    """Add reaction to podcast"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Toggle like
    likes = podcast.get("likes", [])
    if user_id in likes:
        # Unlike
        await db.podcasts.update_one(
            {"id": podcast_id},
            {
                "$pull": {"likes": user_id},
                "$inc": {"reactions_count": -1}
            }
        )
        return {"message": "Reaction removed", "liked": False}
    else:
        # Like
        await db.podcasts.update_one(
            {"id": podcast_id},
            {
                "$addToSet": {"likes": user_id},
                "$inc": {"reactions_count": 1}
            }
        )
        
        # Trigger webhook
        from webhook_service import webhook_service
        await webhook_service.trigger_webhooks('reaction.added', {
            'podcast_id': podcast_id,
            'user_id': user_id,
            'emoji': emoji
        })
        
        return {"message": "Reaction added", "liked": True}



@router.get("/{podcast_id}/reactions")
async def get_podcast_reactions(podcast_id: str):
    """Get reactions for a podcast"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id}, {"_id": 0})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Count reactions by type from podcast_reactions collection
    reaction_counts = await db.podcast_reactions.aggregate([
        {"$match": {"podcast_id": podcast_id}},
        {"$group": {"_id": "$reaction_type", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    # Build reactions dict
    reactions = {
        "like": 0,
        "fire": 0,
        "heart": 0,
        "mind_blown": 0,
        "clap": 0
    }
    
    for r in reaction_counts:
        if r["_id"] in reactions:
            reactions[r["_id"]] = r["count"]
    
    # Also add legacy likes count
    likes = podcast.get("likes", [])
    if isinstance(likes, list):
        reactions["like"] += len(likes)
    elif isinstance(likes, int):
        reactions["like"] += likes
    
    return {
        "podcast_id": podcast_id,
        "reactions": reactions,
        "total": sum(reactions.values())
    }


@router.post("/{podcast_id}/reactions")
async def add_podcast_reaction(
    podcast_id: str,
    user_id: str = Form(...),
    reaction_type: str = Form(...)
):
    """Add reaction to a podcast"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Check if user already reacted with this type
    existing_reaction = await db.podcast_reactions.find_one({
        "podcast_id": podcast_id,
        "user_id": user_id,
        "reaction_type": reaction_type
    })
    
    if existing_reaction:
        # Remove reaction (toggle off)
        await db.podcast_reactions.delete_one({"id": existing_reaction["id"]})
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$inc": {"reactions_count": -1}}
        )
        return {"message": "Reaction removed", "added": False, "reaction_type": reaction_type}
    
    # Add new reaction
    await db.podcasts.update_one(
        {"id": podcast_id},
        {"$inc": {"reactions_count": 1}}
    )
    
    # Store individual reaction
    reaction_id = str(uuid.uuid4())
    await db.podcast_reactions.insert_one({
        "id": reaction_id,
        "podcast_id": podcast_id,
        "user_id": user_id,
        "reaction_type": reaction_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Reaction added", "added": True, "reaction_type": reaction_type}




@router.post("/{podcast_id}/view")
async def track_podcast_view(
    podcast_id: str,
    user_id: str = Form(None)
):
    """Track a podcast view"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Increment view counter (already done in get_podcast, but this allows frontend tracking)
    await db.podcasts.update_one(
        {"id": podcast_id},
        {"$inc": {"views_count": 1}}
    )
    
    return {"message": "View tracked", "podcast_id": podcast_id}


@router.post("/{podcast_id}/save")
async def save_podcast(
    podcast_id: str,
    user_id: str = Form(...)
):
    """Toggle save/unsave a podcast"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    saves = podcast.get("saves", [])
    if user_id in saves:
        # Unsave
        await db.podcasts.update_one(
            {"id": podcast_id},
            {
                "$pull": {"saves": user_id},
                "$inc": {"saves_count": -1}
            }
        )
        return {"message": "Podcast unsaved", "saved": False}
    else:
        # Save
        await db.podcasts.update_one(
            {"id": podcast_id},
            {
                "$addToSet": {"saves": user_id},
                "$inc": {"saves_count": 1}
            }
        )
        return {"message": "Podcast saved", "saved": True}

