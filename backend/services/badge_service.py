"""
Badge Service
All badge business logic in one place
"""
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from core.events import EventBus, Events

logger = logging.getLogger(__name__)


# Badge definitions
PARTICIPATION_BADGES = {
    "early_member": {
        "name": "Early Member",
        "description": "Joined in the first 30 days",
        "icon": "🌟",
        "condition": lambda stats: stats.get("days_in_club", 0) <= 30
    },
    "first_speaker": {
        "name": "First Time Speaker",
        "description": "Spoke for the first time in a live session",
        "icon": "🎤",
        "condition": lambda stats: stats.get("total_speeches", 0) >= 1
    },
    "10_sessions": {
        "name": "10 Sessions",
        "description": "Attended 10 live sessions",
        "icon": "🎙️",
        "condition": lambda stats: stats.get("sessions_attended", 0) >= 10
    },
    "active_listener": {
        "name": "Active Listener",
        "description": "Listened to 20+ hours of content",
        "icon": "🎧",
        "condition": lambda stats: stats.get("listening_hours", 0) >= 20
    }
}

CONTRIBUTION_BADGES = {
    "commenter": {
        "name": "Active Commenter",
        "description": "Left 50+ comments",
        "icon": "💬",
        "condition": lambda stats: stats.get("comments_count", 0) >= 50
    },
    "supporter": {
        "name": "Supporter",
        "description": "Gave 100+ likes",
        "icon": "👏",
        "condition": lambda stats: stats.get("likes_given", 0) >= 100
    },
    "content_creator": {
        "name": "Content Creator",
        "description": "Created 5+ podcasts",
        "icon": "🎬",
        "condition": lambda stats: stats.get("podcasts_created", 0) >= 5
    }
}

AUTHORITY_BADGES = {
    "core_member": {
        "name": "Core Member",
        "description": "Reached 5000+ XP",
        "icon": "⭐",
        "condition": lambda stats: stats.get("xp_total", 0) >= 5000
    },
    "host": {
        "name": "Host",
        "description": "Hosted 5+ live sessions",
        "icon": "🌟",
        "condition": lambda stats: stats.get("sessions_hosted", 0) >= 5
    },
    "influencer": {
        "name": "Influencer",
        "description": "Have 100+ followers",
        "icon": "👑",
        "condition": lambda stats: stats.get("followers_count", 0) >= 100
    }
}

ALL_BADGES = {
    **PARTICIPATION_BADGES,
    **CONTRIBUTION_BADGES,
    **AUTHORITY_BADGES
}


class BadgeService:
    """Service for managing user badges"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_user_badges(self, user_id: str) -> Dict[str, Any]:
        """Get all badges for a user"""
        user = await self.db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            return {"user_id": user_id, "badges": [], "total": 0}
        
        badges = user.get("badges", [])
        
        # Categorize badges
        categorized = {
            "participation": [],
            "contribution": [],
            "authority": []
        }
        
        for badge in badges:
            badge_key = badge.get("type") or badge.get("key", "")
            if badge_key in PARTICIPATION_BADGES:
                categorized["participation"].append(badge)
            elif badge_key in CONTRIBUTION_BADGES:
                categorized["contribution"].append(badge)
            elif badge_key in AUTHORITY_BADGES:
                categorized["authority"].append(badge)
        
        return {
            "user_id": user_id,
            "user_name": user.get("name", "Unknown"),
            "total_badges": len(badges),
            "badges": categorized
        }
    
    async def award_badge(self, user_id: str, badge_key: str, awarded_by: str = None) -> Dict[str, Any]:
        """Award a specific badge to user"""
        if badge_key not in ALL_BADGES:
            raise ValueError(f"Unknown badge: {badge_key}")
        
        user = await self.db.users.find_one({"id": user_id})
        if not user:
            raise ValueError(f"User not found: {user_id}")
        
        # Check if already has badge
        existing_badges = user.get("badges", [])
        for badge in existing_badges:
            if badge.get("key") == badge_key or badge.get("type") == badge_key:
                return {"status": "already_awarded", "badge": badge}
        
        # Create new badge
        badge_def = ALL_BADGES[badge_key]
        new_badge = {
            "key": badge_key,
            "type": badge_key,
            "name": badge_def["name"],
            "description": badge_def["description"],
            "icon": badge_def["icon"],
            "awarded_at": datetime.now(timezone.utc).isoformat(),
            "awarded_by": awarded_by,
            "visible": True
        }
        
        # Add to user
        await self.db.users.update_one(
            {"id": user_id},
            {"$push": {"badges": new_badge}}
        )
        
        # Emit event
        await EventBus.emit(Events.BADGE_AWARDED, {
            "user_id": user_id,
            "badge": new_badge
        })
        
        logger.info(f"Awarded badge {badge_key} to user {user_id}")
        
        return {"status": "awarded", "badge": new_badge}
    
    async def check_and_award_auto_badges(self, user_id: str) -> List[Dict]:
        """Check user stats and award any eligible badges"""
        user = await self.db.users.find_one({"id": user_id})
        if not user:
            return []
        
        # Build stats object for condition checking
        stats = {
            "days_in_club": user.get("days_in_club", 0),
            "xp_total": user.get("xp_total", 0),
            "total_speeches": user.get("voice_stats", {}).get("total_speeches", 0),
            "sessions_attended": user.get("sessions_attended", 0),
            "sessions_hosted": user.get("sessions_hosted", 0),
            "listening_hours": user.get("xp_breakdown", {}).get("listening_time", 0) / 60,
            "comments_count": user.get("comments_count", 0),
            "likes_given": user.get("likes_given", 0),
            "podcasts_created": user.get("podcasts_count", 0),
            "followers_count": user.get("followers_count", 0)
        }
        
        # Get existing badge keys
        existing_badges = {b.get("key") or b.get("type") for b in user.get("badges", [])}
        
        # Check all badges
        awarded = []
        for badge_key, badge_def in ALL_BADGES.items():
            if badge_key not in existing_badges:
                try:
                    if badge_def["condition"](stats):
                        result = await self.award_badge(user_id, badge_key, awarded_by="system")
                        if result["status"] == "awarded":
                            awarded.append(result["badge"])
                except Exception as e:
                    logger.error(f"Error checking badge {badge_key}: {e}")
        
        return awarded
    
    async def get_available_badges(self) -> Dict[str, List[Dict]]:
        """Get all available badges definitions"""
        return {
            "participation_badges": [
                {"key": k, **{kk: vv for kk, vv in v.items() if kk != "condition"}}
                for k, v in PARTICIPATION_BADGES.items()
            ],
            "contribution_badges": [
                {"key": k, **{kk: vv for kk, vv in v.items() if kk != "condition"}}
                for k, v in CONTRIBUTION_BADGES.items()
            ],
            "authority_badges": [
                {"key": k, **{kk: vv for kk, vv in v.items() if kk != "condition"}}
                for k, v in AUTHORITY_BADGES.items()
            ],
            "total": len(ALL_BADGES)
        }


# Event handlers for auto badge checking
async def _handle_xp_awarded(data: dict):
    """Check badges when XP is awarded"""
    from core.database import get_db
    user_id = data.get("user_id")
    if user_id:
        service = BadgeService(get_db())
        await service.check_and_award_auto_badges(user_id)


def register_badge_events():
    """Register badge service event handlers"""
    EventBus.subscribe(Events.XP_AWARDED, _handle_xp_awarded)
    EventBus.subscribe(Events.BADGE_CHECK_NEEDED, _handle_xp_awarded)
    logger.info("Badge event handlers registered")
