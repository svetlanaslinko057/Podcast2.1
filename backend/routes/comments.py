"""
Comments Routes - Handle podcast comments, replies, reactions and discussions
"""
from fastapi import APIRouter, HTTPException, Form, Body
from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/podcasts", tags=["comments"])


class CommentCreate(BaseModel):
    user_id: str
    username: str
    text: str
    wallet_address: Optional[str] = None
    parent_id: Optional[str] = None
    reply_to_id: Optional[str] = None  # For quoting/replying to specific comment
    reply_to_text: Optional[str] = None  # Quoted text


class ReactionAdd(BaseModel):
    user_id: str
    emoji: str  # The emoji/reaction type


async def get_db():
    """Get database instance"""
    from server import db
    return db


def build_comment_tree(comments: List[dict]) -> List[dict]:
    """Build nested comment tree from flat list"""
    comment_map = {c['id']: {**c, 'replies': []} for c in comments}
    root_comments = []
    
    for comment in comments:
        parent_id = comment.get('parent_id')
        if parent_id and parent_id in comment_map:
            comment_map[parent_id]['replies'].append(comment_map[comment['id']])
        else:
            root_comments.append(comment_map[comment['id']])
    
    return root_comments


@router.get("/{podcast_id}/comments")
async def get_podcast_comments(podcast_id: str, flat: bool = False):
    """Get all comments for a podcast (nested or flat)"""
    db = await get_db()
    
    # Check if podcast exists
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Get all comments for this podcast
    comments = await db.comments.find(
        {"podcast_id": podcast_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    if flat:
        return {"comments": comments, "total": len(comments)}
    
    # Build nested tree
    tree = build_comment_tree(comments)
    return {"comments": tree, "total": len(comments)}


@router.post("/{podcast_id}/comments")
async def add_comment(podcast_id: str, data: CommentCreate):
    """Add a comment to a podcast"""
    db = await get_db()
    
    # Check if podcast exists
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Create comment
    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    comment = {
        "id": comment_id,
        "podcast_id": podcast_id,
        "user_id": data.user_id,
        "username": data.username,
        "wallet_address": data.wallet_address,
        "text": data.text,
        "parent_id": data.parent_id,
        "reply_to_id": data.reply_to_id,
        "reply_to_text": data.reply_to_text,
        "created_at": now,
        "edited_at": None,
        "likes_count": 0,
        "liked_by": [],
        "reactions": {},
        "is_edited": False
    }
    
    await db.comments.insert_one(comment)
    
    # Remove _id before returning
    comment.pop("_id", None)
    
    # Update podcast comment count
    await db.podcasts.update_one(
        {"id": podcast_id},
        {"$inc": {"comments_count": 1}}
    )
    
    # Broadcast new comment via WebSocket
    try:
        from routes.websocket import broadcast_new_comment
        await broadcast_new_comment(podcast_id, comment)
    except Exception:
        pass
    
    return comment


@router.put("/comments/{comment_id}")
async def edit_comment(comment_id: str, user_id: str = Body(...), text: str = Body(...)):
    """Edit a comment"""
    db = await get_db()
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"text": text, "edited_at": now, "is_edited": True}}
    )
    
    return {"message": "Comment updated", "edited_at": now}


@router.post("/comments/{comment_id}/like")
async def like_comment(comment_id: str, user_id: str = Body(..., embed=True)):
    """Toggle like on a comment"""
    db = await get_db()
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    liked_by = comment.get("liked_by", [])
    
    if user_id in liked_by:
        # Unlike
        await db.comments.update_one(
            {"id": comment_id},
            {
                "$pull": {"liked_by": user_id},
                "$inc": {"likes_count": -1}
            }
        )
        return {"liked": False, "likes_count": max(0, comment.get("likes_count", 0) - 1)}
    else:
        # Like
        await db.comments.update_one(
            {"id": comment_id},
            {
                "$addToSet": {"liked_by": user_id},
                "$inc": {"likes_count": 1}
            }
        )
        return {"liked": True, "likes_count": comment.get("likes_count", 0) + 1}


@router.post("/comments/{comment_id}/reaction")
async def toggle_reaction(comment_id: str, data: ReactionAdd):
    """Toggle reaction on a comment"""
    db = await get_db()
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    reactions = comment.get("reactions", {})
    reaction_users = comment.get("reaction_users", {})
    
    emoji = data.emoji
    user_id = data.user_id
    
    # Initialize if not exists
    if emoji not in reactions:
        reactions[emoji] = 0
        reaction_users[emoji] = []
    
    # Toggle reaction
    if user_id in reaction_users.get(emoji, []):
        # Remove reaction
        reactions[emoji] = max(0, reactions[emoji] - 1)
        reaction_users[emoji].remove(user_id)
        if reactions[emoji] == 0:
            del reactions[emoji]
            del reaction_users[emoji]
        added = False
    else:
        # Add reaction
        reactions[emoji] = reactions.get(emoji, 0) + 1
        if emoji not in reaction_users:
            reaction_users[emoji] = []
        reaction_users[emoji].append(user_id)
        added = True
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"reactions": reactions, "reaction_users": reaction_users}}
    )
    
    return {"emoji": emoji, "count": reactions.get(emoji, 0), "added": added, "reactions": reactions}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user_id: str):
    """Delete a comment (only by owner)"""
    db = await get_db()
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user is owner
    if comment.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    # Delete comment and all its replies
    await db.comments.delete_many({
        "$or": [
            {"id": comment_id},
            {"parent_id": comment_id}
        ]
    })
    
    # Update podcast comment count
    await db.podcasts.update_one(
        {"id": comment.get("podcast_id")},
        {"$inc": {"comments_count": -1}}
    )
    
    return {"message": "Comment deleted"}
