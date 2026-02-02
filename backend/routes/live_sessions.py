"""
Live Sessions Management
Handles live streaming sessions with Telegram RTMP integration
Real-time WebSocket support, LiveKit token generation, and XP rewards
"""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import secrets
import json
import os
import asyncio
import logging

# Import auth middleware
try:
    from middleware.auth import require_admin, get_current_user, AuthUser
except ImportError:
    # Fallback if middleware not available
    require_admin = None
    get_current_user = None
    AuthUser = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/live-sessions", tags=["live_sessions"])

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


# ===========================================
# XP Rewards for Live Session Participation
# ===========================================
XP_REWARDS = {
    "session_joined": 10,       # Join a live session
    "session_5min": 5,          # Every 5 minutes in session
    "chat_message": 2,          # Send a chat message (max 20/session)
    "reaction_sent": 1,         # Send a reaction (max 10/session)
    "hand_raised": 5,           # Raise hand
    "promoted_speaker": 50,     # Get promoted to speaker
    "speech_given": 100,        # Complete a speech as speaker
}


async def award_session_xp(user_id: str, action: str, metadata: dict = None):
    """Award XP for live session actions"""
    if db is None:
        return
    
    xp_amount = XP_REWARDS.get(action, 0)
    if xp_amount == 0:
        return
    
    try:
        # Check user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            # Try to find by wallet or create minimal record
            logger.warning(f"User {user_id} not found for XP award")
            return
        
        # Create XP transaction
        xp_transaction = {
            "user_id": user_id,
            "action": f"live_{action}",
            "xp_earned": xp_amount,
            "timestamp": datetime.now(timezone.utc),
            "metadata": metadata or {}
        }
        await db.xp_transactions.insert_one(xp_transaction)
        
        # Update user XP
        current_xp = user.get('xp_total', 0)
        new_xp = current_xp + xp_amount
        
        # Update XP breakdown
        xp_breakdown = user.get('xp_breakdown', {})
        xp_breakdown['live_attendance'] = xp_breakdown.get('live_attendance', 0) + xp_amount
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"xp_total": new_xp, "xp_breakdown": xp_breakdown}}
        )
        
        logger.info(f"Awarded {xp_amount} XP to {user_id} for {action}")
        
        # Check for badge awards
        try:
            from routes.badges import check_and_award_participation_badges
            await check_and_award_participation_badges(user_id)
        except Exception as e:
            logger.error(f"Badge check error: {e}")
            
    except Exception as e:
        logger.error(f"XP award error: {e}")


# ===========================================
# WebSocket Manager for Live Rooms
# ===========================================
class LiveRoomManager:
    """Manages WebSocket connections for live session rooms"""
    
    def __init__(self):
        # session_id -> {user_id: WebSocket}
        self.connections: Dict[str, Dict[str, WebSocket]] = {}
        # session_id -> room state
        self.rooms: Dict[str, dict] = {}
    
    def get_room(self, session_id: str) -> dict:
        """Get or create room state"""
        if session_id not in self.rooms:
            self.rooms[session_id] = {
                "participants": {},
                "speakers": [],
                "listeners": [],
                "hand_raised": [],
                "chat_messages": [],
                "reactions": []
            }
        return self.rooms[session_id]
    
    async def connect(self, websocket: WebSocket, session_id: str, user_id: str, username: str, role: str = "listener"):
        """Connect user to live room"""
        await websocket.accept()
        
        if session_id not in self.connections:
            self.connections[session_id] = {}
        
        self.connections[session_id][user_id] = websocket
        
        room = self.get_room(session_id)
        room["participants"][user_id] = {
            "user_id": user_id,
            "username": username,
            "role": role,
            "joined_at": datetime.now(timezone.utc).isoformat(),
            "is_muted": True
        }
        
        if role == "speaker":
            if user_id not in room["speakers"]:
                room["speakers"].append(user_id)
        else:
            if user_id not in room["listeners"]:
                room["listeners"].append(user_id)
        
        # Send current room state to new user FIRST
        await self.send_to_user(session_id, user_id, {
            "type": "room_state",
            "participants": list(room["participants"].values()),
            "speakers": room["speakers"],
            "listeners": room["listeners"],
            "hand_raised": room["hand_raised"],
            "chat_messages": room["chat_messages"][-50:],
            "stats": self.get_stats(session_id)
        })
        
        # Then broadcast join event to OTHERS (not self)
        await self.broadcast_except(session_id, user_id, {
            "type": "user_joined",
            "user_id": user_id,
            "username": username,
            "role": role,
            "stats": self.get_stats(session_id)
        })
    
    async def disconnect(self, session_id: str, user_id: str):
        """Disconnect user from live room"""
        if session_id in self.connections and user_id in self.connections[session_id]:
            del self.connections[session_id][user_id]
            
            if not self.connections[session_id]:
                del self.connections[session_id]
        
        if session_id in self.rooms:
            room = self.rooms[session_id]
            if user_id in room["participants"]:
                del room["participants"][user_id]
            if user_id in room["speakers"]:
                room["speakers"].remove(user_id)
            if user_id in room["listeners"]:
                room["listeners"].remove(user_id)
            if user_id in room["hand_raised"]:
                room["hand_raised"].remove(user_id)
            
            # Broadcast leave event
            await self.broadcast(session_id, {
                "type": "user_left",
                "user_id": user_id,
                "stats": self.get_stats(session_id)
            })
    
    async def broadcast(self, session_id: str, message: dict):
        """Broadcast message to all users in room"""
        if session_id not in self.connections:
            return
        
        disconnected = []
        for user_id, ws in self.connections[session_id].items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)
        
        for user_id in disconnected:
            await self.disconnect(session_id, user_id)
    
    async def broadcast_except(self, session_id: str, except_user_id: str, message: dict):
        """Broadcast message to all users except one"""
        if session_id not in self.connections:
            return
        
        disconnected = []
        for user_id, ws in self.connections[session_id].items():
            if user_id == except_user_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)
        
        for user_id in disconnected:
            await self.disconnect(session_id, user_id)
    
    async def send_to_user(self, session_id: str, user_id: str, message: dict):
        """Send message to specific user"""
        if session_id in self.connections and user_id in self.connections[session_id]:
            try:
                await self.connections[session_id][user_id].send_json(message)
            except Exception:
                pass
    
    def get_stats(self, session_id: str) -> dict:
        """Get room statistics"""
        room = self.get_room(session_id)
        return {
            "total_participants": len(room["participants"]),
            "speakers_count": len(room["speakers"]),
            "listeners_count": len(room["listeners"]),
            "hand_raised_count": len(room["hand_raised"])
        }
    
    async def handle_chat(self, session_id: str, user_id: str, username: str, message: str):
        """Handle chat message"""
        room = self.get_room(session_id)
        
        chat_msg = {
            "id": f"{user_id}_{datetime.now(timezone.utc).timestamp()}",
            "user_id": user_id,
            "username": username,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        room["chat_messages"].append(chat_msg)
        if len(room["chat_messages"]) > 100:
            room["chat_messages"] = room["chat_messages"][-100:]
        
        await self.broadcast(session_id, {
            "type": "chat_message",
            "message": chat_msg
        })
    
    async def handle_reaction(self, session_id: str, user_id: str, username: str, emoji: str):
        """Handle emoji reaction"""
        await self.broadcast(session_id, {
            "type": "reaction",
            "user_id": user_id,
            "username": username,
            "emoji": emoji,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def handle_hand_raise(self, session_id: str, user_id: str, action: str):
        """Handle hand raise/lower"""
        room = self.get_room(session_id)
        
        if action == "raise" and user_id not in room["hand_raised"]:
            room["hand_raised"].append(user_id)
        elif action == "lower" and user_id in room["hand_raised"]:
            room["hand_raised"].remove(user_id)
        
        await self.broadcast(session_id, {
            "type": "hand_raised_update",
            "user_id": user_id,
            "action": action,
            "hand_raised": room["hand_raised"],
            "stats": self.get_stats(session_id)
        })
    
    async def promote_to_speaker(self, session_id: str, user_id: str):
        """Promote listener to speaker"""
        room = self.get_room(session_id)
        
        if user_id in room["listeners"]:
            room["listeners"].remove(user_id)
        if user_id not in room["speakers"]:
            room["speakers"].append(user_id)
        if user_id in room["hand_raised"]:
            room["hand_raised"].remove(user_id)
        
        if user_id in room["participants"]:
            room["participants"][user_id]["role"] = "speaker"
        
        await self.broadcast(session_id, {
            "type": "user_promoted",
            "user_id": user_id,
            "stats": self.get_stats(session_id)
        })
    
    async def demote_to_listener(self, session_id: str, user_id: str):
        """Demote speaker to listener"""
        room = self.get_room(session_id)
        
        if user_id in room["speakers"]:
            room["speakers"].remove(user_id)
        if user_id not in room["listeners"]:
            room["listeners"].append(user_id)
        
        if user_id in room["participants"]:
            room["participants"][user_id]["role"] = "listener"
        
        await self.broadcast(session_id, {
            "type": "user_demoted",
            "user_id": user_id,
            "stats": self.get_stats(session_id)
        })


# Global room manager
room_manager = LiveRoomManager()


class LiveSessionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    telegram_channel_id: Optional[str] = None
    scheduled_at: Optional[str] = None  # ISO format datetime string


class LiveSessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    telegram_channel_id: Optional[str] = None
    scheduled_at: Optional[str] = None


# ===========================================
# Reminder System
# ===========================================
reminder_task = None
sent_reminders = set()  # Track sent reminders to avoid duplicates


async def check_upcoming_sessions():
    """Background task to send reminders for upcoming sessions"""
    global sent_reminders
    
    while True:
        try:
            now = datetime.now(timezone.utc)
            
            # Find sessions scheduled in next 15 minutes that haven't been reminded
            upcoming = await db.live_sessions.find({
                "status": "scheduled",
                "scheduled_at": {
                    "$gte": now,
                    "$lte": now + timedelta(minutes=16)
                }
            }).to_list(50)
            
            for session in upcoming:
                session_id = session.get("id")
                scheduled_at = session.get("scheduled_at")
                
                if not scheduled_at or session_id in sent_reminders:
                    continue
                
                # Calculate minutes until start
                if isinstance(scheduled_at, str):
                    scheduled_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                
                minutes_until = (scheduled_at - now).total_seconds() / 60
                
                # Send 15-minute reminder
                if 14 <= minutes_until <= 16:
                    logger.info(f"Sending 15-min reminder for session {session_id}")
                    await send_session_reminder(session, minutes=15)
                    sent_reminders.add(session_id)
                
                # Send 5-minute reminder
                elif 4 <= minutes_until <= 6:
                    reminder_key = f"{session_id}_5min"
                    if reminder_key not in sent_reminders:
                        logger.info(f"Sending 5-min reminder for session {session_id}")
                        await send_session_reminder(session, minutes=5)
                        sent_reminders.add(reminder_key)
            
            # Clean old reminders (older than 1 hour)
            if len(sent_reminders) > 1000:
                sent_reminders.clear()
                
        except Exception as e:
            logger.error(f"Reminder check error: {e}")
        
        await asyncio.sleep(60)  # Check every minute


async def send_session_reminder(session: dict, minutes: int):
    """Send Telegram reminder for upcoming session"""
    try:
        from services.telegram_service import telegram_service
        
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E")
        
        # Find all users with Telegram connected
        users = await db.users.find(
            {"telegram_connected": True, "telegram_chat_id": {"$exists": True, "$ne": None}},
            {"telegram_chat_id": 1}
        ).to_list(1000)
        
        authors = await db.authors.find(
            {"telegram_connected": True, "telegram_chat_id": {"$exists": True, "$ne": None}},
            {"telegram_chat_id": 1}
        ).to_list(1000)
        
        all_chat_ids = set()
        for u in users:
            if u.get("telegram_chat_id"):
                all_chat_ids.add(u["telegram_chat_id"])
        for a in authors:
            if a.get("telegram_chat_id"):
                all_chat_ids.add(a["telegram_chat_id"])
        
        if not all_chat_ids:
            return
        
        # Format scheduled time
        scheduled_at = session.get("scheduled_at")
        if isinstance(scheduled_at, str):
            scheduled_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
        
        time_str = scheduled_at.strftime("%H:%M") if scheduled_at else "скоро"
        
        message = f"""
⏰ <b>Напоминание о стриме!</b>

🎙️ <b>{session.get('title', 'Live Session')}</b>

⏱️ Начало через <b>{minutes} минут</b> (в {time_str})

{session.get('description', '')[:100] if session.get('description') else ''}

👉 Не пропустите! Присоединяйтесь в приложении.
"""
        
        for chat_id in all_chat_ids:
            try:
                await telegram_service.send_message(
                    bot_token=bot_token,
                    chat_id=str(chat_id),
                    text=message.strip()
                )
            except Exception as e:
                logger.error(f"Failed to send reminder to {chat_id}: {e}")
                
    except Exception as e:
        logger.error(f"Send reminder error: {e}")


def start_reminder_task():
    """Start the background reminder task"""
    global reminder_task
    if reminder_task is None or reminder_task.done():
        reminder_task = asyncio.create_task(check_upcoming_sessions())
        logger.info("Reminder task started")


# Start reminder task when module loads (will be called from server.py)
from datetime import timedelta


@router.post("/sessions")
async def create_live_session(
    session_data: LiveSessionCreate,
    request: Request
):
    """
    Create a new live session (Admin only)
    Generates RTMP stream key for Telegram
    
    Requires X-Wallet-Address header with admin wallet
    """
    # Check admin permission via header
    wallet = request.headers.get("X-Wallet-Address", "").lower()
    if wallet and wallet.startswith("0x"):
        settings = await db.club_settings.find_one({})
        if settings:
            owner = settings.get("owner_wallet", "").lower()
            admins = [w.lower() for w in settings.get("admin_wallets", [])]
            if wallet != owner and wallet not in admins:
                raise HTTPException(status_code=403, detail="Admin access required to create sessions")
    
    # Generate unique stream key
    stream_key = secrets.token_urlsafe(32)
    session_id = str(uuid.uuid4())
    
    # Parse scheduled_at
    scheduled_at = None
    if session_data.scheduled_at:
        try:
            scheduled_at = datetime.fromisoformat(session_data.scheduled_at.replace('Z', '+00:00'))
        except Exception:
            scheduled_at = datetime.now(timezone.utc)
    else:
        scheduled_at = datetime.now(timezone.utc)
    
    session = {
        "id": session_id,
        "title": session_data.title,
        "description": session_data.description,
        "status": "scheduled",  # scheduled, live, ended, recorded
        "stream_key": stream_key,
        "telegram_channel_id": session_data.telegram_channel_id,
        "rtmp_url": f"rtmps://dc4-1.rtmp.t.me/s/{stream_key}",  # Telegram RTMP URL
        "scheduled_at": scheduled_at,
        "started_at": None,
        "ended_at": None,
        "recording_url": None,
        "participants": [],
        "speakers": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.live_sessions.insert_one(session)
    
    return {
        "session_id": session_id,
        "rtmp_url": session["rtmp_url"],
        "stream_key": stream_key,
        "status": "scheduled",
        "telegram_instructions": {
            "step_1": "Open OBS or FFmpeg",
            "step_2": f"Set RTMP URL: {session['rtmp_url']}",
            "step_3": "Start streaming",
            "step_4": "Session will automatically go live"
        }
    }


@router.get("/sessions")
async def get_live_sessions(status: Optional[str] = None):
    """
    Get all live sessions
    Filter by status: scheduled, live, ended, recorded
    """
    query = {}
    if status:
        query["status"] = status
    
    sessions = await db.live_sessions.find(query).sort("created_at", -1).to_list(100)
    
    # Remove sensitive data
    for session in sessions:
        session.pop("_id", None)
        if session["status"] != "scheduled":
            session.pop("stream_key", None)
    
    return {"sessions": sessions}


@router.get("/sessions/{session_id}")
async def get_live_session(session_id: str):
    """
    Get specific live session details
    """
    session = await db.live_sessions.find_one({"id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.pop("_id", None)
    
    # Only show stream key if session is scheduled or live
    if session["status"] not in ["scheduled", "live"]:
        session.pop("stream_key", None)
    
    return session


@router.put("/sessions/{session_id}")
async def update_live_session(session_id: str, update_data: LiveSessionUpdate):
    """
    Update live session
    Used to change status (scheduled → live → ended)
    """
    session = await db.live_sessions.find_one({"id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    # Handle status changes
    if "status" in update_dict:
        new_status = update_dict["status"]
        
        if new_status == "live" and session["status"] == "scheduled":
            update_dict["started_at"] = datetime.now(timezone.utc)
        
        elif new_status == "ended" and session["status"] == "live":
            update_dict["ended_at"] = datetime.now(timezone.utc)
    
    await db.live_sessions.update_one(
        {"id": session_id},
        {"$set": update_dict}
    )
    
    return {"success": True, "session_id": session_id}


@router.post("/sessions/{session_id}/start")
async def start_live_session(session_id: str, request: Request):
    """
    Mark session as live (Admin only)
    Called when streaming starts
    Sends Telegram notifications to connected users
    """
    # Check admin permission
    wallet = request.headers.get("X-Wallet-Address", "").lower()
    if wallet and wallet.startswith("0x"):
        settings = await db.club_settings.find_one({})
        if settings:
            owner = settings.get("owner_wallet", "").lower()
            admins = [w.lower() for w in settings.get("admin_wallets", [])]
            if wallet != owner and wallet not in admins:
                raise HTTPException(status_code=403, detail="Admin access required")
    
    session = await db.live_sessions.find_one({"id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="Session must be scheduled to start")
    
    await db.live_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "status": "live",
                "started_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Send Telegram notifications to all connected users
    asyncio.create_task(send_live_start_notifications(session))
    
    return {"success": True, "status": "live", "session_id": session_id}


async def send_live_start_notifications(session: dict):
    """Send Telegram notifications when live session starts"""
    try:
        from services.telegram_service import telegram_service
        
        # Get bot token and notification channel
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E")
        notifications_channel = os.environ.get("TELEGRAM_NOTIFICATIONS_CHANNEL_ID", "-1002475795498")
        
        # 1. Send to notifications channel @P_FOMO
        try:
            await telegram_service.send_live_started_notification(
                bot_token=bot_token,
                chat_id=notifications_channel,
                session_data={
                    "id": session.get("id"),
                    "title": session.get("title"),
                    "description": session.get("description")
                }
            )
            logger.info(f"Sent live start notification to channel {notifications_channel}")
        except Exception as e:
            logger.error(f"Failed to send notification to channel: {e}")
        
        # 2. Send personal notifications to users with Telegram connected
        users = await db.users.find(
            {"telegram_connected": True, "telegram_chat_id": {"$exists": True, "$ne": None}},
            {"telegram_chat_id": 1}
        ).to_list(1000)
        
        # Also check authors collection (backward compatibility)
        authors = await db.authors.find(
            {"telegram_connected": True, "telegram_chat_id": {"$exists": True, "$ne": None}},
            {"telegram_chat_id": 1}
        ).to_list(1000)
        
        all_chat_ids = set()
        for u in users:
            if u.get("telegram_chat_id"):
                all_chat_ids.add(u["telegram_chat_id"])
        for a in authors:
            if a.get("telegram_chat_id"):
                all_chat_ids.add(a["telegram_chat_id"])
        
        logger.info(f"Sending live start notifications to {len(all_chat_ids)} personal users")
        
        for chat_id in all_chat_ids:
            try:
                await telegram_service.send_live_started_notification(
                    bot_token=bot_token,
                    chat_id=str(chat_id),
                    session_data={
                        "id": session.get("id"),
                        "title": session.get("title"),
                        "description": session.get("description")
                    }
                )
            except Exception as e:
                logger.error(f"Failed to send notification to {chat_id}: {e}")
                
    except Exception as e:
        logger.error(f"Error sending live start notifications: {e}")


@router.post("/sessions/{session_id}/end")
async def end_live_session(session_id: str, request: Request):
    """
    Mark session as ended (Admin only)
    Sends end notifications and calculates session stats
    """
    # Check admin permission
    wallet = request.headers.get("X-Wallet-Address", "").lower()
    if wallet and wallet.startswith("0x"):
        settings = await db.club_settings.find_one({})
        if settings:
            owner = settings.get("owner_wallet", "").lower()
            admins = [w.lower() for w in settings.get("admin_wallets", [])]
            if wallet != owner and wallet not in admins:
                raise HTTPException(status_code=403, detail="Admin access required")
    
    session = await db.live_sessions.find_one({"id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] != "live":
        raise HTTPException(status_code=400, detail="Session must be live to end")
    
    # Calculate duration
    started_at = session.get("started_at")
    ended_at = datetime.now(timezone.utc)
    duration_minutes = 0
    if started_at:
        # Handle both naive and aware datetimes
        if isinstance(started_at, datetime):
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=timezone.utc)
            duration_minutes = int((ended_at - started_at).total_seconds() / 60)
    
    # Get room stats before closing
    room = room_manager.get_room(session_id)
    participants_count = len(room.get("participants", {}))
    
    await db.live_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "status": "ended",
                "ended_at": ended_at,
                "updated_at": ended_at,
                "duration_minutes": duration_minutes,
                "participants_count": participants_count
            }
        }
    )
    
    # Create podcast from ended session
    podcast_id = await create_podcast_from_session(session, duration_minutes, participants_count)
    
    # Send Telegram notifications
    asyncio.create_task(send_live_end_notifications(session, duration_minutes, participants_count))
    
    return {"success": True, "status": "ended", "session_id": session_id, "podcast_id": podcast_id}


async def create_podcast_from_session(session: dict, duration_minutes: int, participants_count: int) -> str:
    """Create a podcast entry from an ended live session"""
    try:
        podcast_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Get club settings for owner info
        club_settings = await db.club_settings.find_one({})
        owner_id = club_settings.get("club_owner_id", "system") if club_settings else "system"
        
        # Get owner name
        owner = await db.users.find_one({"id": owner_id})
        owner_name = owner.get("username", "FOMO Club") if owner else "FOMO Club"
        
        podcast = {
            "id": podcast_id,
            "title": session.get("title", "Live Session Recording"),
            "description": session.get("description", ""),
            "author_id": owner_id,
            "author_name": owner_name,
            "cover_image": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500",
            "audio_url": None,  # Will be updated when recording is available
            "audio_file_id": None,
            "duration": duration_minutes * 60,  # Convert to seconds
            "file_size": 0,
            "audio_format": "mp3",
            "transcript": None,
            "ai_summary": None,
            "tags": ["live", "recording", "voice-chat"],
            "chapters": [],
            "is_live": False,
            "is_premium": False,
            "visibility": "public",
            "status": "awaiting_recording",  # Special status for live recordings
            "live_session_id": session.get("id"),
            "participants_count": participants_count,
            "views_count": 0,
            "listens_count": 0,
            "reactions_count": 0,
            "comments_count": 0,
            "likes": 0,
            "listens": 0,
            "category": "Live Recording",
            "is_private": False,
            "created_at": now,
            "updated_at": now,
            "published_at": now
        }
        
        await db.podcasts.insert_one(podcast)
        logger.info(f"Created podcast {podcast_id} from live session {session.get('id')}")
        
        # Update live session with podcast reference
        await db.live_sessions.update_one(
            {"id": session.get("id")},
            {"$set": {"podcast_id": podcast_id}}
        )
        
        return podcast_id
    except Exception as e:
        logger.error(f"Error creating podcast from session: {e}")
        return None


async def send_live_end_notifications(session: dict, duration_minutes: int, participants_count: int):
    """Send Telegram notifications when live session ends"""
    try:
        from services.telegram_service import telegram_service
        
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E")
        notifications_channel = os.environ.get("TELEGRAM_NOTIFICATIONS_CHANNEL_ID", "-1002475795498")
        
        session_data = {
            "id": session.get("id"),
            "title": session.get("title"),
            "duration_minutes": duration_minutes,
            "participants_count": participants_count
        }
        
        # 1. Send to notifications channel @P_FOMO
        try:
            await telegram_service.send_live_ended_notification(
                bot_token=bot_token,
                chat_id=notifications_channel,
                session_data=session_data
            )
            logger.info(f"Sent live end notification to channel {notifications_channel}")
        except Exception as e:
            logger.error(f"Failed to send end notification to channel: {e}")
        
        # 2. Send personal notifications to users with Telegram connected
        users = await db.users.find(
            {"telegram_connected": True, "telegram_chat_id": {"$exists": True, "$ne": None}},
            {"telegram_chat_id": 1}
        ).to_list(1000)
        
        authors = await db.authors.find(
            {"telegram_connected": True, "telegram_chat_id": {"$exists": True, "$ne": None}},
            {"telegram_chat_id": 1}
        ).to_list(1000)
        
        all_chat_ids = set()
        for u in users:
            if u.get("telegram_chat_id"):
                all_chat_ids.add(u["telegram_chat_id"])
        for a in authors:
            if a.get("telegram_chat_id"):
                all_chat_ids.add(a["telegram_chat_id"])
        
        logger.info(f"Sending live end notifications to {len(all_chat_ids)} personal users")
        
        for chat_id in all_chat_ids:
            try:
                await telegram_service.send_live_ended_notification(
                    bot_token=bot_token,
                    chat_id=str(chat_id),
                    session_data=session_data
                )
            except Exception as e:
                logger.error(f"Failed to send end notification to {chat_id}: {e}")
                
    except Exception as e:
        logger.error(f"Error sending live end notifications: {e}")


@router.delete("/sessions/{session_id}")
async def delete_live_session(session_id: str, request: Request):
    """
    Delete live session (Admin only)
    Only allowed if not live
    """
    # Check admin permission
    wallet = request.headers.get("X-Wallet-Address", "").lower()
    if wallet and wallet.startswith("0x"):
        settings = await db.club_settings.find_one({})
        if settings:
            owner = settings.get("owner_wallet", "").lower()
            admins = [w.lower() for w in settings.get("admin_wallets", [])]
            if wallet != owner and wallet not in admins:
                raise HTTPException(status_code=403, detail="Admin access required")
    
    session = await db.live_sessions.find_one({"id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] == "live":
        raise HTTPException(status_code=400, detail="Cannot delete live session")
    
    await db.live_sessions.delete_one({"id": session_id})
    
    return {"success": True, "message": "Session deleted"}


@router.post("/sessions/{session_id}/recording")
async def save_recording(session_id: str, recording_url: str, request: Request):
    """
    Save recording URL after Telegram bot downloads it (Admin only)
    Called by Telegram bot after processing
    """
    # Check admin permission
    wallet = request.headers.get("X-Wallet-Address", "").lower()
    if wallet and wallet.startswith("0x"):
        settings = await db.club_settings.find_one({})
        if settings:
            owner = settings.get("owner_wallet", "").lower()
            admins = [w.lower() for w in settings.get("admin_wallets", [])]
            if wallet != owner and wallet not in admins:
                raise HTTPException(status_code=403, detail="Admin access required")
    
    session = await db.live_sessions.find_one({"id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.live_sessions.update_one(
        {"id": session_id},
        {
            "$set": {
                "status": "recorded",
                "recording_url": recording_url,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"success": True, "status": "recorded"}


@router.get("/recordings")
async def get_processed_recordings():
    """
    Get list of processed recordings from Telegram channel
    """
    recordings = await db.processed_recordings.find(
        {},
        {"_id": 0}
    ).sort("processed_at", -1).to_list(50)
    
    return {
        "recordings": recordings,
        "total": len(recordings)
    }


@router.post("/recordings/sync")
async def sync_recordings_from_channel(request: Request):
    """
    Manually trigger sync of recordings from Telegram channel (Admin only)
    """
    # Check admin permission
    wallet = request.headers.get("X-Wallet-Address", "").lower()
    if wallet and wallet.startswith("0x"):
        settings = await db.club_settings.find_one({})
        if settings:
            owner = settings.get("owner_wallet", "").lower()
            admins = [w.lower() for w in settings.get("admin_wallets", [])]
            if wallet != owner and wallet not in admins:
                raise HTTPException(status_code=403, detail="Admin access required")
    
    # Import and run sync
    try:
        from telegram_recording_bot import RecordingBot
        
        bot = RecordingBot()
        await bot.init()
        
        messages = await bot.get_channel_messages(limit=20)
        processed = 0
        
        for msg in messages:
            if msg:
                await bot.process_recording(msg)
                processed += 1
        
        await bot.close()
        
        return {
            "success": True,
            "message": f"Synced {processed} messages from channel",
            "processed": processed
        }
    except Exception as e:
        logger.error(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ===========================================
# WebSocket Endpoint for Live Rooms
# ===========================================
@router.websocket("/ws/{session_id}")
async def live_room_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for live room real-time features.
    
    Query params expected in connection:
    - user_id: User identifier
    - username: Display name
    - role: 'speaker' or 'listener'
    
    Message types (client -> server):
    - chat: {type: "chat", message: "text"}
    - reaction: {type: "reaction", emoji: "👍"}
    - hand_raise: {type: "hand_raise", action: "raise"|"lower"}
    - promote: {type: "promote", target_user_id: "..."}  (host only)
    - demote: {type: "demote", target_user_id: "..."}  (host only)
    """
    # Parse query params
    user_id = websocket.query_params.get("user_id", f"anon_{uuid.uuid4().hex[:8]}")
    username = websocket.query_params.get("username", "Anonymous")
    role = websocket.query_params.get("role", "listener")
    
    # Verify session exists
    session = await db.live_sessions.find_one({"id": session_id})
    if not session or session.get("status") not in ["scheduled", "live", "active"]:
        await websocket.close(code=4004)
        return
    
    await room_manager.connect(websocket, session_id, user_id, username, role)
    
    # Award XP for joining
    await award_session_xp(user_id, "session_joined", {"session_id": session_id})
    
    # Track activity for XP limits per session
    session_activity = {
        "chat_count": 0,
        "reaction_count": 0,
        "join_time": datetime.now(timezone.utc),
        "last_xp_time": datetime.now(timezone.utc)
    }
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                if msg_type == "chat":
                    await room_manager.handle_chat(
                        session_id, user_id, username,
                        message.get("message", "")
                    )
                    # Award XP for chat (max 20 per session)
                    if session_activity["chat_count"] < 20:
                        await award_session_xp(user_id, "chat_message", {"session_id": session_id})
                        session_activity["chat_count"] += 1
                
                elif msg_type == "reaction":
                    await room_manager.handle_reaction(
                        session_id, user_id, username,
                        message.get("emoji", "👍")
                    )
                    # Award XP for reaction (max 10 per session)
                    if session_activity["reaction_count"] < 10:
                        await award_session_xp(user_id, "reaction_sent", {"session_id": session_id})
                        session_activity["reaction_count"] += 1
                
                elif msg_type == "hand_raise":
                    action = message.get("action", "raise")
                    await room_manager.handle_hand_raise(session_id, user_id, action)
                    # Award XP for raising hand
                    if action == "raise":
                        await award_session_xp(user_id, "hand_raised", {"session_id": session_id})
                
                elif msg_type == "promote" and role == "speaker":
                    target = message.get("target_user_id")
                    if target:
                        await room_manager.promote_to_speaker(session_id, target)
                        # Award XP to promoted user
                        await award_session_xp(target, "promoted_speaker", {"session_id": session_id, "promoted_by": user_id})
                
                elif msg_type == "demote" and role == "speaker":
                    target = message.get("target_user_id")
                    if target:
                        await room_manager.demote_to_listener(session_id, target)
                
                elif msg_type == "ping":
                    await room_manager.send_to_user(session_id, user_id, {"type": "pong"})
                    # Award time-based XP every 5 minutes
                    now = datetime.now(timezone.utc)
                    time_diff = (now - session_activity["last_xp_time"]).total_seconds()
                    if time_diff >= 300:  # 5 minutes
                        await award_session_xp(user_id, "session_5min", {"session_id": session_id})
                        session_activity["last_xp_time"] = now
                    
                    
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        await room_manager.disconnect(session_id, user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await room_manager.disconnect(session_id, user_id)


# ===========================================
# LiveKit Token Generation
# ===========================================
class LiveKitTokenRequest(BaseModel):
    session_id: str
    user_id: str
    username: str
    role: str = "listener"  # 'speaker' or 'listener'


@router.post("/livekit/token")
async def get_livekit_token(request: LiveKitTokenRequest):
    """
    Generate LiveKit access token for WebRTC audio room.
    
    In production, requires LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL.
    Returns mock token if LiveKit not configured.
    """
    livekit_api_key = os.environ.get("LIVEKIT_API_KEY")
    livekit_api_secret = os.environ.get("LIVEKIT_API_SECRET")
    livekit_url = os.environ.get("LIVEKIT_URL")
    
    # Check if LiveKit is configured
    if livekit_api_key and livekit_api_secret and livekit_url:
        try:
            from livekit.api import AccessToken, VideoGrants
            
            # Set grants based on role
            grants = VideoGrants(
                room_join=True,
                room=request.session_id,
                can_publish=request.role == "speaker",
                can_subscribe=True,
                can_publish_data=True
            )
            
            # Create token with new API (livekit-api 1.1.0+)
            token = AccessToken(livekit_api_key, livekit_api_secret) \
                .with_identity(request.user_id) \
                .with_name(request.username) \
                .with_grants(grants)
            
            return {
                "token": token.to_jwt(),
                "url": livekit_url,
                "room": request.session_id,
                "mock_mode": False
            }
        except Exception as e:
            print(f"LiveKit token error: {e}")
            import traceback
            traceback.print_exc()
            # Fall through to mock mode
    
    # Mock mode - return placeholder for development
    return {
        "token": None,
        "url": None,
        "room": request.session_id,
        "mock_mode": True,
        "message": "LiveKit not configured. Audio features disabled. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL to enable."
    }


@router.get("/room/{session_id}/state")
async def get_room_state(session_id: str):
    """Get current state of live room"""
    room = room_manager.get_room(session_id)
    return {
        "session_id": session_id,
        "participants": list(room["participants"].values()),
        "speakers": room["speakers"],
        "listeners": room["listeners"],
        "hand_raised": room["hand_raised"],
        "stats": room_manager.get_stats(session_id)
    }
