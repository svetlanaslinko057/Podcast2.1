"""
Hand Raise System Routes
Private Voice Club - Hand Raise Queue & Speaker Management
"""
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import List, Optional
import logging

from models import (
    HandRaiseEvent,
    HandRaiseCreate,
    HandRaiseApprove
)

router = APIRouter(tags=["hand-raise"])
logger = logging.getLogger(__name__)

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


async def check_moderator_permission(user_id: str) -> bool:
    """Check if user is moderator, admin, or owner"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return False
    return user.get("role") in ["moderator", "admin", "owner"]


async def award_xp_for_action(user_id: str, action: str, xp_amount: int, metadata: dict = None):
    """Award XP and update user level/scores"""
    from routes.xp import update_user_level_and_scores
    
    # Create XP transaction
    xp_tx = {
        "user_id": user_id,
        "action": action,
        "xp_earned": xp_amount,
        "timestamp": datetime.now(timezone.utc),
        "metadata": metadata or {}
    }
    await db.xp_transactions.insert_one(xp_tx)
    
    # Update user XP
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    
    current_xp = user.get('xp_total', 0)
    new_xp = current_xp + xp_amount
    
    # Update XP breakdown
    xp_breakdown = user.get('xp_breakdown', {})
    if action == 'hand_raised':
        xp_breakdown['hand_raises'] = xp_breakdown.get('hand_raises', 0) + xp_amount
    elif action == 'speech_given':
        xp_breakdown['speeches_given'] = xp_breakdown.get('speeches_given', 0) + xp_amount
    elif action == 'support_received':
        xp_breakdown['support_received'] = xp_breakdown.get('support_received', 0) + xp_amount
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"xp_total": new_xp, "xp_breakdown": xp_breakdown}}
    )
    
    # Update level and scores
    await update_user_level_and_scores(user_id)


@router.post("/live/{session_id}/hand-raise")
async def raise_hand(
    session_id: str,
    user_id: str
):
    """
    Raise hand in live session
    
    Query param: ?user_id=xxx
    """
    # Check if live session exists and is active
    live_session = await db.live_sessions.find_one({"id": session_id, "is_live": True})
    if not live_session:
        raise HTTPException(status_code=404, detail="Live session not found or not active")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already has hand raised (pending)
    existing = await db.hand_raise_events.find_one({
        "user_id": user_id,
        "live_session_id": session_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have your hand raised")
    
    # Check queue limit
    club_settings = await db.club_settings.find_one({})
    queue_limit = club_settings.get('hand_raise_queue_limit', 10) if club_settings else 10
    
    pending_count = await db.hand_raise_events.count_documents({
        "live_session_id": session_id,
        "status": "pending"
    })
    
    if pending_count >= queue_limit:
        raise HTTPException(status_code=400, detail=f"Queue is full (max {queue_limit})")
    
    # Calculate queue position and priority
    priority_score = user.get('priority_score', 50.0)
    queue_position = pending_count + 1
    
    # Create hand raise event
    hand_raise = HandRaiseEvent(
        user_id=user_id,
        live_session_id=session_id,
        status="pending",
        queue_position=queue_position,
        priority_score=priority_score
    )
    
    await db.hand_raise_events.insert_one(hand_raise.model_dump())
    
    # Award XP for raising hand
    await award_xp_for_action(user_id, "hand_raised", 20, {
        "live_session_id": session_id
    })
    
    # Update voice stats
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"voice_stats.hand_raise_count": 1}}
    )
    
    logger.info(f"User {user['name']} raised hand in session {session_id}")
    
    return {
        "message": "Hand raised successfully",
        "hand_raise_id": hand_raise.id,
        "queue_position": queue_position,
        "priority_score": priority_score,
        "xp_earned": 20
    }


@router.delete("/live/{session_id}/hand-raise")
async def lower_hand(
    session_id: str,
    user_id: str
):
    """
    Lower hand (cancel raise)
    
    Query param: ?user_id=xxx
    """
    # Find pending hand raise
    hand_raise = await db.hand_raise_events.find_one({
        "user_id": user_id,
        "live_session_id": session_id,
        "status": "pending"
    })
    
    if not hand_raise:
        raise HTTPException(status_code=404, detail="No pending hand raise found")
    
    # Update status to expired
    await db.hand_raise_events.update_one(
        {"id": hand_raise['id']},
        {"$set": {"status": "expired"}}
    )
    
    return {"message": "Hand lowered successfully"}


@router.get("/live/{session_id}/hand-raise-queue")
async def get_hand_raise_queue(session_id: str):
    """
    Get hand raise queue for live session
    Sorted by priority_score (desc)
    """
    # Get all pending hand raises
    hand_raises = await db.hand_raise_events.find({
        "live_session_id": session_id,
        "status": "pending"
    }).sort("priority_score", -1).to_list(length=None)
    
    # Enrich with user data
    queue = []
    for idx, hr in enumerate(hand_raises):
        user = await db.users.find_one({"id": hr['user_id']})
        if user:
            queue.append({
                "hand_raise_id": hr['id'],
                "user_id": user['id'],
                "username": user['username'],
                "name": user['name'],
                "avatar": user.get('avatar'),
                "role": user.get('role', 'listener'),
                "level": user.get('level', 1),
                "priority_score": hr['priority_score'],
                "raised_at": hr['raised_at'],
                "queue_position": idx + 1
            })
    
    return {
        "live_session_id": session_id,
        "queue": queue,
        "total": len(queue)
    }


@router.post("/live/{session_id}/approve-speaker")
async def approve_speaker(
    session_id: str,
    hand_raise_id: str,
    moderator_id: str
):
    """
    Approve speaker from queue (Moderator/Admin/Owner only)
    
    Query params: ?hand_raise_id=xxx&moderator_id=xxx
    """
    # Check moderator permission
    if not await check_moderator_permission(moderator_id):
        raise HTTPException(
            status_code=403,
            detail="Only moderators, admins, or owner can approve speakers"
        )
    
    # Find hand raise event
    hand_raise = await db.hand_raise_events.find_one({
        "id": hand_raise_id,
        "live_session_id": session_id,
        "status": "pending"
    })
    
    if not hand_raise:
        raise HTTPException(status_code=404, detail="Hand raise not found or already processed")
    
    # Update hand raise status
    await db.hand_raise_events.update_one(
        {"id": hand_raise_id},
        {
            "$set": {
                "status": "approved",
                "approved_at": datetime.now(timezone.utc),
                "approved_by": moderator_id,
                "speech_started_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Update live session current speaker
    await db.live_sessions.update_one(
        {"id": session_id},
        {"$set": {"current_speaker_id": hand_raise['user_id']}}
    )
    
    user = await db.users.find_one({"id": hand_raise['user_id']})
    
    logger.info(f"Moderator {moderator_id} approved speaker {user['name']} in session {session_id}")
    
    return {
        "message": f"Speaker {user['name']} approved",
        "speaker_id": user['id'],
        "speech_started_at": datetime.now(timezone.utc).isoformat()
    }


@router.post("/live/{session_id}/end-speech")
async def end_speech(
    session_id: str,
    hand_raise_id: str,
    moderator_id: str
):
    """
    End current speech (Moderator/Admin/Owner only)
    
    Query params: ?hand_raise_id=xxx&moderator_id=xxx
    """
    # Check moderator permission
    if not await check_moderator_permission(moderator_id):
        raise HTTPException(
            status_code=403,
            detail="Only moderators, admins, or owner can end speeches"
        )
    
    # Find approved hand raise
    hand_raise = await db.hand_raise_events.find_one({
        "id": hand_raise_id,
        "live_session_id": session_id,
        "status": "approved"
    })
    
    if not hand_raise:
        raise HTTPException(status_code=404, detail="Active speech not found")
    
    # Calculate speech duration
    speech_started = hand_raise.get('speech_started_at')
    if isinstance(speech_started, str):
        from dateutil import parser
        speech_started = parser.parse(speech_started)
    
    # Ensure timezone aware
    if speech_started.tzinfo is None:
        speech_started = speech_started.replace(tzinfo=timezone.utc)
    
    speech_ended = datetime.now(timezone.utc)
    duration_minutes = int((speech_ended - speech_started).total_seconds() / 60)
    
    # Update hand raise event
    await db.hand_raise_events.update_one(
        {"id": hand_raise_id},
        {
            "$set": {
                "speech_ended_at": speech_ended,
                "speech_duration_minutes": duration_minutes
            }
        }
    )
    
    # Clear current speaker from live session
    await db.live_sessions.update_one(
        {"id": session_id},
        {"$set": {"current_speaker_id": None}}
    )
    
    # Update user voice stats
    speaker_id = hand_raise['user_id']
    await db.users.update_one(
        {"id": speaker_id},
        {
            "$inc": {
                "voice_stats.total_speeches": 1,
                "voice_stats.total_speech_time_minutes": duration_minutes
            },
            "$set": {
                "voice_stats.last_speech_at": speech_ended
            }
        }
    )
    
    # Award XP for speech
    await award_xp_for_action(speaker_id, "speech_given", 100, {
        "live_session_id": session_id,
        "duration_minutes": duration_minutes
    })
    
    # Calculate and update hand raise success rate
    user = await db.users.find_one({"id": speaker_id})
    total_hand_raises = user.get('voice_stats', {}).get('hand_raise_count', 0)
    total_speeches = user.get('voice_stats', {}).get('total_speeches', 0)
    success_rate = total_speeches / total_hand_raises if total_hand_raises > 0 else 0
    
    await db.users.update_one(
        {"id": speaker_id},
        {"$set": {"voice_stats.hand_raise_success_rate": success_rate}}
    )
    
    logger.info(f"Speech ended for user {speaker_id}, duration: {duration_minutes} minutes")
    
    return {
        "message": "Speech ended successfully",
        "speaker_id": speaker_id,
        "duration_minutes": duration_minutes,
        "xp_earned": 100,
        "success_rate": round(success_rate, 2)
    }


@router.get("/live/{session_id}/current-speaker")
async def get_current_speaker(session_id: str):
    """
    Get current speaker info
    """
    live_session = await db.live_sessions.find_one({"id": session_id})
    if not live_session:
        raise HTTPException(status_code=404, detail="Live session not found")
    
    current_speaker_id = live_session.get('current_speaker_id')
    if not current_speaker_id:
        return {"current_speaker": None}
    
    # Get speaker info
    user = await db.users.find_one({"id": current_speaker_id})
    if not user:
        return {"current_speaker": None}
    
    # Get active hand raise event
    hand_raise = await db.hand_raise_events.find_one({
        "user_id": current_speaker_id,
        "live_session_id": session_id,
        "status": "approved"
    })
    
    speech_started_at = hand_raise.get('speech_started_at') if hand_raise else None
    
    return {
        "current_speaker": {
            "user_id": user['id'],
            "name": user['name'],
            "username": user['username'],
            "avatar": user.get('avatar'),
            "role": user.get('role'),
            "level": user.get('level'),
            "speech_started_at": speech_started_at,
            "hand_raise_id": hand_raise['id'] if hand_raise else None
        }
    }


@router.get("/users/{user_id}/hand-raise-history")
async def get_user_hand_raise_history(
    user_id: str,
    limit: int = 50
):
    """
    Get user's hand raise history
    
    Query param: limit (default 50)
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all hand raises
    hand_raises = await db.hand_raise_events.find(
        {"user_id": user_id}
    ).sort("raised_at", -1).limit(limit).to_list(length=limit)
    
    # Format response
    history = []
    for hr in hand_raises:
        hr.pop('_id', None)
        history.append({
            "hand_raise_id": hr['id'],
            "live_session_id": hr['live_session_id'],
            "status": hr['status'],
            "raised_at": hr['raised_at'],
            "approved_at": hr.get('approved_at'),
            "speech_duration_minutes": hr.get('speech_duration_minutes', 0),
            "support_count": hr.get('support_count', 0)
        })
    
    # Calculate stats
    total_raises = len(hand_raises)
    approved_count = len([h for h in hand_raises if h['status'] == 'approved'])
    success_rate = approved_count / total_raises if total_raises > 0 else 0
    
    return {
        "user_id": user_id,
        "user_name": user['name'],
        "total_hand_raises": total_raises,
        "approved_count": approved_count,
        "success_rate": round(success_rate, 2),
        "history": history
    }
