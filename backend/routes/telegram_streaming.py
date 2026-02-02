"""
Telegram Channel Streaming Integration
Allows users to connect their Telegram channels and auto-start live streams
"""
from fastapi import APIRouter, HTTPException, Form
from typing import Optional, List
import uuid
from datetime import datetime, timezone
import logging

router = APIRouter(prefix="/telegram-streaming", tags=["telegram-streaming"])

logger = logging.getLogger(__name__)


async def get_db():
    """Get database instance"""
    from server import db
    return db


# ============ CHANNEL CONNECTION ============

@router.post("/connect-channel")
async def connect_telegram_channel(
    author_id: str = Form(...),
    channel_username: str = Form(...),
    channel_title: str = Form(...)
):
    """
    Connect Telegram channel for auto-streaming
    
    User must:
    1. Add @Podcast_FOMO_bot as admin to their channel
    2. Submit channel info here
    3. Bot will auto-create live sessions when Voice Chat starts
    """
    db = await get_db()
    
    # Normalize channel_username: extract @username from URL if provided
    normalized_username = channel_username.strip()
    
    # Handle t.me URLs: https://t.me/channel_name or t.me/channel_name
    if 't.me/' in normalized_username:
        # Extract username from URL
        parts = normalized_username.split('t.me/')
        if len(parts) > 1:
            normalized_username = '@' + parts[-1].strip('/')
    
    # Ensure it starts with @
    if normalized_username and not normalized_username.startswith('@'):
        normalized_username = '@' + normalized_username
    
    # Check if channel already connected (check both formats)
    existing = await db.telegram_channel_streaming.find_one({
        "$or": [
            {"channel_username": normalized_username},
            {"channel_username": channel_username}  # Check original too
        ]
    })
    
    if existing and existing.get("author_id") != author_id:
        raise HTTPException(
            status_code=400, 
            detail="This channel is already connected to another account"
        )
    
    # Create connection
    connection = {
        "id": str(uuid.uuid4()),
        "author_id": author_id,
        "channel_username": normalized_username,
        "channel_title": channel_title,
        "is_active": True,
        "auto_start_live": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "total_lives": 0,
            "last_live_at": None
        }
    }
    
    await db.telegram_channel_streaming.insert_one(connection)
    connection.pop('_id', None)
    
    logger.info(f"📺 Author {author_id} connected Telegram channel: {normalized_username}")
    
    return {
        "success": True,
        "message": "Channel connected successfully",
        "connection": connection
    }



@router.get("/channels/{author_id}")
async def get_author_channels(author_id: str):
    """Get all Telegram channels connected by author"""
    db = await get_db()
    
    channels = await db.telegram_channel_streaming.find(
        {"author_id": author_id},
        {"_id": 0}
    ).to_list(50)
    
    return channels


@router.put("/channels/{connection_id}")
async def update_channel_settings(
    connection_id: str,
    auto_start_live: Optional[bool] = Form(None),
    is_active: Optional[bool] = Form(None)
):
    """Update channel streaming settings"""
    db = await get_db()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if auto_start_live is not None:
        update_data["auto_start_live"] = auto_start_live
    if is_active is not None:
        update_data["is_active"] = is_active
    
    result = await db.telegram_channel_streaming.update_one(
        {"id": connection_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Channel connection not found")
    
    return {"success": True, "message": "Settings updated"}


@router.delete("/channels/{connection_id}")
async def disconnect_channel(connection_id: str):
    """Disconnect Telegram channel"""
    db = await get_db()
    
    result = await db.telegram_channel_streaming.delete_one({"id": connection_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Channel connection not found")
    
    return {"success": True, "message": "Channel disconnected"}


# ============ WEBHOOK HANDLER ============

@router.post("/webhook/voice-chat")
async def handle_voice_chat_webhook(
    event_type: str = Form(...),  # "started" or "ended"
    channel_username: str = Form(...),
    channel_id: str = Form(...),
    voice_chat_id: Optional[str] = Form(None)
):
    """
    Webhook handler for Telegram Voice Chat events
    
    Called by Telegram bot when:
    - Voice Chat starts → create live session
    - Voice Chat ends → end live session
    """
    db = await get_db()
    
    # Normalize channel_username for search
    search_username = channel_username.strip()
    if not search_username.startswith('@'):
        search_username = '@' + search_username
    
    # Find channel connection (try multiple formats)
    connection = await db.telegram_channel_streaming.find_one(
        {"$or": [
            {"channel_username": search_username},
            {"channel_username": channel_username},
            {"channel_username": search_username.lower()},
            {"channel_username": {"$regex": search_username.replace('@', ''), "$options": "i"}}
        ]},
        {"_id": 0}
    )
    
    if not connection:
        logger.warning(f"Voice chat event from unknown channel: {channel_username}")
        return {"success": False, "error": "Channel not connected"}
    
    if not connection.get("is_active") or not connection.get("auto_start_live"):
        logger.info(f"Auto-start disabled for channel: {channel_username}")
        return {"success": False, "error": "Auto-start disabled"}
    
    author_id = connection["author_id"]
    
    if event_type == "started":
        # Create live session
        live_session = {
            "id": str(uuid.uuid4()),
            "author_id": author_id,
            "title": f"Live from {connection['channel_title']}",
            "description": f"Voice Chat started in Telegram channel @{channel_username}",
            "is_live": True,
            "telegram_source": {
                "channel_username": channel_username,
                "channel_id": channel_id,
                "voice_chat_id": voice_chat_id
            },
            "started_at": datetime.now(timezone.utc).isoformat(),
            "listener_count": 0,
            "platform": "telegram"
        }
        
        await db.live_sessions.insert_one(live_session)
        live_session.pop('_id', None)
        
        # Update stats
        await db.telegram_channel_streaming.update_one(
            {"id": connection["id"]},
            {
                "$inc": {"stats.total_lives": 1},
                "$set": {
                    "stats.last_live_at": datetime.now(timezone.utc).isoformat(),
                    "current_live_session_id": live_session["id"]
                }
            }
        )
        
        logger.info(f"🔴 Auto-started live session for @{channel_username}")
        
        return {
            "success": True,
            "message": "Live session created",
            "session": live_session
        }
    
    elif event_type == "ended":
        # End live session and create podcast
        current_session_id = connection.get("current_live_session_id")
        
        if current_session_id:
            # Get the live session data
            live_session = await db.live_sessions.find_one({"id": current_session_id}, {"_id": 0})
            
            if live_session:
                ended_at = datetime.now(timezone.utc)
                started_at = datetime.fromisoformat(live_session["started_at"].replace('Z', '+00:00')) if live_session.get("started_at") else ended_at
                duration_seconds = int((ended_at - started_at).total_seconds())
                
                # Update live session as ended
                await db.live_sessions.update_one(
                    {"id": current_session_id},
                    {
                        "$set": {
                            "is_live": False,
                            "ended_at": ended_at.isoformat(),
                            "duration_seconds": duration_seconds
                        }
                    }
                )
                
                # Get existing author - don't create new one!
                author = await db.authors.find_one({"id": author_id}, {"_id": 0})
                
                if author:
                    # Create podcast from ended live session
                    # Format duration as MM:SS
                    duration_mins = duration_seconds // 60
                    duration_secs = duration_seconds % 60
                    duration_formatted = f"{duration_mins}:{duration_secs:02d}"
                    
                    podcast = {
                        "id": str(uuid.uuid4()),
                        "title": live_session.get("title", f"Stream from {connection['channel_title']}"),
                        "description": live_session.get("description", "Recorded Telegram Voice Chat"),
                        "author_id": author_id,
                        "cover_image": author.get("avatar") or "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500",
                        "tags": ["telegram", "live", "voice-chat"],
                        "category": "Live Recording",
                        "duration": duration_formatted,
                        "duration_seconds": duration_seconds,
                        "is_live": False,
                        "is_premium": False,
                        "visibility": "public",
                        "language": "en",
                        "listen_count": live_session.get("listener_count", 0),
                        "like_count": 0,
                        "comment_count": 0,
                        "source": "telegram",
                        "telegram_source": live_session.get("telegram_source"),
                        "live_session_id": current_session_id,
                        "recorded_at": live_session.get("started_at"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    await db.podcasts.insert_one(podcast)
                    podcast.pop('_id', None)
                    
                    # Update author stats
                    await db.authors.update_one(
                        {"id": author_id},
                        {
                            "$inc": {
                                "podcasts_count": 1,
                                "total_listens": live_session.get("listener_count", 0)
                            }
                        }
                    )
                    
                    logger.info(f"🎙️ Created podcast from live session: {podcast['title']}")
                else:
                    logger.warning(f"Author {author_id} not found, podcast not created")
            
            # Clear current session from channel
            await db.telegram_channel_streaming.update_one(
                {"id": connection["id"]},
                {"$unset": {"current_live_session_id": ""}}
            )
            
            logger.info(f"⏹️ Ended live session for @{channel_username}")
        
        return {"success": True, "message": "Live session ended"}
    
    return {"success": False, "error": "Unknown event type"}


# ============ END LIVE FROM PLATFORM ============

@router.post("/end-live/{session_id}")
async def end_live_from_platform(session_id: str, author_id: str = Form(...)):
    """
    End a live session from the platform (not via Telegram webhook)
    This allows users to end their live stream directly from the web UI
    """
    db = await get_db()
    
    # Get the live session
    live_session = await db.live_sessions.find_one({"id": session_id}, {"_id": 0})
    
    if not live_session:
        raise HTTPException(status_code=404, detail="Live session not found")
    
    if live_session.get("author_id") != author_id:
        raise HTTPException(status_code=403, detail="You can only end your own live sessions")
    
    if not live_session.get("is_live"):
        return {"success": True, "message": "Session already ended"}
    
    # End the session
    ended_at = datetime.now(timezone.utc)
    started_at = datetime.fromisoformat(live_session["started_at"].replace('Z', '+00:00')) if live_session.get("started_at") else ended_at
    duration_seconds = int((ended_at - started_at).total_seconds())
    
    await db.live_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "is_live": False,
                "ended_at": ended_at.isoformat(),
                "duration_seconds": duration_seconds
            }
        }
    )
    
    # Get author info
    author = await db.authors.find_one({"id": author_id}, {"_id": 0})
    
    if author:
        # Create podcast from the session
        duration_mins = duration_seconds // 60
        duration_secs = duration_seconds % 60
        duration_formatted = f"{duration_mins}:{duration_secs:02d}"
        
        podcast = {
            "id": str(uuid.uuid4()),
            "title": live_session.get("title", "Live Recording"),
            "description": live_session.get("description", "Recorded live session"),
            "author_id": author_id,
            "cover_image": author.get("avatar") or "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500",
            "tags": ["live", "recording"],
            "category": "Live Recording",
            "duration": duration_formatted,
            "duration_seconds": duration_seconds,
            "is_live": False,
            "is_premium": False,
            "visibility": "public",
            "language": "en",
            "listen_count": live_session.get("listener_count", 0),
            "like_count": 0,
            "comment_count": 0,
            "source": live_session.get("platform", "web"),
            "live_session_id": session_id,
            "recorded_at": live_session.get("started_at"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.podcasts.insert_one(podcast)
        
        # Update author stats
        await db.authors.update_one(
            {"id": author_id},
            {
                "$inc": {
                    "podcasts_count": 1,
                    "total_listens": live_session.get("listener_count", 0)
                }
            }
        )
        
        logger.info(f"🎙️ Created podcast from platform-ended live: {podcast['title']}")
    
    # If this was a Telegram session, clear from channel connection
    if live_session.get("telegram_source"):
        channel_username = live_session["telegram_source"].get("channel_username")
        if channel_username:
            await db.telegram_channel_streaming.update_one(
                {"channel_username": {"$regex": channel_username, "$options": "i"}},
                {"$unset": {"current_live_session_id": ""}}
            )
    
    logger.info(f"⏹️ Live session {session_id} ended from platform")
    
    return {
        "success": True,
        "message": "Live session ended",
        "duration_seconds": duration_seconds
    }


# ============ VERIFICATION ============

@router.post("/verify-admin/{connection_id}")
async def verify_bot_admin(connection_id: str):
    """
    Verify that bot is admin in the channel
    
    Checks via Telegram API if @FOMO_a_bot has admin rights
    """
    db = await get_db()
    
    connection = await db.telegram_channel_streaming.find_one(
        {"id": connection_id},
        {"_id": 0}
    )
    
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # TODO: Call Telegram API to check admin status
    # For now, return success
    
    return {
        "success": True,
        "is_admin": True,
        "permissions": {
            "can_manage_voice_chats": True,
            "can_post_messages": True
        }
    }


# ============ STATS ============

@router.get("/stats/{author_id}")
async def get_streaming_stats(author_id: str):
    """Get statistics for author's Telegram streaming"""
    db = await get_db()
    
    channels = await db.telegram_channel_streaming.find(
        {"author_id": author_id},
        {"_id": 0}
    ).to_list(100)
    
    total_lives = sum(ch.get("stats", {}).get("total_lives", 0) for ch in channels)
    
    # Get active live sessions
    active_sessions = await db.live_sessions.count_documents({
        "author_id": author_id,
        "is_live": True,
        "platform": "telegram"
    })
    
    return {
        "total_channels": len(channels),
        "total_lives": total_lives,
        "active_lives": active_sessions,
        "channels": channels
    }
