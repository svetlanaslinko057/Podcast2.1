"""
Telegram Recording Bot
Monitors @Podcast_F channel for audio/video recordings
Auto-saves them as podcasts in the platform
"""
import os
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import httpx

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E')
# @Podcast_F - канал для записей стримов
CHANNEL_ID = os.getenv('TELEGRAM_RECORDING_CHANNEL_ID', '-1003133850361')
CHANNEL_USERNAME = os.getenv('TELEGRAM_RECORDING_CHANNEL', 'Podcast_F')
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'fomo_voice_club')
RECORDINGS_DIR = Path('/app/recordings')
POLL_INTERVAL = 30  # seconds

# Ensure recordings directory exists
RECORDINGS_DIR.mkdir(exist_ok=True)


class RecordingBot:
    """Bot that monitors Telegram channel for recordings"""
    
    def __init__(self):
        self.bot_token = TELEGRAM_BOT_TOKEN
        self.channel_id = CHANNEL_ID
        self.last_update_id = 0
        self.processed_messages = set()
        self.db = None
        self.http_client = None
    
    async def init(self):
        """Initialize bot connections"""
        from motor.motor_asyncio import AsyncIOMotorClient
        
        client = AsyncIOMotorClient(MONGO_URL)
        self.db = client[DB_NAME]
        self.http_client = httpx.AsyncClient(timeout=60.0)
        
        # Load processed messages from DB
        processed = await self.db.processed_recordings.find({}, {"message_id": 1}).to_list(1000)
        self.processed_messages = {p["message_id"] for p in processed}
        
        logger.info(f"Bot initialized. Monitoring channel: @{CHANNEL_USERNAME}")
        logger.info(f"Already processed {len(self.processed_messages)} recordings")
    
    async def close(self):
        """Close connections"""
        if self.http_client:
            await self.http_client.aclose()
    
    async def get_channel_messages(self, limit: int = 10) -> list:
        """
        Get recent messages from channel using getUpdates
        Note: Bot must be admin in the channel to receive updates
        """
        try:
            # Method 1: Try getUpdates (works if bot receives channel posts)
            url = f"https://api.telegram.org/bot{self.bot_token}/getUpdates"
            params = {
                "offset": self.last_update_id + 1,
                "limit": limit,
                "allowed_updates": ["channel_post"]
            }
            
            response = await self.http_client.get(url, params=params)
            data = response.json()
            
            if data.get("ok") and data.get("result"):
                updates = data["result"]
                if updates:
                    self.last_update_id = updates[-1]["update_id"]
                return [u.get("channel_post") for u in updates if u.get("channel_post")]
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting channel messages: {e}")
            return []
    
    async def download_file(self, file_id: str, filename: str) -> Optional[Path]:
        """Download file from Telegram"""
        try:
            # Get file path
            url = f"https://api.telegram.org/bot{self.bot_token}/getFile"
            response = await self.http_client.get(url, params={"file_id": file_id})
            data = response.json()
            
            if not data.get("ok"):
                logger.error(f"Failed to get file info: {data}")
                return None
            
            file_path = data["result"]["file_path"]
            
            # Download file
            download_url = f"https://api.telegram.org/file/bot{self.bot_token}/{file_path}"
            response = await self.http_client.get(download_url)
            
            if response.status_code != 200:
                logger.error(f"Failed to download file: {response.status_code}")
                return None
            
            # Save to disk
            local_path = RECORDINGS_DIR / filename
            with open(local_path, "wb") as f:
                f.write(response.content)
            
            logger.info(f"Downloaded file to {local_path}")
            return local_path
            
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            return None
    
    async def process_recording(self, message: dict):
        """Process a recording message from channel"""
        message_id = message.get("message_id")
        
        if message_id in self.processed_messages:
            return
        
        logger.info(f"Processing message {message_id}")
        
        # Check for audio/video/voice
        media = None
        media_type = None
        
        if message.get("audio"):
            media = message["audio"]
            media_type = "audio"
        elif message.get("voice"):
            media = message["voice"]
            media_type = "voice"
        elif message.get("video"):
            media = message["video"]
            media_type = "video"
        elif message.get("video_note"):
            media = message["video_note"]
            media_type = "video_note"
        elif message.get("document"):
            doc = message["document"]
            mime = doc.get("mime_type", "")
            if mime.startswith("audio/") or mime.startswith("video/"):
                media = doc
                media_type = "document"
        
        if not media:
            logger.debug(f"Message {message_id} has no media, skipping")
            return
        
        # Get file info
        file_id = media.get("file_id")
        file_size = media.get("file_size", 0)
        duration = media.get("duration", 0)
        
        # Generate filename
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        ext = "mp3" if media_type in ["audio", "voice"] else "mp4"
        filename = f"recording_{timestamp}_{message_id}.{ext}"
        
        # Download file
        local_path = await self.download_file(file_id, filename)
        
        if not local_path:
            logger.error(f"Failed to download recording from message {message_id}")
            return
        
        # Get caption/title
        caption = message.get("caption", "")
        title = caption[:100] if caption else f"Recording {timestamp}"
        
        # Try to find matching live session
        session = await self.find_matching_session(message)
        
        # Create podcast entry
        podcast_id = await self.create_podcast_from_recording(
            title=title,
            description=caption,
            file_path=str(local_path),
            duration=duration,
            session=session,
            message_id=message_id
        )
        
        # Mark as processed
        await self.db.processed_recordings.insert_one({
            "message_id": message_id,
            "file_path": str(local_path),
            "podcast_id": podcast_id,
            "session_id": session.get("id") if session else None,
            "processed_at": datetime.now(timezone.utc)
        })
        self.processed_messages.add(message_id)
        
        logger.info(f"✅ Recording processed: {title} -> Podcast {podcast_id}")
        
        # Update session if found
        if session:
            await self.db.live_sessions.update_one(
                {"id": session["id"]},
                {
                    "$set": {
                        "status": "recorded",
                        "recording_url": str(local_path),
                        "podcast_id": podcast_id,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            logger.info(f"Updated session {session['id']} with recording")
    
    async def find_matching_session(self, message: dict) -> Optional[dict]:
        """Find live session that matches this recording by time"""
        message_date = message.get("date", 0)
        
        if not message_date:
            return None
        
        # Look for sessions ended within 2 hours of message
        time_threshold = datetime.fromtimestamp(message_date - 7200, tz=timezone.utc)
        
        session = await self.db.live_sessions.find_one(
            {
                "status": {"$in": ["ended", "live"]},
                "$or": [
                    {"ended_at": {"$gte": time_threshold}},
                    {"started_at": {"$gte": time_threshold}}
                ]
            },
            sort=[("ended_at", -1)]
        )
        
        return session
    
    async def create_podcast_from_recording(
        self,
        title: str,
        description: str,
        file_path: str,
        duration: int,
        session: Optional[dict],
        message_id: int
    ) -> str:
        """Create a new podcast from recording"""
        import uuid
        
        podcast_id = str(uuid.uuid4())
        
        # Get default author (first admin or system)
        author = await self.db.users.find_one({"role": {"$in": ["admin", "owner"]}})
        if not author:
            author = {"id": "system", "name": "FOMO Podcasts", "username": "system"}
        
        podcast = {
            "id": podcast_id,
            "title": title,
            "description": description or f"Live recording from {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
            "author_id": author.get("id"),
            "author": {
                "id": author.get("id"),
                "name": author.get("name"),
                "username": author.get("username"),
                "avatar": author.get("avatar")
            },
            "audio_url": file_path,
            "duration": duration,
            "is_live_recording": True,
            "session_id": session.get("id") if session else None,
            "telegram_message_id": message_id,
            "tags": ["live", "recording"],
            "visibility": "public",
            "plays_count": 0,
            "likes_count": 0,
            "comments_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await self.db.podcasts.insert_one(podcast)
        
        return podcast_id
    
    async def run(self):
        """Main loop - poll channel for new messages"""
        logger.info("Starting recording bot polling loop...")
        
        while True:
            try:
                messages = await self.get_channel_messages()
                
                for msg in messages:
                    if msg:
                        await self.process_recording(msg)
                
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
            
            await asyncio.sleep(POLL_INTERVAL)


async def main():
    """Entry point"""
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set")
        return
    
    bot = RecordingBot()
    await bot.init()
    
    try:
        await bot.run()
    except KeyboardInterrupt:
        logger.info("Bot stopped")
    finally:
        await bot.close()


if __name__ == "__main__":
    asyncio.run(main())
