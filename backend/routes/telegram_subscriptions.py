"""
Telegram Subscriptions Routes
Subscribe users to notifications via Telegram for:
- New episodes from followed creators
- Live streams from followed creators
"""
from fastapi import APIRouter, HTTPException, Form
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram-subscriptions", tags=["telegram-subscriptions"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


async def get_telegram_service():
    """Get Telegram service"""
    from services.telegram_service import telegram_service
    return telegram_service


# ============ USER TELEGRAM CONNECTION ============

@router.post("/connect")
async def connect_telegram(
    user_id: str = Form(...),
    telegram_chat_id: str = Form(...),
    telegram_username: Optional[str] = Form(None)
):
    """
    Connect user account to Telegram for receiving notifications
    User gets chat_id by messaging the FOMO bot and using /start command
    """
    db = await get_db()
    
    # Check if connection already exists
    existing = await db.telegram_user_connections.find_one({
        "user_id": user_id
    })
    
    if existing:
        # Update existing connection
        await db.telegram_user_connections.update_one(
            {"user_id": user_id},
            {"$set": {
                "telegram_chat_id": telegram_chat_id,
                "telegram_username": telegram_username,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }}
        )
        return {"success": True, "message": "Telegram connection updated"}
    
    # Create new connection
    connection = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "telegram_chat_id": telegram_chat_id,
        "telegram_username": telegram_username,
        "is_active": True,
        "notify_new_episodes": True,
        "notify_live_streams": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.telegram_user_connections.insert_one(connection)
    connection.pop('_id', None)
    
    logger.info(f"📱 User {user_id} connected Telegram: {telegram_chat_id}")
    return {"success": True, "message": "Telegram connected successfully", "connection": connection}


@router.get("/connection/{user_id}")
async def get_user_connection(user_id: str):
    """Get user's Telegram connection status"""
    db = await get_db()
    
    connection = await db.telegram_user_connections.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not connection:
        return {"connected": False}
    
    return {"connected": True, "connection": connection}


@router.put("/connection/{user_id}/settings")
async def update_notification_settings(
    user_id: str,
    notify_new_episodes: Optional[bool] = Form(None),
    notify_live_streams: Optional[bool] = Form(None)
):
    """Update notification preferences"""
    db = await get_db()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if notify_new_episodes is not None:
        update_data["notify_new_episodes"] = notify_new_episodes
    if notify_live_streams is not None:
        update_data["notify_live_streams"] = notify_live_streams
    
    result = await db.telegram_user_connections.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    return {"success": True, "message": "Settings updated"}


@router.delete("/connection/{user_id}")
async def disconnect_telegram(user_id: str):
    """Disconnect Telegram from user account"""
    db = await get_db()
    
    result = await db.telegram_user_connections.update_one(
        {"user_id": user_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    return {"success": True, "message": "Telegram disconnected"}


# ============ CREATOR SUBSCRIPTIONS ============

@router.post("/subscribe")
async def subscribe_to_creator(
    user_id: str = Form(...),
    creator_id: str = Form(...),
    notify_episodes: bool = Form(True),
    notify_live: bool = Form(True)
):
    """Subscribe to notifications from a specific creator"""
    db = await get_db()
    
    # Check if user has Telegram connected
    connection = await db.telegram_user_connections.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    if not connection:
        raise HTTPException(
            status_code=400, 
            detail="Please connect your Telegram account first"
        )
    
    # Check if subscription already exists
    existing = await db.creator_subscriptions.find_one({
        "user_id": user_id,
        "creator_id": creator_id
    })
    
    if existing:
        # Update existing subscription
        await db.creator_subscriptions.update_one(
            {"user_id": user_id, "creator_id": creator_id},
            {"$set": {
                "notify_episodes": notify_episodes,
                "notify_live": notify_live,
                "is_active": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"success": True, "message": "Subscription updated"}
    
    # Create new subscription
    subscription = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "creator_id": creator_id,
        "notify_episodes": notify_episodes,
        "notify_live": notify_live,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.creator_subscriptions.insert_one(subscription)
    subscription.pop('_id', None)  # Remove MongoDB _id field for JSON serialization
    
    logger.info(f"🔔 User {user_id} subscribed to creator {creator_id}")
    return {"success": True, "message": "Subscribed to notifications", "subscription": subscription}


@router.get("/subscriptions/{user_id}")
async def get_user_subscriptions(user_id: str):
    """Get all creator subscriptions for a user"""
    db = await get_db()
    
    subscriptions = await db.creator_subscriptions.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    # Get creator info for each subscription
    for sub in subscriptions:
        creator = await db.authors.find_one(
            {"id": sub["creator_id"]},
            {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar_url": 1}
        )
        sub["creator"] = creator
    
    return subscriptions


@router.get("/subscription-status/{user_id}/{creator_id}")
async def get_subscription_status(user_id: str, creator_id: str):
    """Check if user is subscribed to a specific creator"""
    db = await get_db()
    
    subscription = await db.creator_subscriptions.find_one(
        {"user_id": user_id, "creator_id": creator_id, "is_active": True},
        {"_id": 0}
    )
    
    return {
        "subscribed": subscription is not None,
        "subscription": subscription
    }


@router.delete("/unsubscribe/{user_id}/{creator_id}")
async def unsubscribe_from_creator(user_id: str, creator_id: str):
    """Unsubscribe from a creator's notifications"""
    db = await get_db()
    
    result = await db.creator_subscriptions.update_one(
        {"user_id": user_id, "creator_id": creator_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"success": True, "message": "Unsubscribed from notifications"}


# ============ SEND NOTIFICATIONS ============

@router.post("/notify/new-episode")
async def notify_new_episode(
    creator_id: str = Form(...),
    podcast_id: str = Form(...),
    podcast_title: str = Form(...),
    podcast_cover: Optional[str] = Form(None)
):
    """
    Send Telegram notifications to all subscribers about new episode
    Called when a creator publishes a new podcast
    """
    db = await get_db()
    telegram_service = await get_telegram_service()
    
    # Get creator info
    creator = await db.authors.find_one({"id": creator_id}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Get all active subscribers who want episode notifications
    subscriptions = await db.creator_subscriptions.find({
        "creator_id": creator_id,
        "is_active": True,
        "notify_episodes": True
    }).to_list(1000)
    
    # Get bot config (use platform default bot)
    bot_config = await db.telegram_bots.find_one({"is_platform_default": True})
    if not bot_config:
        logger.warning("No platform default Telegram bot configured")
        return {"success": False, "message": "No Telegram bot configured"}
    
    sent_count = 0
    failed_count = 0
    
    for sub in subscriptions:
        # Get user's Telegram connection
        connection = await db.telegram_user_connections.find_one({
            "user_id": sub["user_id"],
            "is_active": True
        })
        
        if not connection:
            continue
        
        # Build message
        message = f"""
🎙️ <b>Новый выпуск!</b>

<b>{podcast_title}</b>
от {creator.get('name', 'Creator')}

🎧 Слушать сейчас:
https://fomo.app/podcast/{podcast_id}
"""
        
        result = await telegram_service.send_message(
            bot_config['bot_token'],
            connection['telegram_chat_id'],
            message.strip()
        )
        
        if result.get('success'):
            sent_count += 1
        else:
            failed_count += 1
            logger.error(f"Failed to notify user {sub['user_id']}: {result.get('error')}")
    
    logger.info(f"📢 New episode notifications: {sent_count} sent, {failed_count} failed")
    return {
        "success": True,
        "sent_count": sent_count,
        "failed_count": failed_count
    }


@router.post("/notify/live-stream")
async def notify_live_stream(
    creator_id: str = Form(...),
    stream_id: str = Form(...),
    stream_title: str = Form(...),
    stream_description: Optional[str] = Form(None)
):
    """
    Send Telegram notifications to all subscribers about live stream
    Called when a creator starts a live stream
    """
    db = await get_db()
    telegram_service = await get_telegram_service()
    
    # Get creator info
    creator = await db.authors.find_one({"id": creator_id}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Get all active subscribers who want live notifications
    subscriptions = await db.creator_subscriptions.find({
        "creator_id": creator_id,
        "is_active": True,
        "notify_live": True
    }).to_list(1000)
    
    # Get bot config
    bot_config = await db.telegram_bots.find_one({"is_platform_default": True})
    if not bot_config:
        logger.warning("No platform default Telegram bot configured")
        return {"success": False, "message": "No Telegram bot configured"}
    
    sent_count = 0
    failed_count = 0
    
    for sub in subscriptions:
        connection = await db.telegram_user_connections.find_one({
            "user_id": sub["user_id"],
            "is_active": True
        })
        
        if not connection:
            continue
        
        message = f"""
🔴 <b>LIVE!</b>

<b>{creator.get('name', 'Creator')}</b> начал трансляцию!

<b>{stream_title}</b>
{stream_description or ''}

🎬 Присоединиться:
https://fomo.app/live/{stream_id}
"""
        
        result = await telegram_service.send_message(
            bot_config['bot_token'],
            connection['telegram_chat_id'],
            message.strip()
        )
        
        if result.get('success'):
            sent_count += 1
        else:
            failed_count += 1
    
    logger.info(f"📢 Live stream notifications: {sent_count} sent, {failed_count} failed")
    return {
        "success": True,
        "sent_count": sent_count,
        "failed_count": failed_count
    }


# ============ GET SUBSCRIBERS COUNT ============

@router.get("/subscribers/{creator_id}/count")
async def get_subscribers_count(creator_id: str):
    """Get count of notification subscribers for a creator"""
    db = await get_db()
    
    total = await db.creator_subscriptions.count_documents({
        "creator_id": creator_id,
        "is_active": True
    })
    
    episodes_only = await db.creator_subscriptions.count_documents({
        "creator_id": creator_id,
        "is_active": True,
        "notify_episodes": True,
        "notify_live": False
    })
    
    live_only = await db.creator_subscriptions.count_documents({
        "creator_id": creator_id,
        "is_active": True,
        "notify_episodes": False,
        "notify_live": True
    })
    
    both = await db.creator_subscriptions.count_documents({
        "creator_id": creator_id,
        "is_active": True,
        "notify_episodes": True,
        "notify_live": True
    })
    
    return {
        "total_subscribers": total,
        "episodes_subscribers": episodes_only + both,
        "live_subscribers": live_only + both
    }


# ============ TELEGRAM CHANNELS MANAGEMENT ============

@router.post("/channels")
async def add_telegram_channel(
    user_id: str = Form(...),
    chat_id: str = Form(...),
    name: str = Form("My Channel"),
    notify_new_episodes: bool = Form(True),
    notify_live_streams: bool = Form(True),
    notify_comments: bool = Form(False),
    notify_mentions: bool = Form(False)
):
    """
    Add a new Telegram channel/chat for notifications
    Allows users to configure multiple channels with different notification settings
    """
    db = await get_db()
    
    # Create channel configuration
    channel = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "chat_id": chat_id,
        "name": name,
        "notify_new_episodes": notify_new_episodes,
        "notify_live_streams": notify_live_streams,
        "notify_comments": notify_comments,
        "notify_mentions": notify_mentions,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.telegram_channels.insert_one(channel)
    channel.pop('_id', None)
    
    logger.info(f"📱 User {user_id} added Telegram channel: {name}")
    return {"success": True, "message": "Channel added", "channel": channel}


@router.get("/channels/{user_id}")
async def get_user_channels(user_id: str):
    """Get all Telegram channels configured by a user"""
    db = await get_db()
    
    channels = await db.telegram_channels.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(50)
    
    return channels


@router.put("/channels/{channel_id}")
async def update_channel_settings(
    channel_id: str,
    notify_new_episodes: Optional[bool] = Form(None),
    notify_live_streams: Optional[bool] = Form(None),
    notify_comments: Optional[bool] = Form(None),
    notify_mentions: Optional[bool] = Form(None),
    is_active: Optional[bool] = Form(None)
):
    """Update notification settings for a channel"""
    db = await get_db()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if notify_new_episodes is not None:
        update_data["notify_new_episodes"] = notify_new_episodes
    if notify_live_streams is not None:
        update_data["notify_live_streams"] = notify_live_streams
    if notify_comments is not None:
        update_data["notify_comments"] = notify_comments
    if notify_mentions is not None:
        update_data["notify_mentions"] = notify_mentions
    if is_active is not None:
        update_data["is_active"] = is_active
    
    result = await db.telegram_channels.update_one(
        {"id": channel_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    return {"success": True, "message": "Channel settings updated"}


@router.delete("/channels/{channel_id}")
async def delete_channel(channel_id: str):
    """Delete a Telegram channel configuration"""
    db = await get_db()
    
    result = await db.telegram_channels.delete_one({"id": channel_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    return {"success": True, "message": "Channel deleted"}
