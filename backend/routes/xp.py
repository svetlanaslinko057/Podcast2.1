"""
XP System Routes
Private Voice Club - Experience Points & Leveling
"""
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import List, Optional, Dict
import logging

from models import (
    XPTransaction,
    XPAward,
    LeaderboardEntry
)

router = APIRouter(tags=["xp"])
logger = logging.getLogger(__name__)

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


# Level Thresholds
LEVEL_THRESHOLDS = {
    1: 0,        # Level 1: Observer (0 - 499 XP)
    2: 500,      # Level 2: Active Member (500 - 1,499 XP)
    3: 1500,     # Level 3: Contributor (1,500 - 3,499 XP)
    4: 3500,     # Level 4: Speaker (3,500 - 6,999 XP)
    5: 7000      # Level 5: Core Voice (7,000+ XP)
}

LEVEL_NAMES = {
    1: "Observer",
    2: "Active Member",
    3: "Contributor",
    4: "Speaker",
    5: "Core Voice"
}


def calculate_level(xp_total: int) -> int:
    """Calculate level based on total XP"""
    level = 1
    for lvl, threshold in LEVEL_THRESHOLDS.items():
        if xp_total >= threshold:
            level = lvl
    return level


def calculate_engagement_score(user_data: Dict) -> float:
    """
    Calculate engagement score (0-100)
    
    Factors:
    - Listening time (30%)
    - Live attendance (25%)
    - Hand raises (15%)
    - Speeches given (20%)
    - Support received (10%)
    """
    xp_breakdown = user_data.get('xp_breakdown', {})
    voice_stats = user_data.get('voice_stats', {})
    
    # Listening time (30 points max)
    listening_minutes = xp_breakdown.get('listening_time', 0)  # XP = minutes
    listening_score = min(listening_minutes / 100, 30)
    
    # Live attendance (25 points max)
    live_count = xp_breakdown.get('live_attendance', 0) / 50  # Each live = 50 XP
    live_score = min(live_count * 2.5, 25)
    
    # Hand raises (15 points max)
    hand_raise_count = voice_stats.get('hand_raise_count', 0)
    hand_raise_score = min(hand_raise_count * 1.5, 15)
    
    # Speeches given (20 points max)
    speech_count = voice_stats.get('total_speeches', 0)
    speech_score = min(speech_count * 4, 20)
    
    # Support received (10 points max)
    support_count = voice_stats.get('support_received', 0)
    support_score = min(support_count * 0.5, 10)
    
    total_score = listening_score + live_score + hand_raise_score + speech_score + support_score
    return round(total_score, 1)


def calculate_priority_score(user_data: Dict) -> float:
    """
    Calculate priority score for hand raise queue (0-100)
    
    Factors:
    - Level (25%)
    - Engagement score (20%)
    - Hand raise success rate (20%)
    - Rarity bonus (10% if < 5 speeches)
    - Base score (50)
    """
    level = user_data.get('level', 1)
    engagement = user_data.get('engagement_score', 0)
    voice_stats = user_data.get('voice_stats', {})
    
    base_score = 50
    
    # Level bonus (0-25)
    level_bonus = (level - 1) * 6.25
    
    # Engagement bonus (0-20)
    engagement_bonus = engagement * 0.2
    
    # Success rate bonus (0-20)
    success_rate = voice_stats.get('hand_raise_success_rate', 0)
    success_bonus = success_rate * 20
    
    # Rarity bonus (10 if < 5 speeches)
    speech_count = voice_stats.get('total_speeches', 0)
    rarity_bonus = 10 if speech_count < 5 else 0
    
    priority = base_score + level_bonus + engagement_bonus + success_bonus + rarity_bonus
    return min(round(priority, 1), 100)  # Cap at 100


async def update_user_level_and_scores(user_id: str):
    """Update user level, engagement_score, and priority_score"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    
    xp_total = user.get('xp_total', 0)
    new_level = calculate_level(xp_total)
    
    # Calculate scores
    engagement_score = calculate_engagement_score(user)
    priority_score = calculate_priority_score(user)
    
    # Update user
    update_data = {
        "level": new_level,
        "engagement_score": engagement_score,
        "priority_score": priority_score
    }
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    # If level changed, log it
    if user.get('level', 1) != new_level:
        logger.info(f"User {user['name']} leveled up to Level {new_level} - {LEVEL_NAMES[new_level]}")
        # TODO: Send notification to user about level up


@router.post("/xp/award")
async def award_xp(data: XPAward):
    """
    Award XP to user
    Internal use / background jobs
    
    Actions:
    - podcast_listened: +10 XP
    - listening_minute: +1 XP per minute
    - live_attended: +50 XP
    - hand_raised: +20 XP
    - speech_given: +100 XP
    - support_received: +10 XP
    """
    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create XP transaction
    xp_transaction = XPTransaction(
        user_id=data.user_id,
        action=data.action,
        xp_earned=data.xp_amount,
        metadata=data.metadata or {}
    )
    await db.xp_transactions.insert_one(xp_transaction.model_dump())
    
    # Update user XP
    current_xp = user.get('xp_total', 0)
    new_xp = current_xp + data.xp_amount
    
    # Update XP breakdown based on action
    xp_breakdown = user.get('xp_breakdown', {
        'listening_time': 0,
        'podcasts_listened': 0,
        'live_attendance': 0,
        'hand_raises': 0,
        'speeches_given': 0,
        'support_received': 0
    })
    
    if data.action == 'podcast_listened':
        xp_breakdown['podcasts_listened'] += data.xp_amount
    elif data.action == 'listening_minute':
        xp_breakdown['listening_time'] += data.xp_amount
    elif data.action == 'live_attended':
        xp_breakdown['live_attendance'] += data.xp_amount
    elif data.action == 'hand_raised':
        xp_breakdown['hand_raises'] += data.xp_amount
    elif data.action == 'speech_given':
        xp_breakdown['speeches_given'] += data.xp_amount
    elif data.action == 'support_received':
        xp_breakdown['support_received'] += data.xp_amount
    
    await db.users.update_one(
        {"id": data.user_id},
        {
            "$set": {
                "xp_total": new_xp,
                "xp_breakdown": xp_breakdown
            }
        }
    )
    
    # Update level and scores
    await update_user_level_and_scores(data.user_id)
    
    # Check and award participation badges
    from routes.badges import check_and_award_participation_badges
    await check_and_award_participation_badges(data.user_id)
    
    # Get updated user
    updated_user = await db.users.find_one({"id": data.user_id})
    
    return {
        "message": f"Awarded {data.xp_amount} XP for {data.action}",
        "user_id": data.user_id,
        "xp_earned": data.xp_amount,
        "xp_total": updated_user['xp_total'],
        "level": updated_user['level'],
        "level_name": LEVEL_NAMES[updated_user['level']]
    }


@router.get("/xp/leaderboard")
async def get_leaderboard(
    limit: int = 50,
    sort_by: str = "xp"  # xp, engagement, speeches
):
    """
    Get XP leaderboard
    
    Query params:
    - limit: Number of users to return (default 50)
    - sort_by: xp, engagement, speeches
    """
    # Determine sort field
    if sort_by == "engagement":
        sort_field = "engagement_score"
    elif sort_by == "speeches":
        sort_field = "voice_stats.total_speeches"
    else:
        sort_field = "xp_total"
    
    # Get top users
    users = await db.users.find().sort(sort_field, -1).limit(limit).to_list(length=limit)
    
    # Format leaderboard
    leaderboard = []
    for idx, user in enumerate(users):
        user.pop('_id', None)
        
        # Count badges
        badges_count = len(user.get('badges', []))
        
        entry = LeaderboardEntry(
            user_id=user['id'],
            name=user['name'],
            username=user['username'],
            avatar=user.get('avatar'),
            level=user.get('level', 1),
            role=user.get('role', 'listener'),
            xp_total=user.get('xp_total', 0),
            engagement_score=user.get('engagement_score', 0),
            badges_count=badges_count,
            rank=idx + 1
        )
        leaderboard.append(entry.model_dump())
    
    return {
        "leaderboard": leaderboard,
        "sort_by": sort_by,
        "total": len(leaderboard)
    }


@router.get("/xp/levels")
async def get_level_info():
    """
    Get information about all levels and XP requirements
    """
    levels_info = []
    
    for level, threshold in LEVEL_THRESHOLDS.items():
        # Next level threshold
        next_threshold = LEVEL_THRESHOLDS.get(level + 1, None)
        
        levels_info.append({
            "level": level,
            "name": LEVEL_NAMES[level],
            "xp_required": threshold,
            "xp_to_next": next_threshold - threshold if next_threshold else None,
            "benefits": get_level_benefits(level)
        })
    
    return {"levels": levels_info}


def get_level_benefits(level: int) -> List[str]:
    """Get benefits for each level"""
    benefits = {
        1: [
            "Can listen to podcasts",
            "Can participate in live chat",
            "Basic club access"
        ],
        2: [
            "All Level 1 benefits",
            "Can raise hand in live sessions",
            "Enhanced profile visibility",
            "Can earn badges"
        ],
        3: [
            "All Level 2 benefits",
            "Priority in hand raise queue (+1)",
            "Can create playlists",
            "Access to exclusive content"
        ],
        4: [
            "All Level 3 benefits",
            "High priority in hand raise queue (+2)",
            "Can host discussions",
            "Extended speech time",
            "Speaker badge"
        ],
        5: [
            "All Level 4 benefits",
            "Highest priority in queue (+3)",
            "Can mentor new members",
            "Access to Core Voice channel",
            "Verified Expert badge eligibility",
            "Vote in club decisions"
        ]
    }
    return benefits.get(level, [])


@router.get("/xp/{user_id}/history")
async def get_xp_history(
    user_id: str,
    limit: int = 100
):
    """
    Get XP transaction history for user
    
    Query param: limit (default 100)
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get transactions
    transactions = await db.xp_transactions.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Remove _id
    for tx in transactions:
        tx.pop('_id', None)
    
    return {
        "user_id": user_id,
        "user_name": user['name'],
        "xp_total": user.get('xp_total', 0),
        "level": user.get('level', 1),
        "transactions": transactions,
        "total_transactions": len(transactions)
    }


@router.get("/xp/{user_id}/progress")
async def get_user_progress(user_id: str):
    """
    Get user progress info (XP, level, next level requirements)
    Auto-creates user if not found
    """
    user = await db.users.find_one({"id": user_id})
    
    # Auto-create user if not found
    if not user:
        # Check if this wallet is admin/owner
        settings = await db.club_settings.find_one({})
        is_admin = False
        is_owner = False
        role = "member"
        
        if settings:
            owner_wallet = settings.get("owner_wallet", "").lower()
            admin_wallets = [w.lower() for w in settings.get("admin_wallets", [])]
            wallet_lower = user_id.lower()
            
            is_owner = wallet_lower == owner_wallet
            is_admin = wallet_lower in admin_wallets
            
            if is_owner:
                role = "owner"
            elif is_admin:
                role = "admin"
        
        # Create new user
        new_user = {
            "id": user_id,
            "name": f"User {user_id[:8]}",
            "username": f"user_{user_id[:8]}",
            "wallet_address": user_id,
            "role": role,
            "level": 1,
            "xp_total": 0,
            "badges": [],
            "xp_breakdown": {
                "listening_time": 0,
                "live_attendance": 0,
                "hand_raises": 0,
                "speeches_given": 0,
                "support_received": 0
            },
            "voice_stats": {
                "total_listen_time": 0,
                "total_speeches": 0,
                "hand_raise_count": 0,
                "support_given": 0,
                "support_received": 0
            },
            "engagement_score": 0,
            "priority_score": 50,
            "joined_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        
        # If admin/owner - give all badges and higher stats
        if is_admin or is_owner:
            ALL_BADGES = [
                {"key": "early_member", "name": "Early Member", "description": "Joined in the first 30 days of the club", "type": "participation"},
                {"key": "10_sessions", "name": "10 Sessions Attended", "description": "Participated in 10 live sessions", "type": "participation"},
                {"key": "first_speaker", "name": "First Time Speaker", "description": "Gave your first speech", "type": "participation"},
                {"key": "100_hours", "name": "100 Hours in Club", "description": "Listened for 100+ hours", "type": "participation"},
                {"key": "active_raiser", "name": "Active Hand Raiser", "description": "Raised hand 50+ times", "type": "participation"},
                {"key": "supporter", "name": "Community Supporter", "description": "Supported 25+ speeches", "type": "participation"},
                {"key": "insightful_speaker", "name": "Insightful Speaker", "description": "Received 50+ supports marked as 'insightful'", "type": "contribution"},
                {"key": "community_helper", "name": "Community Helper", "description": "Actively helps other members", "type": "contribution"},
                {"key": "moderator_trusted", "name": "Moderator Trusted", "description": "Trusted by moderators", "type": "contribution"},
                {"key": "signal_provider", "name": "Signal Provider", "description": "Provides valuable insights regularly", "type": "contribution"},
                {"key": "core_member", "name": "Core Member", "description": "Essential part of the club community", "type": "authority"},
                {"key": "verified_expert", "name": "Verified Expert", "description": "Recognized expert in their field", "type": "authority"},
                {"key": "club_council", "name": "Club Council", "description": "Member of the club council", "type": "authority"},
                {"key": "long_term_holder", "name": "Long-Term Holder", "description": "Active member for 1+ year", "type": "authority"},
            ]
            new_user["badges"] = ALL_BADGES
            new_user["level"] = 5
            new_user["xp_total"] = 10000
            new_user["xp_breakdown"] = {
                "listening_time": 3000,
                "live_attendance": 2500,
                "hand_raises": 500,
                "speeches_given": 1000,
                "support_received": 500
            }
        
        await db.users.insert_one(new_user)
        user = new_user
        logger.info(f"Auto-created user: {user_id} with role: {role}")
    
    xp_total = user.get('xp_total', 0)
    current_level = user.get('level', 1)
    
    # Current level threshold
    current_threshold = LEVEL_THRESHOLDS[current_level]
    
    # Next level info
    next_level = current_level + 1 if current_level < 5 else None
    next_threshold = LEVEL_THRESHOLDS.get(next_level) if next_level else None
    xp_to_next = next_threshold - xp_total if next_threshold else 0
    
    # Progress percentage
    if next_threshold:
        xp_range = next_threshold - current_threshold
        xp_in_level = xp_total - current_threshold
        progress_percent = (xp_in_level / xp_range) * 100
    else:
        progress_percent = 100  # Max level
    
    return {
        "user_id": user_id,
        "user_name": user.get('name', f"User {user_id[:8]}"),
        "xp_total": xp_total,
        "current_level": current_level,
        "level_name": LEVEL_NAMES[current_level],
        "next_level": next_level,
        "next_level_name": LEVEL_NAMES.get(next_level) if next_level else "Max Level",
        "xp_to_next_level": xp_to_next,
        "progress_percent": round(progress_percent, 1),
        "xp_breakdown": user.get('xp_breakdown', {
            "listening_time": 0,
            "live_attendance": 0,
            "hand_raises": 0,
            "speeches_given": 0,
            "support_received": 0
        }),
        "engagement_score": user.get('engagement_score', 0),
        "priority_score": user.get('priority_score', 50)
    }
