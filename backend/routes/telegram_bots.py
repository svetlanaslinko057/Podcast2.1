"""
Telegram Bots Management Routes
Quick access bot configuration for creators
"""
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timezone

from models import TelegramBotConfig, TelegramBotCreate, TelegramBotUpdate

router = APIRouter(prefix="/telegram-bots", tags=["telegram-bots"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


async def get_telegram_service():
    """Get Telegram service"""
    from services.telegram_service import telegram_service
    return telegram_service


@router.post("", response_model=TelegramBotConfig)
async def create_bot_config(bot: TelegramBotCreate):
    """
    Create new Telegram bot configuration
    
    This allows quick access to pre-configured bots when creating podcasts/streams
    """
    db = await get_db()
    telegram_service = await get_telegram_service()
    
    # Test bot token
    bot_info = await telegram_service.get_bot_info(bot.bot_token)
    if not bot_info.get('success'):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bot token: {bot_info.get('error')}"
        )
    
    # Create bot config
    bot_dict = bot.model_dump()
    bot_obj = TelegramBotConfig(**bot_dict)
    
    doc = bot_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('last_used_at'):
        doc['last_used_at'] = doc['last_used_at'].isoformat()
    
    await db.telegram_bots.insert_one(doc)
    return bot_obj


@router.get("/user/{user_id}", response_model=List[TelegramBotConfig])
async def get_user_bots(user_id: str):
    """Get all bot configurations for a user"""
    db = await get_db()
    
    bots = await db.telegram_bots.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Convert datetime strings
    for bot in bots:
        if isinstance(bot.get('created_at'), str):
            bot['created_at'] = datetime.fromisoformat(bot['created_at'])
        if isinstance(bot.get('updated_at'), str):
            bot['updated_at'] = datetime.fromisoformat(bot['updated_at'])
        if bot.get('last_used_at') and isinstance(bot['last_used_at'], str):
            bot['last_used_at'] = datetime.fromisoformat(bot['last_used_at'])
    
    return bots


@router.get("/{bot_id}", response_model=TelegramBotConfig)
async def get_bot_config(bot_id: str):
    """Get specific bot configuration"""
    db = await get_db()
    
    bot = await db.telegram_bots.find_one({"id": bot_id}, {"_id": 0})
    if not bot:
        raise HTTPException(status_code=404, detail="Bot configuration not found")
    
    # Convert datetime strings
    if isinstance(bot.get('created_at'), str):
        bot['created_at'] = datetime.fromisoformat(bot['created_at'])
    if isinstance(bot.get('updated_at'), str):
        bot['updated_at'] = datetime.fromisoformat(bot['updated_at'])
    if bot.get('last_used_at') and isinstance(bot['last_used_at'], str):
        bot['last_used_at'] = datetime.fromisoformat(bot['last_used_at'])
    
    return bot


@router.put("/{bot_id}", response_model=TelegramBotConfig)
async def update_bot_config(bot_id: str, update: TelegramBotUpdate):
    """Update bot configuration"""
    db = await get_db()
    telegram_service = await get_telegram_service()
    
    bot = await db.telegram_bots.find_one({"id": bot_id})
    if not bot:
        raise HTTPException(status_code=404, detail="Bot configuration not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Test new bot token if provided
    if 'bot_token' in update_data:
        bot_info = await telegram_service.get_bot_info(update_data['bot_token'])
        if not bot_info.get('success'):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid bot token: {bot_info.get('error')}"
            )
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.telegram_bots.update_one(
        {"id": bot_id},
        {"$set": update_data}
    )
    
    # Return updated bot
    updated_bot = await db.telegram_bots.find_one({"id": bot_id}, {"_id": 0})
    
    # Convert datetime strings
    if isinstance(updated_bot.get('created_at'), str):
        updated_bot['created_at'] = datetime.fromisoformat(updated_bot['created_at'])
    if isinstance(updated_bot.get('updated_at'), str):
        updated_bot['updated_at'] = datetime.fromisoformat(updated_bot['updated_at'])
    if updated_bot.get('last_used_at') and isinstance(updated_bot['last_used_at'], str):
        updated_bot['last_used_at'] = datetime.fromisoformat(updated_bot['last_used_at'])
    
    return updated_bot


@router.delete("/{bot_id}")
async def delete_bot_config(bot_id: str):
    """Delete bot configuration"""
    db = await get_db()
    
    result = await db.telegram_bots.delete_one({"id": bot_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bot configuration not found")
    
    return {"success": True, "message": "Bot configuration deleted"}


@router.post("/{bot_id}/test")
async def test_bot_config(bot_id: str):
    """Test bot configuration by sending a test message"""
    db = await get_db()
    telegram_service = await get_telegram_service()
    
    bot = await db.telegram_bots.find_one({"id": bot_id}, {"_id": 0})
    if not bot:
        raise HTTPException(status_code=404, detail="Bot configuration not found")
    
    # Send test message
    result = await telegram_service.send_message(
        bot['bot_token'],
        bot['chat_id'],
        f"✅ Тест бота: <b>{bot['name']}</b>\n\nБот успешно настроен и готов к использованию!"
    )
    
    if result.get('success'):
        # Update last used timestamp
        await db.telegram_bots.update_one(
            {"id": bot_id},
            {
                "$set": {"last_used_at": datetime.now(timezone.utc).isoformat()},
                "$inc": {"total_messages_sent": 1}
            }
        )
        return {"success": True, "message": "Test message sent!"}
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to send test message: {result.get('error')}"
        )
