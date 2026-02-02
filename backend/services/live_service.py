"""
Live Session Service
Core business logic for live sessions
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import logging

from core.events import EventBus, Events

logger = logging.getLogger(__name__)


class LiveSessionService:
    """Service for managing live sessions"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def create_session(
        self,
        title: str,
        host_id: str,
        description: str = "",
        scheduled_start: str = None
    ) -> Dict[str, Any]:
        """Create a new live session"""
        session_id = str(uuid.uuid4())
        
        # Generate RTMP details for Telegram
        stream_key = f"fomo_{session_id[:8]}_{uuid.uuid4().hex[:8]}"
        rtmp_url = f"rtmps://dc4-1.rtmp.t.me/s/{stream_key}"
        
        session = {
            "id": session_id,
            "title": title,
            "description": description,
            "host_id": host_id,
            "status": "scheduled",
            "rtmp_url": rtmp_url,
            "stream_key": stream_key,
            "participants": [],
            "speakers": [host_id],
            "listeners": [],
            "hand_raise_queue": [],
            "chat_messages": [],
            "scheduled_start": scheduled_start,
            "started_at": None,
            "ended_at": None,
            "recording_url": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await self.db.live_sessions.insert_one(session)
        
        logger.info(f"Created live session: {session_id}")
        
        # Remove MongoDB _id before returning
        session.pop("_id", None)
        
        return {
            "session_id": session_id,
            "rtmp_url": rtmp_url,
            "stream_key": stream_key,
            "status": "scheduled",
            "telegram_instructions": {
                "step_1": "Open OBS or streaming software",
                "step_2": f"Set RTMP URL: {rtmp_url}",
                "step_3": "Start streaming to begin live session",
                "step_4": "Session will automatically go live"
            }
        }
    
    async def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        session = await self.db.live_sessions.find_one(
            {"id": session_id},
            {"_id": 0}
        )
        return session
    
    async def get_sessions(
        self,
        status: str = None,
        host_id: str = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get list of sessions with optional filters"""
        query = {}
        if status:
            query["status"] = status
        if host_id:
            query["host_id"] = host_id
        
        cursor = self.db.live_sessions.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def start_session(self, session_id: str) -> Dict[str, Any]:
        """Start a live session"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        if session["status"] == "active":
            return {"status": "already_active", "session": session}
        
        await self.db.live_sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "status": "active",
                    "started_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Emit event
        await EventBus.emit(Events.SESSION_STARTED, {
            "session_id": session_id,
            "host_id": session["host_id"],
            "title": session["title"]
        })
        
        logger.info(f"Started live session: {session_id}")
        
        return {"status": "started", "session_id": session_id}
    
    async def end_session(self, session_id: str) -> Dict[str, Any]:
        """End a live session"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        await self.db.live_sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "status": "ended",
                    "ended_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Emit event
        await EventBus.emit(Events.SESSION_ENDED, {
            "session_id": session_id,
            "host_id": session["host_id"],
            "duration_minutes": self._calculate_duration(session)
        })
        
        logger.info(f"Ended live session: {session_id}")
        
        return {"status": "ended", "session_id": session_id}
    
    async def join_session(
        self,
        session_id: str,
        user_id: str,
        role: str = "listener"
    ) -> Dict[str, Any]:
        """User joins a session"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        # Add to participants if not already
        await self.db.live_sessions.update_one(
            {"id": session_id},
            {
                "$addToSet": {
                    "participants": user_id,
                    "listeners" if role == "listener" else "speakers": user_id
                }
            }
        )
        
        # Update user stats
        await self.db.users.update_one(
            {"id": user_id},
            {"$inc": {"sessions_attended": 1}}
        )
        
        # Emit event
        await EventBus.emit(Events.USER_JOINED_SESSION, {
            "session_id": session_id,
            "user_id": user_id,
            "role": role
        })
        
        return {"status": "joined", "role": role}
    
    async def leave_session(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """User leaves a session"""
        await self.db.live_sessions.update_one(
            {"id": session_id},
            {
                "$pull": {
                    "participants": user_id,
                    "listeners": user_id,
                    "speakers": user_id
                }
            }
        )
        
        # Emit event
        await EventBus.emit(Events.USER_LEFT_SESSION, {
            "session_id": session_id,
            "user_id": user_id
        })
        
        return {"status": "left"}
    
    async def raise_hand(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """User raises hand to speak"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        # Check if already in queue
        queue = session.get("hand_raise_queue", [])
        if user_id in queue:
            return {"status": "already_in_queue"}
        
        # Get user's priority score
        user = await self.db.users.find_one({"id": user_id}, {"priority_score": 1})
        priority = user.get("priority_score", 50) if user else 50
        
        hand_raise = {
            "user_id": user_id,
            "raised_at": datetime.now(timezone.utc).isoformat(),
            "priority_score": priority
        }
        
        await self.db.live_sessions.update_one(
            {"id": session_id},
            {"$push": {"hand_raise_queue": hand_raise}}
        )
        
        # Emit event
        await EventBus.emit(Events.HAND_RAISED, {
            "session_id": session_id,
            "user_id": user_id
        })
        
        return {"status": "hand_raised", "position": len(queue) + 1}
    
    async def promote_to_speaker(
        self,
        session_id: str,
        user_id: str,
        promoted_by: str
    ) -> Dict[str, Any]:
        """Promote listener to speaker"""
        await self.db.live_sessions.update_one(
            {"id": session_id},
            {
                "$addToSet": {"speakers": user_id},
                "$pull": {
                    "listeners": user_id,
                    "hand_raise_queue": {"user_id": user_id}
                }
            }
        )
        
        # Emit event
        await EventBus.emit(Events.SPEAKER_PROMOTED, {
            "session_id": session_id,
            "user_id": user_id,
            "promoted_by": promoted_by
        })
        
        return {"status": "promoted"}
    
    async def get_hand_raise_queue(self, session_id: str) -> List[Dict]:
        """Get sorted hand raise queue"""
        session = await self.get_session(session_id)
        if not session:
            return []
        
        queue = session.get("hand_raise_queue", [])
        # Sort by priority (higher first), then by time (earlier first)
        queue.sort(key=lambda x: (-x.get("priority_score", 0), x.get("raised_at", "")))
        
        return queue
    
    def _calculate_duration(self, session: Dict) -> int:
        """Calculate session duration in minutes"""
        started = session.get("started_at")
        ended = session.get("ended_at") or datetime.now(timezone.utc)
        
        if not started:
            return 0
        
        if isinstance(started, str):
            started = datetime.fromisoformat(started.replace("Z", "+00:00"))
        if isinstance(ended, str):
            ended = datetime.fromisoformat(ended.replace("Z", "+00:00"))
        
        duration = (ended - started).total_seconds() / 60
        return int(duration)


def get_live_service(db: AsyncIOMotorDatabase) -> LiveSessionService:
    return LiveSessionService(db)
