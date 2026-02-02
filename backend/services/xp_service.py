"""
XP Service
All XP and leveling business logic
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from core.events import EventBus, Events

logger = logging.getLogger(__name__)


# XP Configuration
XP_CONFIG = {
    "listening_minute": 1,
    "podcast_listen": 10,
    "live_attendance": 50,
    "hand_raise": 5,
    "speech_minute": 10,
    "support_received": 2,
    "comment_posted": 3,
    "like_given": 1,
    "podcast_created": 100,
    "session_hosted": 200
}

# Level thresholds
LEVELS = {
    1: {"name": "Observer", "min_xp": 0},
    2: {"name": "Active", "min_xp": 500},
    3: {"name": "Contributor", "min_xp": 2000},
    4: {"name": "Speaker", "min_xp": 5000},
    5: {"name": "Core Voice", "min_xp": 10000}
}


class XPService:
    """Service for managing user XP and levels"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_user_progress(self, user_id: str) -> Dict[str, Any]:
        """Get user's XP progress and level info"""
        user = await self.db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            return {"error": "User not found"}
        
        xp_total = user.get("xp_total", 0)
        current_level = self._calculate_level(xp_total)
        next_level = min(current_level + 1, 5)
        
        xp_for_next = LEVELS[next_level]["min_xp"] - xp_total if next_level > current_level else 0
        progress_percent = self._calculate_progress_percent(xp_total, current_level)
        
        return {
            "user_id": user_id,
            "user_name": user.get("name", "Unknown"),
            "xp_total": xp_total,
            "current_level": current_level,
            "current_level_name": LEVELS[current_level]["name"],
            "next_level": next_level,
            "next_level_name": LEVELS[next_level]["name"],
            "xp_to_next_level": max(0, xp_for_next),
            "progress_percent": progress_percent,
            "xp_breakdown": user.get("xp_breakdown", {}),
            "engagement_score": user.get("engagement_score", 0),
            "priority_score": user.get("priority_score", 0)
        }
    
    async def award_xp(
        self, 
        user_id: str, 
        action: str, 
        amount: int = None,
        metadata: dict = None
    ) -> Dict[str, Any]:
        """Award XP to a user for an action"""
        if amount is None:
            amount = XP_CONFIG.get(action, 0)
        
        if amount <= 0:
            return {"status": "no_xp", "amount": 0}
        
        user = await self.db.users.find_one({"id": user_id})
        if not user:
            return {"status": "user_not_found"}
        
        old_xp = user.get("xp_total", 0)
        old_level = self._calculate_level(old_xp)
        new_xp = old_xp + amount
        new_level = self._calculate_level(new_xp)
        
        # Update user XP
        update_data = {
            "$inc": {
                "xp_total": amount,
                f"xp_breakdown.{action}": amount
            }
        }
        
        # Update level if changed
        if new_level > old_level:
            update_data["$set"] = {"level": new_level}
        
        await self.db.users.update_one({"id": user_id}, update_data)
        
        # Record transaction
        await self.db.xp_transactions.insert_one({
            "user_id": user_id,
            "action": action,
            "amount": amount,
            "old_xp": old_xp,
            "new_xp": new_xp,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc)
        })
        
        # Emit events
        await EventBus.emit(Events.XP_AWARDED, {
            "user_id": user_id,
            "action": action,
            "amount": amount,
            "new_xp": new_xp
        })
        
        if new_level > old_level:
            await EventBus.emit(Events.XP_LEVEL_UP, {
                "user_id": user_id,
                "old_level": old_level,
                "new_level": new_level,
                "level_name": LEVELS[new_level]["name"]
            })
            logger.info(f"User {user_id} leveled up: {old_level} -> {new_level}")
        
        return {
            "status": "success",
            "action": action,
            "amount": amount,
            "old_xp": old_xp,
            "new_xp": new_xp,
            "level_changed": new_level > old_level,
            "new_level": new_level
        }
    
    async def get_leaderboard(self, limit: int = 50) -> list:
        """Get top users by XP"""
        cursor = self.db.users.find(
            {},
            {"_id": 0, "id": 1, "name": 1, "avatar": 1, "xp_total": 1, "level": 1, "badges": 1}
        ).sort("xp_total", -1).limit(limit)
        
        users = await cursor.to_list(length=limit)
        
        for i, user in enumerate(users, 1):
            user["rank"] = i
            user["level"] = self._calculate_level(user.get("xp_total", 0))
            user["badges_count"] = len(user.get("badges", []))
        
        return users
    
    async def update_engagement_score(self, user_id: str) -> float:
        """Recalculate user's engagement score"""
        user = await self.db.users.find_one({"id": user_id})
        if not user:
            return 0
        
        xp_breakdown = user.get("xp_breakdown", {})
        voice_stats = user.get("voice_stats", {})
        
        # Calculate engagement score
        score = 0
        score += xp_breakdown.get("live_attendance", 0) * 0.3
        score += xp_breakdown.get("speeches_given", 0) * 0.25
        score += xp_breakdown.get("listening_time", 0) * 0.2
        score += voice_stats.get("total_speeches", 0) * 10
        score += user.get("comments_count", 0) * 2
        
        # Normalize to 0-100
        engagement_score = min(100, score / 100)
        
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": {"engagement_score": engagement_score}}
        )
        
        return engagement_score
    
    def _calculate_level(self, xp: int) -> int:
        """Calculate level from XP"""
        level = 1
        for lvl, info in LEVELS.items():
            if xp >= info["min_xp"]:
                level = lvl
        return level
    
    def _calculate_progress_percent(self, xp: int, current_level: int) -> int:
        """Calculate progress to next level as percentage"""
        if current_level >= 5:
            return 100
        
        current_min = LEVELS[current_level]["min_xp"]
        next_min = LEVELS[current_level + 1]["min_xp"]
        
        progress = (xp - current_min) / (next_min - current_min) * 100
        return min(100, max(0, int(progress)))


# Convenience function
def get_xp_service(db: AsyncIOMotorDatabase) -> XPService:
    return XPService(db)
