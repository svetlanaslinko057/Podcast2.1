"""
Speech Support Routes
Private Voice Club - Support System After Speeches
"""
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import Optional
import logging

from models import (
    SpeechSupport,
    SpeechSupportCreate
)

router = APIRouter(tags=["speech-support"])
logger = logging.getLogger(__name__)

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


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
    xp_breakdown['support_received'] = xp_breakdown.get('support_received', 0) + xp_amount
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"xp_total": new_xp, "xp_breakdown": xp_breakdown}}
    )
    
    # Update level and scores
    await update_user_level_and_scores(user_id)


@router.post("/speeches/{speech_id}/support")
async def support_speech(
    speech_id: str,
    supporter_id: str,
    support_type: str = "valuable"
):
    """
    Support a speech after it ends
    
    Query params: ?supporter_id=xxx&support_type=valuable|insightful|helpful
    """
    # Validate support_type
    if support_type not in ["valuable", "insightful", "helpful"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid support_type. Must be: valuable, insightful, or helpful"
        )
    
    # Find hand raise event (speech)
    hand_raise = await db.hand_raise_events.find_one({"id": speech_id})
    if not hand_raise:
        raise HTTPException(status_code=404, detail="Speech not found")
    
    # Check if speech was approved (actually happened)
    if hand_raise.get('status') != 'approved':
        raise HTTPException(status_code=400, detail="Can only support approved speeches")
    
    speaker_id = hand_raise['user_id']
    
    # Check if supporter is the speaker (can't support own speech)
    if supporter_id == speaker_id:
        raise HTTPException(status_code=400, detail="Cannot support your own speech")
    
    # Check if already supported
    existing = await db.speech_support.find_one({
        "speech_id": speech_id,
        "supporter_id": supporter_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already supported this speech")
    
    # Create support
    support = SpeechSupport(
        speech_id=speech_id,
        speaker_id=speaker_id,
        supporter_id=supporter_id,
        support_type=support_type
    )
    
    await db.speech_support.insert_one(support.model_dump())
    
    # Update hand raise event support count
    await db.hand_raise_events.update_one(
        {"id": speech_id},
        {"$inc": {"support_count": 1}}
    )
    
    # Update speaker voice stats
    await db.users.update_one(
        {"id": speaker_id},
        {"$inc": {"voice_stats.support_received": 1}}
    )
    
    # Award XP to speaker
    await award_xp_for_action(speaker_id, "support_received", 10, {
        "speech_id": speech_id,
        "support_type": support_type,
        "supporter_id": supporter_id
    })
    
    speaker = await db.users.find_one({"id": speaker_id})
    supporter = await db.users.find_one({"id": supporter_id})
    
    logger.info(f"User {supporter['name']} supported speech by {speaker['name']} ({support_type})")
    
    return {
        "message": f"Speech supported as {support_type}",
        "support_id": support.id,
        "speaker_name": speaker['name'],
        "xp_awarded_to_speaker": 10
    }


@router.get("/speeches/{speech_id}/supporters")
async def get_speech_supporters(speech_id: str):
    """
    Get list of users who supported this speech
    """
    # Find hand raise event
    hand_raise = await db.hand_raise_events.find_one({"id": speech_id})
    if not hand_raise:
        raise HTTPException(status_code=404, detail="Speech not found")
    
    # Get all support records
    supports = await db.speech_support.find(
        {"speech_id": speech_id}
    ).sort("timestamp", 1).to_list(length=None)
    
    # Enrich with user data
    supporters = []
    for support in supports:
        user = await db.users.find_one({"id": support['supporter_id']})
        if user:
            supporters.append({
                "support_id": support['id'],
                "supporter_id": user['id'],
                "name": user['name'],
                "username": user['username'],
                "avatar": user.get('avatar'),
                "support_type": support['support_type'],
                "supported_at": support['timestamp']
            })
    
    # Get speaker info
    speaker = await db.users.find_one({"id": hand_raise['user_id']})
    
    return {
        "speech_id": speech_id,
        "speaker": {
            "user_id": speaker['id'],
            "name": speaker['name'],
            "username": speaker['username']
        } if speaker else None,
        "total_support": len(supporters),
        "support_breakdown": {
            "valuable": len([s for s in supports if s['support_type'] == 'valuable']),
            "insightful": len([s for s in supports if s['support_type'] == 'insightful']),
            "helpful": len([s for s in supports if s['support_type'] == 'helpful'])
        },
        "supporters": supporters
    }


@router.get("/users/{user_id}/supported-speeches")
async def get_user_supported_speeches(
    user_id: str,
    limit: int = 50
):
    """
    Get speeches that this user has supported
    
    Query param: limit (default 50)
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all support records
    supports = await db.speech_support.find(
        {"supporter_id": user_id}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Enrich with speech and speaker data
    supported_speeches = []
    for support in supports:
        hand_raise = await db.hand_raise_events.find_one({"id": support['speech_id']})
        if hand_raise:
            speaker = await db.users.find_one({"id": hand_raise['user_id']})
            if speaker:
                supported_speeches.append({
                    "support_id": support['id'],
                    "speech_id": support['speech_id'],
                    "support_type": support['support_type'],
                    "supported_at": support['timestamp'],
                    "speaker": {
                        "user_id": speaker['id'],
                        "name": speaker['name'],
                        "username": speaker['username'],
                        "avatar": speaker.get('avatar')
                    },
                    "speech_info": {
                        "live_session_id": hand_raise['live_session_id'],
                        "duration_minutes": hand_raise.get('speech_duration_minutes', 0),
                        "total_support": hand_raise.get('support_count', 0)
                    }
                })
    
    return {
        "user_id": user_id,
        "user_name": user['name'],
        "total_supports_given": len(supported_speeches),
        "supported_speeches": supported_speeches
    }


@router.get("/users/{user_id}/received-support")
async def get_user_received_support(
    user_id: str,
    limit: int = 50
):
    """
    Get support that this user has received on their speeches
    
    Query param: limit (default 50)
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all support records for this speaker
    supports = await db.speech_support.find(
        {"speaker_id": user_id}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Enrich with supporter data
    received_support = []
    for support in supports:
        supporter = await db.users.find_one({"id": support['supporter_id']})
        hand_raise = await db.hand_raise_events.find_one({"id": support['speech_id']})
        
        if supporter and hand_raise:
            received_support.append({
                "support_id": support['id'],
                "speech_id": support['speech_id'],
                "support_type": support['support_type'],
                "supported_at": support['timestamp'],
                "supporter": {
                    "user_id": supporter['id'],
                    "name": supporter['name'],
                    "username": supporter['username'],
                    "avatar": supporter.get('avatar')
                },
                "speech_info": {
                    "live_session_id": hand_raise['live_session_id'],
                    "duration_minutes": hand_raise.get('speech_duration_minutes', 0),
                    "total_support": hand_raise.get('support_count', 0)
                }
            })
    
    # Calculate support stats
    total_support = user.get('voice_stats', {}).get('support_received', 0)
    support_breakdown = {
        "valuable": len([s for s in supports if s['support_type'] == 'valuable']),
        "insightful": len([s for s in supports if s['support_type'] == 'insightful']),
        "helpful": len([s for s in supports if s['support_type'] == 'helpful'])
    }
    
    return {
        "user_id": user_id,
        "user_name": user['name'],
        "total_support_received": total_support,
        "support_breakdown": support_breakdown,
        "received_support": received_support
    }


@router.delete("/speeches/{speech_id}/support")
async def remove_support(
    speech_id: str,
    supporter_id: str
):
    """
    Remove support from a speech (within 5 minutes)
    
    Query param: ?supporter_id=xxx
    """
    # Find support
    support = await db.speech_support.find_one({
        "speech_id": speech_id,
        "supporter_id": supporter_id
    })
    
    if not support:
        raise HTTPException(status_code=404, detail="Support not found")
    
    # Check if within 5 minutes
    support_time = support['timestamp']
    if isinstance(support_time, str):
        from dateutil import parser
        support_time = parser.parse(support_time)
    
    time_elapsed = (datetime.now(timezone.utc) - support_time).total_seconds() / 60
    if time_elapsed > 5:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove support after 5 minutes"
        )
    
    # Delete support
    await db.speech_support.delete_one({"id": support['id']})
    
    # Decrement counters
    await db.hand_raise_events.update_one(
        {"id": speech_id},
        {"$inc": {"support_count": -1}}
    )
    
    await db.users.update_one(
        {"id": support['speaker_id']},
        {"$inc": {"voice_stats.support_received": -1}}
    )
    
    # Remove XP (TODO: implement XP removal)
    
    return {"message": "Support removed successfully"}
