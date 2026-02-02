#!/usr/bin/env python3
"""
FOMO Podcasts - Telegram Bot Handler
Handles /start command and Voice Chat events
"""
import asyncio
import os
import logging
import httpx
from telegram import Update, Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, CallbackQueryHandler, filters

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8001")


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle /start command
    Shows menu with options
    """
    chat = update.effective_chat
    chat_id = chat.id
    chat_type = chat.type
    user = update.effective_user
    
    # Create inline keyboard with menu
    keyboard = [
        [InlineKeyboardButton("📱 Настроить Alerts (уведомления)", callback_data='alerts')],
        [InlineKeyboardButton("🎙️ Настроить Voice Chat (подкасты)", callback_data='voicechat')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message = f"""
🎉 <b>Добро пожаловать в FOMO Podcasts Bot!</b>

<b>Ваш Chat ID:</b> <code>{chat_id}</code>

👤 Пользователь: {user.first_name if user else chat.title or 'Unknown'}

━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>Выберите что вы хотите настроить:</b>

📱 <b>Alerts</b> - получайте уведомления о новых подкастах
🎙️ <b>Voice Chat</b> - автоматические live трансляции

<i>Нажмите на кнопку ниже ↓</i>
"""
    
    await update.message.reply_text(
        message,
        parse_mode='HTML',
        reply_markup=reply_markup
    )
    
    logger.info(f"📱 /start command from chat_id={chat_id}, type={chat_type}, user={user.first_name if user else 'N/A'}")


async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button presses"""
    query = update.callback_query
    await query.answer()
    
    chat = query.message.chat
    chat_id = chat.id
    user = query.from_user
    
    if query.data == 'alerts':
        # Show Alerts instructions
        message = f"""
🎉 <b>НАСТРОЙКА ALERTS (Уведомления)</b>

<b>Ваш Chat ID:</b>
<code>{chat_id}</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Как подключить уведомления:</b>

1️⃣ <b>Скопируйте Chat ID</b> выше (нажмите на число)

2️⃣ <b>Откройте FOMO Podcasts</b> приложение

3️⃣ <b>Перейдите</b> в Social Hub → Alerts

4️⃣ <b>Вставьте Chat ID</b> в форму

5️⃣ <b>Выберите типы уведомлений:</b>
   • 🎙️ Новые подкасты от авторов
   • 🔴 Live трансляции
   • 💬 Ответы на комментарии
   • 👤 Упоминания

6️⃣ <b>Нажмите "Connect Telegram"</b>

━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ <b>После подключения вы будете получать:</b>
• 🎙️ Новые подкасты от авторов
• 🔴 Уведомления о live трансляциях
• 💬 Ответы на комментарии
• 👤 Упоминания

<i>Ваш Chat ID сохранён безопасно!</i>
"""
        
        # Back button
        keyboard = [[InlineKeyboardButton("← Назад в меню", callback_data='back')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            text=message,
            parse_mode='HTML',
            reply_markup=reply_markup
        )
        logger.info(f"📱 User {user.first_name} selected ALERTS")
        
    elif query.data == 'voicechat':
        # Show Voice Chat instructions
        channel_username = f"@{chat.username}" if chat.username else "установите username канала"
        
        message = f"""
🎉 <b>НАСТРОЙКА VOICE CHAT (Подкасты)</b>

<b>Chat ID канала:</b>
<code>{chat_id}</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Как настроить автоматические подкасты:</b>

1️⃣ <b>Добавьте бота</b> в ваш Telegram канал как <b>администратора</b>
   (Права: "Manage Voice Chats")

2️⃣ <b>Откройте FOMO Podcasts</b> приложение

3️⃣ <b>Перейдите</b> в Creator Workspace → Streaming Settings

4️⃣ <b>Найдите раздел</b> "Telegram Voice Chat Integration"

5️⃣ <b>Введите username</b> вашего канала: <code>{channel_username}</code>

6️⃣ <b>Нажмите "Connect Channel"</b>

━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ <b>После подключения:</b>
• 🔴 Запускаете Voice Chat в канале
• ✨ Автоматически создается live трансляция
• 👥 Слушатели присоединяются через приложение
• ⏹️ Voice Chat завершается → live закрывается

<i>Больше не нужно вручную создавать трансляции!</i>
"""
        
        # Back button
        keyboard = [[InlineKeyboardButton("← Назад в меню", callback_data='back')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            text=message,
            parse_mode='HTML',
            reply_markup=reply_markup
        )
        logger.info(f"🎙️ User {user.first_name} selected VOICE CHAT")
        
    elif query.data == 'back':
        # Show menu again
        keyboard = [
            [InlineKeyboardButton("📱 Настроить Alerts (уведомления)", callback_data='alerts')],
            [InlineKeyboardButton("🎙️ Настроить Voice Chat (подкасты)", callback_data='voicechat')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        message = f"""
🎉 <b>Добро пожаловать в FOMO Podcasts Bot!</b>

<b>Ваш Chat ID:</b> <code>{chat_id}</code>

👤 Пользователь: {user.first_name or chat.title or 'Unknown'}

━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>Выберите что вы хотите настроить:</b>

📱 <b>Alerts</b> - получайте уведомления о новых подкастах
🎙️ <b>Voice Chat</b> - автоматические live трансляции

<i>Нажмите на кнопку ниже ↓</i>
"""
        
        await query.edit_message_text(
            text=message,
            parse_mode='HTML',
            reply_markup=reply_markup
        )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    message = """
🤖 <b>FOMO Podcasts Bot - Справка</b>

<b>Доступные команды:</b>
/start - Показать меню настройки
/help - Показать эту справку

━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>📱 Для слушателей:</b>

Получайте уведомления о:
• 🎙️ Новых подкастах от авторов
• 🔴 Live трансляциях
• 💬 Ответах на комментарии
• 👤 Упоминаниях

<b>Настройка:</b> Отправьте /start → выберите "Alerts"

━━━━━━━━━━━━━━━━━━━━━━━━━━

<b>🎙️ Для авторов:</b>

Автоматически создавайте live при Voice Chat!

<b>Настройка:</b> Отправьте /start → выберите "Voice Chat"

━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 <b>Два в одном - выбирайте что нужно!</b>
"""
    
    await update.message.reply_text(message, parse_mode='HTML')


async def voice_chat_started_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle Voice Chat started event
    Automatically creates live session on platform
    """
    chat = update.effective_chat
    
    if chat.type not in ["channel", "supergroup"]:
        return
    
    logger.info(f"🔴 Voice Chat started in {chat.title} (@{chat.username or 'private'})")
    
    # Get voice chat info
    voice_chat_info = None
    if hasattr(update.message, 'video_chat_started'):
        voice_chat_info = update.message.video_chat_started
    
    # Send webhook to backend
    try:
        async with httpx.AsyncClient() as client:
            data = {
                "event_type": "started",
                "channel_username": chat.username or str(chat.id),
                "channel_id": str(chat.id),
                "voice_chat_id": str(voice_chat_info) if voice_chat_info else None
            }
            
            response = await client.post(
                f"{BACKEND_URL}/api/telegram-streaming/webhook/voice-chat",
                data=data
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    logger.info(f"✅ Live session created for @{chat.username}")
                else:
                    logger.warning(f"⚠️ Could not create live: {result.get('error')}")
            else:
                logger.error(f"❌ Backend error: {response.status_code}")
                
    except Exception as e:
        logger.error(f"❌ Failed to notify backend: {e}")


async def voice_chat_ended_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle Voice Chat ended event
    Ends live session on platform
    """
    chat = update.effective_chat
    
    if chat.type not in ["channel", "supergroup"]:
        return
    
    logger.info(f"⏹️ Voice Chat ended in {chat.title} (@{chat.username or 'private'})")
    
    # Send webhook to backend
    try:
        async with httpx.AsyncClient() as client:
            data = {
                "event_type": "ended",
                "channel_username": chat.username or str(chat.id),
                "channel_id": str(chat.id)
            }
            
            response = await client.post(
                f"{BACKEND_URL}/api/telegram-streaming/webhook/voice-chat",
                data=data
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Live session ended for @{chat.username}")
            else:
                logger.error(f"❌ Backend error: {response.status_code}")
                
    except Exception as e:
        logger.error(f"❌ Failed to notify backend: {e}")


def main():
    """Start the bot"""
    logger.info("🚀 Starting FOMO Podcasts Telegram Bot...")
    
    # Create application
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Voice Chat handlers (called VIDEO_CHAT in newer versions)
    application.add_handler(
        MessageHandler(
            filters.StatusUpdate.VIDEO_CHAT_STARTED,
            voice_chat_started_handler
        )
    )
    application.add_handler(
        MessageHandler(
            filters.StatusUpdate.VIDEO_CHAT_ENDED,
            voice_chat_ended_handler
        )
    )
    
    logger.info("✅ Bot is ready! Listening for commands and Voice Chat events...")
    
    # Run the bot
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
