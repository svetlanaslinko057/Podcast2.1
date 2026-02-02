from telegram import Bot, Update
from telegram.constants import ParseMode
import os
from dotenv import load_dotenv
import logging
from datetime import datetime, timezone
from database import get_database

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Telegram Bot (optional)
telegram_token = os.getenv("TELEGRAM_TOKEN")
bot = Bot(token=telegram_token) if telegram_token else None

async def send_telegram_message(chat_id: int, message: str):
    """
    Надіслати повідомлення в Telegram чат
    """
    if not bot:
        logger.warning("Telegram bot not configured")
        return {"status": "error", "message": "Telegram bot not configured"}
    
    try:
        await bot.send_message(
            chat_id=chat_id,
            text=message,
            parse_mode=ParseMode.MARKDOWN
        )
        return {"status": "success", "message": "Message sent"}
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {str(e)}")
        raise

async def handle_telegram_webhook(update_data: dict):
    """
    Обробка вхідних оновлень з Telegram
    """
    if not bot:
        logger.warning("Telegram bot not configured")
        return {"status": "error", "message": "Telegram bot not configured"}
    
    try:
        update = Update.de_json(update_data, bot)
        
        if update.message:
            # Збереження повідомлення в базу даних
            db = await get_database()
            await db.telegram_messages.insert_one({
                "chat_id": update.message.chat_id,
                "message": update.message.text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "direction": "incoming"
            })
            
            # Можна додати обробку команд
            if update.message.text and update.message.text.startswith('/start'):
                await bot.send_message(
                    chat_id=update.message.chat_id,
                    text="Привіт! Це FOMO Podcast Bot. Підключіть цю групу до вашого профілю автора."
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        raise

async def start_voice_recording(chat_id: str, podcast_title: str):
    """
    Розпочати запис голосової трансляції з Telegram
    """
    # Заглушка для демонстрації функціональності
    # В реальності потрібна інтеграція з Telegram Voice Chat API
    try:
        db = await get_database()
        recording = {
            "chat_id": chat_id,
            "podcast_title": podcast_title,
            "status": "recording",
            "started_at": datetime.now(timezone.utc).isoformat()
        }
        await db.voice_recordings.insert_one(recording)
        return recording
    except Exception as e:
        logger.error(f"Failed to start voice recording: {str(e)}")
        raise