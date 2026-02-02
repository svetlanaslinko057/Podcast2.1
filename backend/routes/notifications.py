"""
Notifications Routes - User notifications management
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


@router.get("/{user_id}")
async def get_user_notifications(
    user_id: str,
    unread_only: bool = False,
    limit: int = 20
):
    """Get notifications for a user"""
    db = await get_db()
    
    query = {"user_id": user_id}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}) \
        .sort("created_at", -1) \
        .limit(limit) \
        .to_list(limit)
    
    return notifications


@router.get("/{user_id}/count")
async def get_unread_count(user_id: str):
    """Get count of unread notifications"""
    db = await get_db()
    
    count = await db.notifications.count_documents({
        "user_id": user_id,
        "is_read": False
    })
    
    return {"unread_count": count}


@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    db = await get_db()
    
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}


@router.put("/{user_id}/read-all")
async def mark_all_read(user_id: str):
    """Mark all notifications as read for a user"""
    db = await get_db()
    
    result = await db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"success": True, "updated_count": result.modified_count}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a notification"""
    db = await get_db()
    
    result = await db.notifications.delete_one({"id": notification_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}


async def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    link: Optional[str] = None
):
    """Helper function to create a notification"""
    db = await get_db()
    
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "link": link,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    return notification
