"""
Moderation Routes - Content moderation endpoints
"""
from fastapi import APIRouter, Form, HTTPException
from typing import Optional

router = APIRouter(prefix="/moderation", tags=["moderation"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


@router.get("/podcasts/{author_id}")
async def get_author_podcasts_for_moderation(author_id: str):
    """Get all podcasts by author for moderation"""
    db = await get_db()
    
    podcasts = await db.podcasts.find(
        {"author_id": author_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return podcasts


@router.put("/podcasts/{podcast_id}")
async def moderate_podcast(
    podcast_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    visibility: Optional[str] = Form(None),
    status: Optional[str] = Form(None)
):
    """
    Moderate/edit podcast
    
    Args:
        podcast_id: Podcast ID
        title: New title
        description: New description
        tags: Comma-separated tags
        visibility: public, private, unlisted
        status: active, pending, rejected
    
    Returns:
        Updated podcast
    """
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
        update_data["tags"] = [t.strip() for t in tags.split(",")]
    if visibility:
        update_data["visibility"] = visibility
    if status:
        update_data["moderation_status"] = status
    
    if update_data:
        from datetime import datetime, timezone
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": update_data}
        )
    
    updated = await db.podcasts.find_one({"id": podcast_id}, {"_id": 0})
    return updated


@router.delete("/podcasts/{podcast_id}")
async def delete_podcast_moderation(podcast_id: str):
    """Delete podcast (moderation action)"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Delete audio file from GridFS
    if podcast.get("audio_file_id"):
        from server import fs
        try:
            from bson import ObjectId
            await fs.delete(ObjectId(podcast["audio_file_id"]))
        except Exception:
            pass
    
    # Delete podcast
    await db.podcasts.delete_one({"id": podcast_id})
    
    # Update author's podcast count
    await db.authors.update_one(
        {"id": podcast["author_id"]},
        {"$inc": {"podcasts_count": -1}}
    )
    
    return {"success": True, "message": "Podcast deleted"}


@router.get("/comments/{author_id}")
async def get_comments_for_moderation(author_id: str):
    """Get comments on author's podcasts for moderation"""
    db = await get_db()
    
    # Get author's podcast IDs
    podcasts = await db.podcasts.find(
        {"author_id": author_id},
        {"id": 1, "_id": 0}
    ).to_list(1000)
    
    podcast_ids = [p["id"] for p in podcasts]
    
    if not podcast_ids:
        return []
    
    # Get comments
    comments = await db.comments.find(
        {"podcast_id": {"$in": podcast_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return comments


@router.delete("/comments/{comment_id}")
async def delete_comment_moderation(comment_id: str):
    """Delete comment (moderation action)"""
    db = await get_db()
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Delete comment
    await db.comments.delete_one({"id": comment_id})
    
    # Update podcast's comment count
    await db.podcasts.update_one(
        {"id": comment["podcast_id"]},
        {"$inc": {"comments_count": -1}}
    )
    
    return {"success": True, "message": "Comment deleted"}
