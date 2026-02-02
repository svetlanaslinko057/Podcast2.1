"""
Co-Streaming Service
Enables simultaneous streaming to platform and Telegram
"""
import asyncio
import logging
from typing import Optional, Dict, List
from datetime import datetime, timezone
import uuid

from services.telegram_service import telegram_service

logger = logging.getLogger(__name__)


class CoStreamingSession:
    """Represents an active co-streaming session"""
    
    def __init__(
        self,
        session_id: str,
        podcast_id: str,
        author_id: str,
        bot_token: str,
        chat_id: str,
        title: str
    ):
        self.session_id = session_id
        self.podcast_id = podcast_id
        self.author_id = author_id
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.title = title
        
        self.is_active = False
        self.started_at: Optional[datetime] = None
        self.ended_at: Optional[datetime] = None
        
        # Stats
        self.messages_sent = 0
        self.chat_messages_forwarded = 0
        self.notifications_sent = 0
        
        # Stream state
        self.current_speakers: List[str] = []
        self.listener_count = 0
        self.telegram_listener_count = 0


class CoStreamingService:
    """
    Service for managing co-streaming sessions with Telegram
    
    Features:
    - Start/stop co-streaming to Telegram channel
    - Forward chat messages to Telegram
    - Send live updates (speakers changed, listener count)
    - Send periodic status updates
    """
    
    def __init__(self, db):
        self.db = db
        self.active_sessions: Dict[str, CoStreamingSession] = {}
        self._update_tasks: Dict[str, asyncio.Task] = {}
    
    async def start_costream(
        self,
        podcast_id: str,
        author_id: str,
        bot_id: str,
        title: str,
        description: Optional[str] = None,
        platform_url: Optional[str] = None
    ) -> Dict:
        """
        Start co-streaming session to Telegram
        
        Args:
            podcast_id: ID of the live podcast
            author_id: Author's user ID
            bot_id: Telegram bot configuration ID
            title: Stream title
            description: Stream description
            platform_url: URL to join on platform
        
        Returns:
            Session information
        """
        # Get bot configuration
        bot_config = await self.db.telegram_bots.find_one({"id": bot_id}, {"_id": 0})
        if not bot_config:
            return {"success": False, "error": "Bot configuration not found"}
        
        if not bot_config.get("is_active"):
            return {"success": False, "error": "Bot is not active"}
        
        # Check if already streaming this podcast
        if podcast_id in self.active_sessions:
            return {"success": False, "error": "Co-streaming already active for this podcast"}
        
        # Create session
        session_id = str(uuid.uuid4())
        session = CoStreamingSession(
            session_id=session_id,
            podcast_id=podcast_id,
            author_id=author_id,
            bot_token=bot_config["bot_token"],
            chat_id=bot_config["chat_id"],
            title=title
        )
        
        # Send start notification to Telegram
        start_message = f"""
🔴 <b>LIVE СТРИМ НАЧАЛСЯ!</b>

<b>{title}</b>

{description or "Присоединяйтесь к прямому эфиру!"}

📺 <a href="{platform_url or '#'}">Смотреть на платформе</a>

💬 Сообщения из чата будут дублироваться здесь
"""
        
        result = await telegram_service.send_message(
            bot_config["bot_token"],
            bot_config["chat_id"],
            start_message.strip()
        )
        
        if not result.get("success"):
            return {
                "success": False,
                "error": f"Failed to send start notification: {result.get('error')}"
            }
        
        # Activate session
        session.is_active = True
        session.started_at = datetime.now(timezone.utc)
        session.notifications_sent = 1
        
        self.active_sessions[podcast_id] = session
        
        # Save to database
        session_doc = {
            "id": session_id,
            "podcast_id": podcast_id,
            "author_id": author_id,
            "bot_id": bot_id,
            "bot_token": bot_config["bot_token"],
            "chat_id": bot_config["chat_id"],
            "title": title,
            "description": description,
            "platform_url": platform_url,
            "status": "active",
            "started_at": session.started_at.isoformat(),
            "messages_sent": 0,
            "chat_messages_forwarded": 0
        }
        await self.db.costream_sessions.insert_one(session_doc)
        
        # Update bot last used timestamp
        await self.db.telegram_bots.update_one(
            {"id": bot_id},
            {
                "$set": {"last_used_at": datetime.now(timezone.utc).isoformat()},
                "$inc": {"total_messages_sent": 1}
            }
        )
        
        # Start periodic updates task
        self._start_update_task(podcast_id)
        
        logger.info(f"✅ Co-streaming started for podcast {podcast_id} to Telegram {bot_config['chat_id']}")
        
        return {
            "success": True,
            "session_id": session_id,
            "message": "Co-streaming started successfully"
        }
    
    async def stop_costream(self, podcast_id: str) -> Dict:
        """
        Stop co-streaming session
        
        Args:
            podcast_id: ID of the live podcast
        
        Returns:
            Result of stopping
        """
        session = self.active_sessions.get(podcast_id)
        if not session:
            return {"success": False, "error": "No active co-streaming session"}
        
        # Stop update task
        if podcast_id in self._update_tasks:
            self._update_tasks[podcast_id].cancel()
            del self._update_tasks[podcast_id]
        
        # Calculate duration
        session.ended_at = datetime.now(timezone.utc)
        duration_seconds = (session.ended_at - session.started_at).total_seconds()
        duration_minutes = int(duration_seconds / 60)
        
        # Send end notification
        end_message = f"""
⏹️ <b>СТРИМ ЗАВЕРШЁН</b>

<b>{session.title}</b>

📊 Статистика:
• Продолжительность: {duration_minutes} мин
• Сообщений переслано: {session.chat_messages_forwarded}
• Уведомлений отправлено: {session.notifications_sent}

Спасибо за просмотр! 👋
"""
        
        await telegram_service.send_message(
            session.bot_token,
            session.chat_id,
            end_message.strip()
        )
        
        # Update database
        await self.db.costream_sessions.update_one(
            {"id": session.session_id},
            {
                "$set": {
                    "status": "ended",
                    "ended_at": session.ended_at.isoformat(),
                    "duration_seconds": int(duration_seconds),
                    "messages_sent": session.messages_sent,
                    "chat_messages_forwarded": session.chat_messages_forwarded,
                    "notifications_sent": session.notifications_sent
                }
            }
        )
        
        # Remove from active sessions
        del self.active_sessions[podcast_id]
        
        logger.info(f"✅ Co-streaming stopped for podcast {podcast_id}")
        
        return {
            "success": True,
            "duration_minutes": duration_minutes,
            "messages_forwarded": session.chat_messages_forwarded
        }
    
    async def forward_chat_message(
        self,
        podcast_id: str,
        username: str,
        message: str
    ) -> Dict:
        """
        Forward chat message to Telegram
        
        Args:
            podcast_id: ID of the podcast
            username: Username of message sender
            message: Message text
        
        Returns:
            Result of forwarding
        """
        session = self.active_sessions.get(podcast_id)
        if not session or not session.is_active:
            return {"success": False, "error": "No active co-streaming session"}
        
        # Format message for Telegram
        telegram_message = f"💬 <b>{username}</b>: {message}"
        
        result = await telegram_service.send_message(
            session.bot_token,
            session.chat_id,
            telegram_message,
            disable_notification=True  # Silent to avoid spam
        )
        
        if result.get("success"):
            session.chat_messages_forwarded += 1
            session.messages_sent += 1
            return {"success": True}
        
        return {"success": False, "error": result.get("error")}
    
    async def update_stream_status(
        self,
        podcast_id: str,
        speakers: Optional[List[str]] = None,
        listener_count: Optional[int] = None,
        hand_raised_count: Optional[int] = None
    ) -> Dict:
        """
        Update stream status in Telegram (called periodically or on significant changes)
        
        Args:
            podcast_id: ID of the podcast
            speakers: List of current speaker names
            listener_count: Current listener count
            hand_raised_count: Number of raised hands
        
        Returns:
            Result of update
        """
        session = self.active_sessions.get(podcast_id)
        if not session or not session.is_active:
            return {"success": False, "error": "No active co-streaming session"}
        
        # Only send update if significant change
        speakers_changed = speakers and set(speakers) != set(session.current_speakers)
        listener_change = listener_count and abs(listener_count - session.listener_count) >= 5
        
        if not speakers_changed and not listener_change:
            return {"success": True, "message": "No significant change"}
        
        # Update session state
        if speakers:
            session.current_speakers = speakers
        if listener_count:
            session.listener_count = listener_count
        
        # Format status update
        status_parts = []
        
        if speakers:
            speakers_str = ", ".join(speakers[:5])
            if len(speakers) > 5:
                speakers_str += f" и ещё {len(speakers) - 5}"
            status_parts.append(f"🎤 Спикеры: {speakers_str}")
        
        if listener_count:
            status_parts.append(f"👥 Слушатели: {listener_count}")
        
        if hand_raised_count:
            status_parts.append(f"✋ Руки подняты: {hand_raised_count}")
        
        if status_parts:
            status_message = "📊 <b>Обновление стрима</b>\n\n" + "\n".join(status_parts)
            
            result = await telegram_service.send_message(
                session.bot_token,
                session.chat_id,
                status_message,
                disable_notification=True
            )
            
            if result.get("success"):
                session.notifications_sent += 1
                session.messages_sent += 1
        
        return {"success": True}
    
    async def send_speaker_joined(self, podcast_id: str, speaker_name: str) -> Dict:
        """Notify when new speaker joins"""
        session = self.active_sessions.get(podcast_id)
        if not session or not session.is_active:
            return {"success": False}
        
        message = f"🎤 <b>{speaker_name}</b> присоединился к эфиру"
        
        result = await telegram_service.send_message(
            session.bot_token,
            session.chat_id,
            message,
            disable_notification=True
        )
        
        if result.get("success"):
            session.notifications_sent += 1
            session.messages_sent += 1
        
        return result
    
    async def send_speaker_left(self, podcast_id: str, speaker_name: str) -> Dict:
        """Notify when speaker leaves"""
        session = self.active_sessions.get(podcast_id)
        if not session or not session.is_active:
            return {"success": False}
        
        message = f"👋 <b>{speaker_name}</b> покинул эфир"
        
        result = await telegram_service.send_message(
            session.bot_token,
            session.chat_id,
            message,
            disable_notification=True
        )
        
        if result.get("success"):
            session.notifications_sent += 1
            session.messages_sent += 1
        
        return result
    
    def _start_update_task(self, podcast_id: str):
        """Start periodic status update task"""
        async def periodic_update():
            while podcast_id in self.active_sessions:
                await asyncio.sleep(300)  # Every 5 minutes
                
                session = self.active_sessions.get(podcast_id)
                if not session or not session.is_active:
                    break
                
                # Calculate elapsed time
                elapsed = datetime.now(timezone.utc) - session.started_at
                elapsed_minutes = int(elapsed.total_seconds() / 60)
                
                # Send periodic update
                update_message = f"""
📻 <b>Стрим идёт {elapsed_minutes} мин</b>

👥 Слушатели: {session.listener_count}
💬 Сообщений: {session.chat_messages_forwarded}
"""
                
                await telegram_service.send_message(
                    session.bot_token,
                    session.chat_id,
                    update_message.strip(),
                    disable_notification=True
                )
                session.notifications_sent += 1
                session.messages_sent += 1
        
        task = asyncio.create_task(periodic_update())
        self._update_tasks[podcast_id] = task
    
    def get_active_session(self, podcast_id: str) -> Optional[Dict]:
        """Get active session info"""
        session = self.active_sessions.get(podcast_id)
        if not session:
            return None
        
        elapsed = datetime.now(timezone.utc) - session.started_at
        
        return {
            "session_id": session.session_id,
            "podcast_id": session.podcast_id,
            "title": session.title,
            "chat_id": session.chat_id,
            "is_active": session.is_active,
            "started_at": session.started_at.isoformat(),
            "elapsed_minutes": int(elapsed.total_seconds() / 60),
            "messages_sent": session.messages_sent,
            "chat_messages_forwarded": session.chat_messages_forwarded,
            "notifications_sent": session.notifications_sent,
            "listener_count": session.listener_count
        }
    
    def is_costreaming(self, podcast_id: str) -> bool:
        """Check if podcast is being co-streamed"""
        return podcast_id in self.active_sessions
    
    async def get_session_history(self, author_id: str, limit: int = 20) -> List[Dict]:
        """Get co-streaming session history for author"""
        sessions = await self.db.costream_sessions.find(
            {"author_id": author_id},
            {"_id": 0}
        ).sort("started_at", -1).limit(limit).to_list(limit)
        
        return sessions


# Will be initialized with db in routes
costream_service: Optional[CoStreamingService] = None


def init_costream_service(db):
    """Initialize co-streaming service with database"""
    global costream_service
    costream_service = CoStreamingService(db)
    return costream_service
