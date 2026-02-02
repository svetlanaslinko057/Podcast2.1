"""
Web Push Notifications Routes
Browser-based push notifications using Web Push API
"""
from fastapi import APIRouter, HTTPException, status
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
import json
import os

router = APIRouter(prefix="/push", tags=["push-notifications"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


# VAPID keys should be generated once and stored
# For demo purposes, we'll use placeholder keys
# In production, generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY = os.environ.get(
    "VAPID_PUBLIC_KEY", 
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
)
VAPID_PRIVATE_KEY = os.environ.get(
    "VAPID_PRIVATE_KEY",
    "UUxI4O8-FbRouADVXc-hK3ltm228GJShRKJpeXtNYkg"
)


# ========== Subscription Management ==========

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for client subscription"""
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe_to_push(data: dict):
    """
    Subscribe user to push notifications
    
    Body:
    - user_id: User identifier
    - subscription: PushSubscription object from browser
    - notification_types: List of notification types to receive
    """
    db = await get_db()
    
    user_id = data.get("user_id")
    subscription = data.get("subscription")
    notification_types = data.get("notification_types", [
        "new_podcast", "live_start", "new_comment", "private_club_invite"
    ])
    
    if not user_id or not subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id and subscription are required"
        )
    
    # Check if subscription already exists
    existing = await db.push_subscriptions.find_one({
        "user_id": user_id,
        "subscription.endpoint": subscription.get("endpoint")
    })
    
    if existing:
        # Update existing subscription
        await db.push_subscriptions.update_one(
            {"id": existing["id"]},
            {
                "$set": {
                    "subscription": subscription,
                    "notification_types": notification_types,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {"message": "Subscription updated", "id": existing["id"]}
    
    # Create new subscription
    push_sub = {
        "id": str(uuid4()),
        "user_id": user_id,
        "subscription": subscription,
        "notification_types": notification_types,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.push_subscriptions.insert_one(push_sub)
    
    return {"message": "Subscribed to push notifications", "id": push_sub["id"]}


@router.delete("/unsubscribe")
async def unsubscribe_from_push(data: dict):
    """Unsubscribe from push notifications"""
    db = await get_db()
    
    user_id = data.get("user_id")
    endpoint = data.get("endpoint")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id is required"
        )
    
    query = {"user_id": user_id}
    if endpoint:
        query["subscription.endpoint"] = endpoint
    
    result = await db.push_subscriptions.delete_many(query)
    
    return {
        "message": "Unsubscribed from push notifications",
        "deleted_count": result.deleted_count
    }


@router.get("/subscriptions/{user_id}")
async def get_user_subscriptions(user_id: str):
    """Get all push subscriptions for a user"""
    db = await get_db()
    
    subscriptions = await db.push_subscriptions.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(length=10)
    
    return subscriptions


@router.put("/subscriptions/{user_id}/settings")
async def update_notification_settings(user_id: str, data: dict):
    """Update notification type preferences"""
    db = await get_db()
    
    notification_types = data.get("notification_types", [])
    
    await db.push_subscriptions.update_many(
        {"user_id": user_id},
        {
            "$set": {
                "notification_types": notification_types,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Notification settings updated"}


# ========== Send Notifications ==========

@router.post("/send")
async def send_push_notification(data: dict):
    """
    Send push notification to a user (internal use)
    
    Body:
    - user_id: Target user
    - title: Notification title
    - body: Notification body
    - icon: Icon URL (optional)
    - url: Click action URL (optional)
    - notification_type: Type of notification
    """
    db = await get_db()
    
    user_id = data.get("user_id")
    title = data.get("title")
    body = data.get("body")
    icon = data.get("icon", "/logo192.png")
    url = data.get("url", "/")
    notification_type = data.get("notification_type", "general")
    
    if not user_id or not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id and title are required"
        )
    
    # Get user's subscriptions that accept this notification type
    subscriptions = await db.push_subscriptions.find({
        "user_id": user_id,
        "is_active": True,
        "notification_types": notification_type
    }, {"_id": 0}).to_list(length=10)
    
    if not subscriptions:
        return {"message": "No active subscriptions found", "sent": 0}
    
    # Build notification payload
    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": icon,
        "data": {
            "url": url,
            "type": notification_type,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    })
    
    # Store notification in database for history
    notification = {
        "id": str(uuid4()),
        "user_id": user_id,
        "title": title,
        "message": body,
        "type": notification_type,
        "link": url,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # In production, we would use pywebpush to send actual push notifications
    # For now, we just store the notification and return success
    # The frontend will poll notifications endpoint
    
    return {
        "message": "Notification queued",
        "sent": len(subscriptions),
        "notification_id": notification["id"]
    }


@router.post("/broadcast")
async def broadcast_notification(data: dict):
    """
    Broadcast notification to multiple users
    
    Body:
    - user_ids: List of user IDs (or "all" for everyone)
    - title: Notification title
    - body: Notification body
    - notification_type: Type of notification
    """
    db = await get_db()
    
    user_ids = data.get("user_ids", [])
    title = data.get("title")
    body = data.get("body")
    notification_type = data.get("notification_type", "general")
    url = data.get("url", "/")
    
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="title is required"
        )
    
    # Build query
    query = {"is_active": True, "notification_types": notification_type}
    if user_ids and user_ids != "all":
        query["user_id"] = {"$in": user_ids}
    
    # Get all matching subscriptions
    subscriptions = await db.push_subscriptions.find(
        query, {"_id": 0, "user_id": 1}
    ).to_list(length=1000)
    
    # Get unique user IDs
    unique_users = list(set(sub["user_id"] for sub in subscriptions))
    
    # Create notifications for all users
    notifications = []
    for user_id in unique_users:
        notifications.append({
            "id": str(uuid4()),
            "user_id": user_id,
            "title": title,
            "message": body,
            "type": notification_type,
            "link": url,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return {
        "message": "Broadcast sent",
        "recipients": len(unique_users)
    }


# ========== Event Triggers ==========

async def notify_new_podcast(podcast: dict, author: dict):
    """Notify followers about new podcast"""
    db = await get_db()
    
    # Get author's followers
    followers = await db.author_followers.find(
        {"author_id": author.get("id")},
        {"_id": 0, "follower_id": 1}
    ).to_list(length=10000)
    
    follower_ids = [f["follower_id"] for f in followers]
    
    if not follower_ids:
        return
    
    # Create notifications
    for user_id in follower_ids:
        notification = {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": f"New podcast from {author.get('name', 'Author')}",
            "message": podcast.get("title", "New episode available"),
            "type": "new_podcast",
            "link": f"/podcast/{podcast.get('id')}",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)


async def notify_live_start(podcast: dict, author: dict):
    """Notify followers about live stream starting"""
    db = await get_db()
    
    # Get author's followers
    followers = await db.author_followers.find(
        {"author_id": author.get("id")},
        {"_id": 0, "follower_id": 1}
    ).to_list(length=10000)
    
    follower_ids = [f["follower_id"] for f in followers]
    
    if not follower_ids:
        return
    
    for user_id in follower_ids:
        notification = {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": f"{author.get('name', 'Author')} is LIVE!",
            "message": podcast.get("title", "Join the live stream"),
            "type": "live_start",
            "link": f"/live/{podcast.get('id')}",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)


async def notify_new_comment(podcast: dict, comment: dict, commenter: dict):
    """Notify podcast author about new comment"""
    db = await get_db()
    
    author_id = podcast.get("author_id")
    if not author_id or author_id == comment.get("user_id"):
        return  # Don't notify yourself
    
    notification = {
        "id": str(uuid4()),
        "user_id": author_id,
        "title": "New comment on your podcast",
        "message": f"{commenter.get('name', 'Someone')} commented: {comment.get('content', '')[:50]}...",
        "type": "new_comment",
        "link": f"/podcast/{podcast.get('id')}",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)


async def notify_private_club_invite(podcast: dict, invitee_id: str, inviter: dict):
    """Notify user about private club invite"""
    db = await get_db()
    
    notification = {
        "id": str(uuid4()),
        "user_id": invitee_id,
        "title": "You've been invited to a Private Club!",
        "message": f"{inviter.get('name', 'Someone')} invited you to access '{podcast.get('title', 'a podcast')}'",
        "type": "private_club_invite",
        "link": f"/podcast/{podcast.get('id')}",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
