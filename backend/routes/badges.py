"""
Badge System Routes
Private Voice Club - Badge Management & Auto-Award
"""
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import Optional, List, Dict
import logging

from models import (
    ClubBadge,
    BadgeAward
)

router = APIRouter(tags=["badges"])
logger = logging.getLogger(__name__)

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


# Badge Definitions
PARTICIPATION_BADGES = {
    "early_member": {
        "name": "Early Member",
        "description": "Joined in the first 30 days of the club",
        "icon": "🌟",
        "type": "participation"
    },
    "10_sessions": {
        "name": "10 Sessions Attended",
        "description": "Participated in 10 live sessions",
        "icon": "🎙️",
        "type": "participation"
    },
    "first_speaker": {
        "name": "First Time Speaker",
        "description": "Gave your first speech",
        "icon": "🎤",
        "type": "participation"
    },
    "100_hours": {
        "name": "100 Hours in Club",
        "description": "Listened for 100+ hours",
        "icon": "⏰",
        "type": "participation"
    },
    "active_raiser": {
        "name": "Active Hand Raiser",
        "description": "Raised hand 50+ times",
        "icon": "✋",
        "type": "participation"
    },
    "supporter": {
        "name": "Community Supporter",
        "description": "Supported 25+ speeches",
        "icon": "💪",
        "type": "participation"
    }
}

CONTRIBUTION_BADGES = {
    "insightful_speaker": {
        "name": "Insightful Speaker",
        "description": "Received 50+ supports marked as 'insightful'",
        "icon": "💡",
        "type": "contribution"
    },
    "community_helper": {
        "name": "Community Helper",
        "description": "Actively helps other members",
        "icon": "🤝",
        "type": "contribution"
    },
    "moderator_trusted": {
        "name": "Moderator Trusted",
        "description": "Trusted by moderators",
        "icon": "🛡️",
        "type": "contribution"
    },
    "signal_provider": {
        "name": "Signal Provider",
        "description": "Provides valuable insights regularly",
        "icon": "📡",
        "type": "contribution"
    }
}

AUTHORITY_BADGES = {
    "core_member": {
        "name": "Core Member",
        "description": "Essential part of the club community",
        "icon": "⭐",
        "type": "authority"
    },
    "verified_expert": {
        "name": "Verified Expert",
        "description": "Recognized expert in their field",
        "icon": "✅",
        "type": "authority"
    },
    "club_council": {
        "name": "Club Council",
        "description": "Member of the club council",
        "icon": "🏛️",
        "type": "authority"
    },
    "long_term_holder": {
        "name": "Long-Term Holder",
        "description": "Active member for 1+ year",
        "icon": "💎",
        "type": "authority"
    }
}

# All badges combined
ALL_BADGES = {**PARTICIPATION_BADGES, **CONTRIBUTION_BADGES, **AUTHORITY_BADGES}


async def check_admin_permission(user_id: str) -> bool:
    """Check if user is admin or owner"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return False
    return user.get("role") in ["admin", "owner"]


async def user_has_badge(user_id: str, badge_name: str) -> bool:
    """Check if user already has this badge"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return False
    
    badges = user.get('badges', [])
    for badge in badges:
        if badge.get('name') == badge_name:
            return True
    return False


async def award_badge_to_user(user_id: str, badge_key: str, awarded_by: str = "system"):
    """Award a badge to user"""
    if badge_key not in ALL_BADGES:
        logger.error(f"Invalid badge key: {badge_key}")
        return False
    
    # Check if user already has badge
    if await user_has_badge(user_id, ALL_BADGES[badge_key]['name']):
        logger.info(f"User {user_id} already has badge {badge_key}")
        return False
    
    badge_info = ALL_BADGES[badge_key]
    
    # Create badge
    badge = ClubBadge(
        type=badge_info['type'],
        name=badge_info['name'],
        description=badge_info['description'],
        icon=badge_info.get('icon'),
        visible=True
    )
    
    # Add to user
    await db.users.update_one(
        {"id": user_id},
        {"$push": {"badges": badge.model_dump()}}
    )
    
    user = await db.users.find_one({"id": user_id})
    logger.info(f"Badge '{badge_info['name']}' awarded to {user['name']} by {awarded_by}")
    
    return True


async def check_and_award_participation_badges(user_id: str):
    """
    Check and auto-award participation badges based on user stats
    Call this after any activity that might trigger a badge
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    
    voice_stats = user.get('voice_stats', {})
    xp_breakdown = user.get('xp_breakdown', {})
    joined_at = user.get('joined_at')
    
    badges_awarded = []
    
    # 1. Early Member (joined in first 30 days)
    if joined_at:
        if isinstance(joined_at, str):
            from dateutil import parser
            joined_at = parser.parse(joined_at)
        
        # Get club creation date
        club = await db.club_settings.find_one({})
        if club:
            club_created = club.get('created_at')
            if isinstance(club_created, str):
                from dateutil import parser
                club_created = parser.parse(club_created)
            
            # Ensure timezone aware
            if joined_at.tzinfo is None:
                joined_at = joined_at.replace(tzinfo=timezone.utc)
            if club_created.tzinfo is None:
                club_created = club_created.replace(tzinfo=timezone.utc)
            
            days_diff = (joined_at - club_created).days
            if days_diff <= 30:
                if await award_badge_to_user(user_id, "early_member"):
                    badges_awarded.append("Early Member")
    
    # 2. First Time Speaker
    if voice_stats.get('total_speeches', 0) >= 1:
        if await award_badge_to_user(user_id, "first_speaker"):
            badges_awarded.append("First Time Speaker")
    
    # 3. 10 Sessions Attended (approximation: 10 live_attendance XP events / 50)
    live_attendance_count = xp_breakdown.get('live_attendance', 0) / 50
    if live_attendance_count >= 10:
        if await award_badge_to_user(user_id, "10_sessions"):
            badges_awarded.append("10 Sessions Attended")
    
    # 4. 100 Hours in Club (6000 minutes)
    listening_minutes = xp_breakdown.get('listening_time', 0)
    if listening_minutes >= 6000:
        if await award_badge_to_user(user_id, "100_hours"):
            badges_awarded.append("100 Hours in Club")
    
    # 5. Active Hand Raiser (50+ hand raises)
    if voice_stats.get('hand_raise_count', 0) >= 50:
        if await award_badge_to_user(user_id, "active_raiser"):
            badges_awarded.append("Active Hand Raiser")
    
    # 6. Community Supporter (25+ supports given)
    supports_given = await db.speech_support.count_documents({"supporter_id": user_id})
    if supports_given >= 25:
        if await award_badge_to_user(user_id, "supporter"):
            badges_awarded.append("Community Supporter")
    
    if badges_awarded:
        logger.info(f"Auto-awarded badges to {user['name']}: {badges_awarded}")
    
    return badges_awarded


@router.post("/users/{user_id}/badges")
async def award_badge_manual(
    user_id: str,
    badge_key: str,
    admin_id: str
):
    """
    Manually award badge to user (Admin/Owner only)
    
    Query params: ?badge_key=xxx&admin_id=xxx
    
    Badge keys:
    - Participation: early_member, 10_sessions, first_speaker, 100_hours
    - Contribution: insightful_speaker, community_helper, moderator_trusted, signal_provider
    - Authority: core_member, verified_expert, club_council, long_term_holder
    """
    # Check permission
    if not await check_admin_permission(admin_id):
        raise HTTPException(status_code=403, detail="Only admins or owner can award badges")
    
    # Check badge exists
    if badge_key not in ALL_BADGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid badge key. Available: {', '.join(ALL_BADGES.keys())}"
        )
    
    # Check user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already has badge
    if await user_has_badge(user_id, ALL_BADGES[badge_key]['name']):
        raise HTTPException(status_code=400, detail="User already has this badge")
    
    # Award badge
    admin = await db.users.find_one({"id": admin_id})
    success = await award_badge_to_user(user_id, badge_key, awarded_by=admin['name'])
    
    if success:
        badge_info = ALL_BADGES[badge_key]
        return {
            "message": f"Badge '{badge_info['name']}' awarded successfully",
            "badge": {
                "name": badge_info['name'],
                "description": badge_info['description'],
                "type": badge_info['type'],
                "icon": badge_info.get('icon')
            },
            "user": {
                "id": user['id'],
                "name": user['name']
            }
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to award badge")


@router.get("/users/{user_id}/badges")
async def get_user_badges(user_id: str):
    """
    Get all badges for a user
    Auto-creates user if not found
    """
    user = await db.users.find_one({"id": user_id})
    
    # If user not found, return empty badges (user will be created by /xp/progress endpoint)
    if not user:
        return {
            "user_id": user_id,
            "user_name": f"User {user_id[:8]}",
            "total_badges": 0,
            "badges": {
                "participation": [],
                "contribution": [],
                "authority": []
            },
            "all_badges": []
        }
    
    raw_badges = user.get('badges', [])
    
    # Convert badge to full object format
    def normalize_badge(badge):
        if isinstance(badge, str):
            # It's a badge key like "participation" or "first_speaker"
            if badge in ALL_BADGES:
                info = ALL_BADGES[badge]
                return {
                    "key": badge,
                    "type": info['type'],
                    "name": info['name'],
                    "description": info['description'],
                    "icon": info.get('icon', '🏅')
                }
            else:
                # Unknown badge key, try to determine type from string
                return {
                    "key": badge,
                    "type": badge if badge in ['participation', 'contribution', 'authority'] else 'participation',
                    "name": badge.replace('_', ' ').title(),
                    "description": f"{badge.replace('_', ' ').title()} badge",
                    "icon": "🏅"
                }
        elif isinstance(badge, dict):
            # Already in object format, ensure all fields exist
            return {
                "key": badge.get('key', badge.get('name', 'unknown').lower().replace(' ', '_')),
                "type": badge.get('type', 'participation'),
                "name": badge.get('name', 'Unknown Badge'),
                "description": badge.get('description', ''),
                "icon": badge.get('icon', '🏅')
            }
        return None
    
    # Normalize all badges
    badges = [normalize_badge(b) for b in raw_badges if normalize_badge(b)]
    
    # Group by type
    participation_badges = [b for b in badges if b['type'] == 'participation']
    contribution_badges = [b for b in badges if b['type'] == 'contribution']
    authority_badges = [b for b in badges if b['type'] == 'authority']
    
    return {
        "user_id": user_id,
        "user_name": user['name'],
        "total_badges": len(badges),
        "badges": {
            "participation": participation_badges,
            "contribution": contribution_badges,
            "authority": authority_badges
        },
        "all_badges": badges
    }


@router.get("/badges/available")
async def get_available_badges():
    """
    Get list of all available badges
    """
    return {
        "participation_badges": [
            {
                "key": key,
                "name": info['name'],
                "description": info['description'],
                "icon": info.get('icon'),
                "type": info['type']
            }
            for key, info in PARTICIPATION_BADGES.items()
        ],
        "contribution_badges": [
            {
                "key": key,
                "name": info['name'],
                "description": info['description'],
                "icon": info.get('icon'),
                "type": info['type']
            }
            for key, info in CONTRIBUTION_BADGES.items()
        ],
        "authority_badges": [
            {
                "key": key,
                "name": info['name'],
                "description": info['description'],
                "icon": info.get('icon'),
                "type": info['type']
            }
            for key, info in AUTHORITY_BADGES.items()
        ],
        "total": len(ALL_BADGES)
    }


@router.delete("/users/{user_id}/badges/{badge_name}")
async def remove_badge(
    user_id: str,
    badge_name: str,
    admin_id: str
):
    """
    Remove badge from user (Admin/Owner only)
    
    Query param: ?admin_id=xxx
    """
    # Check permission
    if not await check_admin_permission(admin_id):
        raise HTTPException(status_code=403, detail="Only admins or owner can remove badges")
    
    # Check user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has badge
    if not await user_has_badge(user_id, badge_name):
        raise HTTPException(status_code=404, detail="User doesn't have this badge")
    
    # Remove badge
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"badges": {"name": badge_name}}}
    )
    
    return {
        "message": f"Badge '{badge_name}' removed successfully",
        "user_id": user_id,
        "user_name": user['name']
    }


@router.post("/users/{user_id}/badges/check-auto-award")
async def check_auto_award_badges(user_id: str):
    """
    Manually trigger auto-award check for user
    Useful for testing or retroactive badge awards
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    badges_awarded = await check_and_award_participation_badges(user_id)
    
    return {
        "message": "Auto-award check completed",
        "user_id": user_id,
        "user_name": user['name'],
        "badges_awarded": badges_awarded if badges_awarded else [],
        "total_awarded": len(badges_awarded) if badges_awarded else 0
    }


@router.get("/badges/leaderboard")
async def get_badge_leaderboard(limit: int = 50):
    """
    Get users with most badges
    
    Query param: limit (default 50)
    """
    # Aggregate: count badges for each user
    pipeline = [
        {
            "$addFields": {
                "badge_count": {"$size": {"$ifNull": ["$badges", []]}}
            }
        },
        {"$match": {"badge_count": {"$gt": 0}}},
        {"$sort": {"badge_count": -1}},
        {"$limit": limit},
        {
            "$project": {
                "id": 1,
                "name": 1,
                "username": 1,
                "avatar": 1,
                "role": 1,
                "level": 1,
                "badge_count": 1,
                "badges": 1
            }
        }
    ]
    
    users = await db.users.aggregate(pipeline).to_list(length=limit)
    
    # Format response
    leaderboard = []
    for idx, user in enumerate(users):
        user.pop('_id', None)
        
        # Group badges by type - handle both string and dict formats
        badges = user.get('badges', [])
        
        def get_badge_type_safe(badge):
            if isinstance(badge, str):
                return badge
            elif isinstance(badge, dict):
                return badge.get('type')
            return None
        
        badge_breakdown = {
            "participation": len([b for b in badges if get_badge_type_safe(b) == 'participation']),
            "contribution": len([b for b in badges if get_badge_type_safe(b) == 'contribution']),
            "authority": len([b for b in badges if get_badge_type_safe(b) == 'authority'])
        }
        
        leaderboard.append({
            "rank": idx + 1,
            "user_id": user['id'],
            "name": user['name'],
            "username": user['username'],
            "avatar": user.get('avatar'),
            "role": user.get('role'),
            "level": user.get('level'),
            "total_badges": user['badge_count'],
            "badge_breakdown": badge_breakdown
        })
    
    return {
        "leaderboard": leaderboard,
        "total": len(leaderboard)
    }
