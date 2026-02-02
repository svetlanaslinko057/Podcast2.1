"""
Telegram Routes - Testing and integration
Includes OAuth callback for Telegram Login Widget
"""
from fastapi import APIRouter, Form, HTTPException
from typing import List, Optional
import os
import logging
from models import TelegramConnection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])

# Bot token from environment or hardcoded default
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E")
TELEGRAM_BOT_USERNAME = "Podcast_FOMO_bot"


async def get_db():
    """Get database instance"""
    from server import db
    return db


async def get_telegram_service():
    """Get Telegram service instance"""
    from services.telegram_service import telegram_service
    return telegram_service


@router.post("/test-bot")
async def test_telegram_bot(
    bot_token: str = Form(...),
    chat_id: str = Form(...),
    message: str = Form("🎙️ Test message from FOMO Podcasts!")
):
    """
    Test Telegram bot connection
    
    Args:
        bot_token: Telegram bot token (from @BotFather)
        chat_id: Chat/Channel ID
        message: Test message to send
    
    Returns:
        Success status and bot info
    """
    telegram_service = await get_telegram_service()
    
    # Get bot info first
    bot_info = await telegram_service.get_bot_info(bot_token)
    
    if not bot_info.get('success'):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bot token: {bot_info.get('error')}"
        )
    
    # Send test message
    result = await telegram_service.send_message(bot_token, chat_id, message)
    
    if result.get('success'):
        return {
            "success": True,
            "message": "Test message sent successfully!",
            "bot": bot_info.get('bot'),
            "chat_id": chat_id
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to send message: {result.get('error')}"
        )


@router.post("/send-notification")
async def send_custom_notification(
    bot_token: str = Form(...),
    chat_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    url: str = Form(None)
):
    """
    Send custom notification to Telegram
    
    Args:
        bot_token: Telegram bot token
        chat_id: Chat/Channel ID
        title: Notification title
        description: Notification description
        url: Optional URL link
    
    Returns:
        Success status
    """
    telegram_service = await get_telegram_service()
    
    message = f"""
🔔 <b>{title}</b>

{description}
"""
    
    if url:
        message += f"\n\n🔗 <a href='{url}'>Подробнее</a>"
    
    result = await telegram_service.send_message(bot_token, chat_id, message.strip())
    
    if result.get('success'):
        return {
            "success": True,
            "message": "Notification sent!"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to send notification: {result.get('error')}"
        )


@router.get("/get-bot-info")
async def get_bot_info(bot_token: str):
    """
    Get Telegram bot information
    
    Args:
        bot_token: Telegram bot token
    
    Returns:
        Bot information
    """
    telegram_service = await get_telegram_service()
    
    result = await telegram_service.get_bot_info(bot_token)
    
    if result.get('success'):
        return result
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to get bot info: {result.get('error')}"
        )


@router.get("/connections/{user_id}", response_model=List[TelegramConnection])
async def get_telegram_connections(user_id: str):
    """Get all Telegram connections for a user"""
    db = await get_db()
    
    connections = await db.telegram_connections.find(
        {"author_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    return connections



@router.post("/connect-personal")
async def connect_personal_telegram(
    author_id: str = Form(...),
    chat_id: str = Form(...),
    username: str = Form(None)
):
    """
    Connect user's personal Telegram account for alerts
    
    Args:
        author_id: Author/User ID
        chat_id: User's Telegram chat_id (from bot)
        username: Optional Telegram username
    
    Returns:
        Success status with author info
    """
    db = await get_db()
    
    # Update author with Telegram info
    result = await db.authors.update_one(
        {"id": author_id},
        {"$set": {
            "telegram_chat_id": chat_id,
            "telegram_username": username,
            "telegram_connected": True
        }}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Get updated author
    author = await db.authors.find_one({"id": author_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Telegram connected successfully!",
        "author": {
            "id": author['id'],
            "telegram_chat_id": author.get('telegram_chat_id'),
            "telegram_username": author.get('telegram_username'),
            "telegram_connected": author.get('telegram_connected', False)
        }
    }


@router.post("/disconnect-personal")
async def disconnect_personal_telegram(author_id: str = Form(...)):
    """
    Disconnect user's personal Telegram account
    
    Args:
        author_id: Author/User ID
    
    Returns:
        Success status
    """
    db = await get_db()
    
    result = await db.authors.update_one(
        {"id": author_id},
        {"$set": {
            "telegram_chat_id": None,
            "telegram_username": None,
            "telegram_connected": False
        }}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Author not found")
    
    return {
        "success": True,
        "message": "Telegram disconnected successfully!"
    }


@router.get("/personal-status/{author_id}")
async def get_personal_telegram_status(author_id: str):
    """
    Get user's personal Telegram connection status
    
    Args:
        author_id: Author/User ID
    
    Returns:
        Connection status and info
    """
    db = await get_db()
    
    author = await db.authors.find_one(
        {"id": author_id},
        {"_id": 0, "telegram_chat_id": 1, "telegram_username": 1, "telegram_connected": 1}
    )
    
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    return {
        "connected": author.get('telegram_connected', False),
        "chat_id": author.get('telegram_chat_id'),
        "username": author.get('telegram_username')
    }


@router.post("/send-personal-alert")
async def send_personal_alert(
    author_id: str = Form(...),
    alert_type: str = Form(...),
    message: str = Form(...),
    bot_token: str = Form(...)
):
    """
    Send personal alert to user via their connected Telegram
    
    Args:
        author_id: Author/User ID
        alert_type: Type of alert (new_episode, live_start, etc.)
        message: Alert message
        bot_token: Bot token for sending
    
    Returns:
        Success status
    """
    db = await get_db()
    telegram_service = await get_telegram_service()
    
    # Get author's Telegram info
    author = await db.authors.find_one(
        {"id": author_id},
        {"_id": 0, "telegram_chat_id": 1, "telegram_connected": 1}
    )
    
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    if not author.get('telegram_connected') or not author.get('telegram_chat_id'):
        raise HTTPException(
            status_code=400,
            detail="Telegram not connected for this user"
        )
    
    # Send personal alert
    result = await telegram_service.send_personal_alert(
        bot_token=bot_token,
        chat_id=author['telegram_chat_id'],
        alert_type=alert_type,
        message=message
    )
    
    if result.get('success'):
        return {
            "success": True,
            "message": "Personal alert sent!"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to send alert: {result.get('error')}"
        )



# ============ TELEGRAM OAUTH LOGIN WIDGET ============

@router.get("/bot-info")
async def get_bot_config():
    """
    Get bot configuration for Telegram Login Widget
    Returns bot username needed for frontend widget
    """
    return {
        "bot_username": TELEGRAM_BOT_USERNAME,
        "bot_name": "FOMO Podcasts Bot"
    }


@router.post("/auth/callback")
async def telegram_auth_callback(
    id: str = Form(...),
    first_name: str = Form(...),
    auth_date: str = Form(...),
    hash: str = Form(...),
    author_id: str = Form(...),
    last_name: Optional[str] = Form(None),
    username: Optional[str] = Form(None),
    photo_url: Optional[str] = Form(None)
):
    """
    Telegram Login Widget OAuth callback
    Verifies the auth data and connects user's Telegram account
    
    Flow:
    1. User clicks Telegram Login Widget on frontend
    2. Telegram sends auth data to this endpoint
    3. We verify the hash using bot token
    4. Save telegram_chat_id to author document
    
    Args:
        id: Telegram user ID (this is also the chat_id for personal messages)
        first_name: User's first name
        auth_date: Unix timestamp of authentication
        hash: Data hash for verification
        author_id: FOMO platform author ID
        last_name: User's last name (optional)
        username: Telegram username (optional)
        photo_url: User's profile photo URL (optional)
    """
    from utils.telegram_verify import verify_telegram_auth_with_expiry, create_telegram_user_data
    
    db = await get_db()
    
    # Prepare auth data for verification
    auth_data = {
        "id": id,
        "first_name": first_name,
        "auth_date": auth_date,
        "hash": hash
    }
    
    if last_name:
        auth_data["last_name"] = last_name
    if username:
        auth_data["username"] = username
    if photo_url:
        auth_data["photo_url"] = photo_url
    
    # Verify Telegram authentication
    is_valid, error_msg = verify_telegram_auth_with_expiry(auth_data, TELEGRAM_BOT_TOKEN)
    
    if not is_valid:
        logger.warning(f"Telegram auth failed for author {author_id}: {error_msg}")
        raise HTTPException(status_code=401, detail=f"Invalid Telegram authentication: {error_msg}")
    
    # Extract user data
    telegram_data = create_telegram_user_data(auth_data)
    
    # Update author with Telegram info
    # Note: For personal messages, chat_id equals user_id
    result = await db.authors.update_one(
        {"id": author_id},
        {"$set": {
            "telegram_chat_id": telegram_data["telegram_chat_id"],
            "telegram_username": telegram_data.get("telegram_username"),
            "telegram_first_name": telegram_data.get("first_name"),
            "telegram_photo_url": telegram_data.get("photo_url"),
            "telegram_connected": True,
            "telegram_auth_date": telegram_data.get("auth_date")
        }}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Get updated author
    author = await db.authors.find_one({"id": author_id}, {"_id": 0})
    
    logger.info(f"✅ Telegram OAuth connected for author {author_id}: @{username or id}")
    
    # Send welcome message via bot
    telegram_service = await get_telegram_service()
    welcome_msg = f"""
🎉 <b>Telegram подключён!</b>

Привет, {first_name}! Твой аккаунт FOMO Podcasts теперь связан с Telegram.

✅ Ты будешь получать уведомления о:
• 🎙️ Новых подкастах
• 🔴 Live трансляциях
• 💬 Комментариях
• 👤 Подписчиках

Настрой уведомления в разделе Social Hub → Alerts
"""
    
    await telegram_service.send_message(
        TELEGRAM_BOT_TOKEN,
        telegram_data["telegram_chat_id"],
        welcome_msg.strip()
    )
    
    return {
        "success": True,
        "message": "Telegram connected successfully!",
        "author": {
            "id": author['id'],
            "telegram_chat_id": author.get('telegram_chat_id'),
            "telegram_username": author.get('telegram_username'),
            "telegram_connected": author.get('telegram_connected', False)
        }
    }


@router.post("/auth/callback-json")
async def telegram_auth_callback_json(data: dict):
    """
    Telegram Login Widget OAuth callback (JSON version)
    Alternative endpoint accepting JSON body
    """
    from utils.telegram_verify import verify_telegram_auth_with_expiry, create_telegram_user_data
    
    db = await get_db()
    
    author_id = data.get('author_id')
    if not author_id:
        raise HTTPException(status_code=400, detail="author_id is required")
    
    # Prepare auth data for verification
    auth_data = {
        "id": str(data.get('id')),
        "first_name": data.get('first_name'),
        "auth_date": str(data.get('auth_date')),
        "hash": data.get('hash')
    }
    
    if data.get('last_name'):
        auth_data["last_name"] = data['last_name']
    if data.get('username'):
        auth_data["username"] = data['username']
    if data.get('photo_url'):
        auth_data["photo_url"] = data['photo_url']
    
    # Verify Telegram authentication
    is_valid, error_msg = verify_telegram_auth_with_expiry(auth_data, TELEGRAM_BOT_TOKEN)
    
    if not is_valid:
        logger.warning(f"Telegram auth failed for author {author_id}: {error_msg}")
        raise HTTPException(status_code=401, detail=f"Invalid Telegram authentication: {error_msg}")
    
    # Extract user data
    telegram_data = create_telegram_user_data(auth_data)
    
    # Update author with Telegram info
    result = await db.authors.update_one(
        {"id": author_id},
        {"$set": {
            "telegram_chat_id": telegram_data["telegram_chat_id"],
            "telegram_username": telegram_data.get("telegram_username"),
            "telegram_first_name": telegram_data.get("first_name"),
            "telegram_photo_url": telegram_data.get("photo_url"),
            "telegram_connected": True,
            "telegram_auth_date": telegram_data.get("auth_date")
        }}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Get updated author
    author = await db.authors.find_one({"id": author_id}, {"_id": 0})
    
    logger.info(f"✅ Telegram OAuth connected for author {author_id}")
    
    # Send welcome message
    telegram_service = await get_telegram_service()
    welcome_msg = f"""
🎉 <b>Telegram подключён!</b>

Привет, {data.get('first_name', 'друг')}! Твой аккаунт FOMO Podcasts теперь связан с Telegram.

✅ Ты будешь получать уведомления о:
• 🎙️ Новых подкастах
• 🔴 Live трансляциях
• 💬 Комментариях
• 👤 Подписчиках
"""
    
    await telegram_service.send_message(
        TELEGRAM_BOT_TOKEN,
        telegram_data["telegram_chat_id"],
        welcome_msg.strip()
    )
    
    return {
        "success": True,
        "message": "Telegram connected successfully!",
        "author": {
            "id": author['id'],
            "telegram_chat_id": author.get('telegram_chat_id'),
            "telegram_username": author.get('telegram_username'),
            "telegram_connected": author.get('telegram_connected', False)
        }
    }

