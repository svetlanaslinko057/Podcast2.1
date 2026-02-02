"""
Telegram Integration Service
Real Telegram bot integration with notifications
"""
import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)


class TelegramService:
    """Service for Telegram bot integration"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
    
    async def send_message(
        self,
        bot_token: str,
        chat_id: str,
        text: str,
        parse_mode: str = 'HTML',
        disable_notification: bool = False,
        is_personal: bool = True
    ) -> dict:
        """
        Send message to Telegram chat
        
        Args:
            bot_token: Telegram bot token
            chat_id: Chat ID (personal) or Channel ID (@channel)
            text: Message text
            parse_mode: HTML or Markdown
            disable_notification: Silent notification
            is_personal: True for personal messages, False for channels
        
        Returns:
            Response from Telegram API
        """
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        payload = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode,
            'disable_notification': disable_notification
        }
        
        try:
            response = await self.client.post(url, json=payload)
            result = response.json()
            
            if response.status_code == 200 and result.get('ok'):
                msg_type = "personal" if is_personal else "channel"
                logger.info(f"✅ Telegram {msg_type} message sent to {chat_id}")
                return {'success': True, 'result': result}
            else:
                error = result.get('description', 'Unknown error')
                logger.error(f"❌ Telegram error: {error}")
                return {'success': False, 'error': error}
                
        except Exception as e:
            logger.error(f"❌ Telegram exception: {e}")
            return {'success': False, 'error': str(e)}
    
    async def send_personal_alert(
        self,
        bot_token: str,
        chat_id: str,
        alert_type: str,
        message: str,
        data: dict = None
    ) -> dict:
        """
        Send personal alert to user via bot
        
        Args:
            bot_token: Telegram bot token
            chat_id: User's personal chat_id
            alert_type: Type of alert (new_episode, live_start, etc.)
            message: Alert message
            data: Additional data for formatting
        
        Returns:
            Response from Telegram API
        """
        # Format message with emoji and structure
        icons = {
            'new_episode': '🎙️',
            'live_start': '🔴',
            'new_follower': '👤',
            'new_comment': '💬',
            'new_reaction': '❤️'
        }
        
        icon = icons.get(alert_type, '🔔')
        formatted_message = f"{icon} <b>FOMO Podcasts Alert</b>\n\n{message}"
        
        return await self.send_message(
            bot_token=bot_token,
            chat_id=chat_id,
            text=formatted_message,
            is_personal=True
        )
    
    async def send_podcast_notification(
        self,
        bot_token: str,
        chat_id: str,
        podcast_data: dict
    ) -> dict:
        """
        Send formatted podcast notification
        
        Args:
            bot_token: Telegram bot token
            chat_id: Chat/Channel ID
            podcast_data: Podcast information
        
        Returns:
            Result of send operation
        """
        # Format message
        title = podcast_data.get('title', 'New Podcast')
        author_name = podcast_data.get('author_name', 'Unknown')
        description = podcast_data.get('description', '')
        tags = podcast_data.get('tags', [])
        podcast_url = podcast_data.get('url', '')
        
        # Create beautiful message
        message = f"""
🎙️ <b>Новый подкаст!</b>

<b>{title}</b>
👤 Автор: {author_name}

{description[:200]}{'...' if len(description) > 200 else ''}

🏷️ Теги: {', '.join(tags[:5])}

🔗 <a href="{podcast_url}">Слушать подкаст</a>
"""
        
        return await self.send_message(bot_token, chat_id, message.strip())
    
    async def send_live_notification(
        self,
        bot_token: str,
        chat_id: str,
        live_data: dict
    ) -> dict:
        """
        Send live broadcast notification
        
        Args:
            bot_token: Telegram bot token
            chat_id: Chat/Channel ID
            live_data: Live broadcast information
        
        Returns:
            Result of send operation
        """
        title = live_data.get('title', 'Live Broadcast')
        author_name = live_data.get('author_name', 'Unknown')
        live_url = live_data.get('url', '')
        
        message = f"""
🔴 <b>LIVE СТРИМ НАЧАЛСЯ!</b>

<b>{title}</b>
👤 {author_name}

📺 <a href="{live_url}">Присоединиться к стриму</a>
"""
        
        return await self.send_message(bot_token, chat_id, message.strip())
    
    async def send_live_started_notification(
        self,
        bot_token: str,
        chat_id: str,
        session_data: dict
    ) -> dict:
        """
        Send notification when live session starts
        
        Args:
            bot_token: Telegram bot token
            chat_id: Chat/Channel ID
            session_data: Live session information
        
        Returns:
            Result of send operation
        """
        title = session_data.get('title', 'Live Session')
        description = session_data.get('description', '')
        session_id = session_data.get('id', '')
        
        # Get notification channel for voice chat link
        notification_channel = os.environ.get("TELEGRAM_NOTIFICATIONS_CHANNEL", "P_FOMO")
        
        message = f"""
🔴 <b>СТРИМ НАЧАЛСЯ!</b>

🎙️ <b>{title}</b>

{description[:200] if description else 'Присоединяйтесь к live-стриму!'}

🎧 <b>Присоединиться к голосовому чату:</b>
👉 <a href="https://t.me/{notification_channel}">@{notification_channel}</a>

💡 Откройте группу и нажмите на голосовой чат вверху
"""
        
        return await self.send_message(bot_token, chat_id, message.strip())
    
    async def send_live_ended_notification(
        self,
        bot_token: str,
        chat_id: str,
        session_data: dict
    ) -> dict:
        """
        Send notification when live session ends
        
        Args:
            bot_token: Telegram bot token
            chat_id: Chat/Channel ID
            session_data: Live session information
        
        Returns:
            Result of send operation
        """
        title = session_data.get('title', 'Live Session')
        participants = session_data.get('participants_count', 0)
        duration = session_data.get('duration_minutes', 0)
        
        # Get recording channel for podcast link
        recording_channel = os.environ.get("TELEGRAM_RECORDING_CHANNEL", "Podcast_F")
        
        message = f"""
⏹️ <b>СТРИМ ЗАВЕРШЕН</b>

🎙️ <b>{title}</b>

📊 Статистика:
• 👥 Участников: {participants}
• ⏱️ Длительность: {duration} мин

📻 Запись будет доступна в:
👉 <a href="https://t.me/{recording_channel}">@{recording_channel}</a>
"""
        
        return await self.send_message(bot_token, chat_id, message.strip())
    
    async def send_hand_raised_notification(
        self,
        bot_token: str,
        chat_id: str,
        user_name: str,
        session_title: str
    ) -> dict:
        """
        Send notification when someone raises hand in live session
        
        Args:
            bot_token: Telegram bot token
            chat_id: Admin chat ID
            user_name: Name of user who raised hand
            session_title: Session title
        
        Returns:
            Result of send operation
        """
        message = f"""
✋ <b>Запрос на выступление</b>

👤 <b>{user_name}</b> хочет выступить
🎙️ В стриме: {session_title}

Повысьте участника до спикера в приложении.
"""
        
        return await self.send_message(bot_token, chat_id, message.strip())
    
    async def send_comment_notification(
        self,
        bot_token: str,
        chat_id: str,
        comment_data: dict
    ) -> dict:
        """
        Send comment notification
        
        Args:
            bot_token: Telegram bot token
            chat_id: Chat/Channel ID
            comment_data: Comment information
        
        Returns:
            Result of send operation
        """
        username = comment_data.get('username', 'Someone')
        podcast_title = comment_data.get('podcast_title', 'your podcast')
        comment_text = comment_data.get('text', '')
        
        message = f"""
💬 <b>Новый комментарий</b>

👤 <b>{username}</b> прокомментировал "{podcast_title}"

"{comment_text[:150]}{'...' if len(comment_text) > 150 else ''}"
"""
        
        return await self.send_message(bot_token, chat_id, message.strip())
    
    async def send_follower_notification(
        self,
        bot_token: str,
        chat_id: str,
        follower_data: dict
    ) -> dict:
        """
        Send new follower notification
        
        Args:
            bot_token: Telegram bot token
            chat_id: Chat/Channel ID
            follower_data: Follower information
        
        Returns:
            Result of send operation
        """
        follower_name = follower_data.get('follower_name', 'Someone')
        follower_username = follower_data.get('follower_username', '')
        
        message = f"""
👥 <b>Новый подписчик!</b>

<b>{follower_name}</b> (@{follower_username}) начал за вами следить! 🎉
"""
        
        return await self.send_message(bot_token, chat_id, message.strip())
    
    async def get_bot_info(self, bot_token: str) -> dict:
        """
        Get bot information (for testing)
        
        Args:
            bot_token: Telegram bot token
        
        Returns:
            Bot info or error
        """
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        
        try:
            response = await self.client.get(url)
            result = response.json()
            
            if response.status_code == 200 and result.get('ok'):
                return {'success': True, 'bot': result['result']}
            else:
                return {'success': False, 'error': result.get('description')}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def get_chat_info(self, bot_token: str, chat_id: str) -> dict:
        """
        Get information about a chat
        
        Args:
            bot_token: Telegram bot token
            chat_id: Chat ID to get info about
        
        Returns:
            Chat information
        """
        url = f"https://api.telegram.org/bot{bot_token}/getChat"
        
        try:
            response = await self.client.post(url, json={'chat_id': chat_id})
            result = response.json()
            
            if response.status_code == 200 and result.get('ok'):
                chat = result['result']
                return {
                    'success': True,
                    'chat': {
                        'id': chat.get('id'),
                        'type': chat.get('type'),
                        'username': chat.get('username'),
                        'first_name': chat.get('first_name'),
                        'last_name': chat.get('last_name'),
                        'title': chat.get('title')
                    }
                }
            else:
                return {'success': False, 'error': result.get('description')}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}


# Global instance
telegram_service = TelegramService()
