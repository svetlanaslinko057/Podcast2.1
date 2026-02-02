"""
Admin Panel Routes
Simple admin panel for configuring owner and admin wallets
NO authentication required - direct access for private club
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


class WalletConfig(BaseModel):
    owner_wallet: str
    admin_wallets: List[str]


@router.get("/settings")
async def get_admin_settings():
    """
    Get current wallet configuration
    """
    settings = await db.club_settings.find_one({})
    if not settings:
        return {
            "owner_wallet": "",
            "admin_wallets": []
        }
    
    return {
        "owner_wallet": settings.get("owner_wallet", ""),
        "admin_wallets": settings.get("admin_wallets", [])
    }


async def ensure_user_with_badges(wallet: str, role: str):
    """
    Create or update user with all badges for admin/owner
    """
    # All 14 badges
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
    
    from datetime import datetime, timezone
    
    existing = await db.users.find_one({"id": wallet})
    
    if existing:
        # Update existing user with role and all badges
        await db.users.update_one(
            {"id": wallet},
            {
                "$set": {
                    "role": role,
                    "badges": ALL_BADGES,
                    "level": 5,
                    "xp_total": 10000,
                    "xp_breakdown": {
                        "listening_time": 3000,
                        "live_attendance": 2500,
                        "hand_raises": 500,
                        "speeches_given": 1000,
                        "support_received": 500
                    }
                }
            }
        )
    else:
        # Create new user with all badges
        import uuid
        new_user = {
            "id": wallet,
            "name": f"{role.title()} {wallet[:8]}",
            "username": f"{role}_{wallet[:8]}",
            "wallet_address": wallet,
            "role": role,
            "level": 5,
            "xp_total": 10000,
            "badges": ALL_BADGES,
            "xp_breakdown": {
                "listening_time": 3000,
                "live_attendance": 2500,
                "hand_raises": 500,
                "speeches_given": 1000,
                "support_received": 500
            },
            "voice_stats": {
                "total_listen_time": 6000,
                "total_speeches": 50,
                "hand_raise_count": 100,
                "support_given": 200,
                "support_received": 150
            },
            "joined_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)


@router.post("/settings")
async def update_admin_settings(config: WalletConfig):
    """
    Update wallet configuration - NO AUTH REQUIRED
    Direct save for private club management
    Auto-creates users with all 14 badges for admins/owner
    """
    # Validate wallet addresses (basic check)
    if config.owner_wallet and not config.owner_wallet.startswith("0x"):
        raise HTTPException(status_code=400, detail="Invalid owner wallet address. Must start with 0x")
    
    for wallet in config.admin_wallets:
        if wallet and not wallet.startswith("0x"):
            raise HTTPException(status_code=400, detail=f"Invalid admin wallet address: {wallet}")
    
    # Filter empty wallets
    clean_admin_wallets = [w.lower() for w in config.admin_wallets if w and w.startswith("0x")]
    owner_wallet_clean = config.owner_wallet.lower() if config.owner_wallet else ""
    
    # Create/update users with all badges
    if owner_wallet_clean:
        await ensure_user_with_badges(owner_wallet_clean, "owner")
    
    for admin_wallet in clean_admin_wallets:
        await ensure_user_with_badges(admin_wallet, "admin")
    
    # Update settings
    await db.club_settings.update_one(
        {},
        {
            "$set": {
                "owner_wallet": owner_wallet_clean,
                "admin_wallets": clean_admin_wallets
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Настройки сохранены! Все бейджи выданы.",
        "owner_wallet": owner_wallet_clean,
        "admin_wallets": clean_admin_wallets
    }


@router.get("/check-role/{wallet_address}")
async def check_wallet_role(wallet_address: str):
    """
    Check role for a wallet address
    """
    wallet = wallet_address.lower()
    
    settings = await db.club_settings.find_one({})
    if not settings:
        return {"role": "member", "is_admin": False, "is_owner": False}
    
    owner_wallet = settings.get("owner_wallet", "").lower()
    admin_wallets = [w.lower() for w in settings.get("admin_wallets", [])]
    
    is_owner = wallet == owner_wallet if owner_wallet else False
    is_admin = wallet in admin_wallets
    
    if is_owner:
        role = "owner"
    elif is_admin:
        role = "admin"
    else:
        role = "member"
    
    return {
        "role": role,
        "is_admin": is_admin or is_owner,
        "is_owner": is_owner
    }
