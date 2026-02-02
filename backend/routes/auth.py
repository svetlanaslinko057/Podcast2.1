"""
Authentication Routes
Handles wallet login, finding/creating authors by wallet_address
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid

router = APIRouter(tags=["auth"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'fomo_podcasts')]


class WalletLoginRequest(BaseModel):
    wallet_address: str
    signature: Optional[str] = None
    message: Optional[str] = None


class WalletLoginResponse(BaseModel):
    success: bool
    access_token: str
    refresh_token: str
    user: dict


@router.post("/auth/wallet-login")
async def wallet_login(request: WalletLoginRequest):
    """
    Login or register with crypto wallet (MetaMask)
    IMPORTANT: wallet_address is the unique identifier for users
    If author exists with this wallet_address - return existing author
    If not - create new author with this wallet_address
    """
    wallet_address = request.wallet_address.lower()
    
    # Find existing author by wallet_address (case-insensitive)
    # Use regex for case-insensitive match since some wallets might be stored with mixed case
    import re
    existing_author = await db.authors.find_one({
        "wallet_address": {"$regex": f"^{re.escape(wallet_address)}$", "$options": "i"}
    })
    
    if existing_author:
        # Author exists - return existing data
        # Generate simple tokens (in production, use JWT)
        access_token = f"access_{existing_author['id']}_{uuid.uuid4().hex[:16]}"
        refresh_token = f"refresh_{existing_author['id']}_{uuid.uuid4().hex[:16]}"
        
        return {
            "success": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": existing_author["id"],
                "name": existing_author.get("name", ""),
                "username": existing_author.get("username", ""),
                "avatar": existing_author.get("avatar"),
                "wallet_address": existing_author.get("wallet_address"),
                "telegram_username": existing_author.get("telegram_username"),
                "telegram_connected": existing_author.get("telegram_connected", False),
                "rating": existing_author.get("rating", 0),
                "short_bio": existing_author.get("short_bio", ""),
                "bio": existing_author.get("bio", "")
            }
        }
    
    # Create new author with wallet_address
    author_id = str(uuid.uuid4())
    fomo_id = int(uuid.uuid4().int % 1000000)
    
    # Initial name based on wallet
    short_wallet = f"{wallet_address[:6]}...{wallet_address[-4:]}"
    
    new_author = {
        "id": author_id,
        "fomo_id": fomo_id,
        "name": f"User {short_wallet}",
        "username": "",  # Empty until Telegram connected
        "avatar": None,
        "bio": None,
        "short_bio": None,
        "social_links": {
            "twitter": None,
            "discord": None,
            "telegram": None,
            "youtube": None,
            "tiktok": None,
            "website": None
        },
        "wallet_address": wallet_address,
        "telegram_chat_id": None,
        "telegram_username": None,
        "telegram_connected": False,
        "badges": [],
        "labels": [],
        "followers_count": 0,
        "following_count": 0,
        "podcasts_count": 0,
        "total_listens": 0,
        "rating": 0.0,
        "activity_score": 0,
        "referral_code": str(uuid.uuid4())[:8].upper(),
        "referred_by": None,
        "referral_count": 0,
        "clink_count": 0,
        "support_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.authors.insert_one(new_author)
    
    # Generate tokens
    access_token = f"access_{author_id}_{uuid.uuid4().hex[:16]}"
    refresh_token = f"refresh_{author_id}_{uuid.uuid4().hex[:16]}"
    
    return {
        "success": True,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": author_id,
            "name": new_author["name"],
            "username": "",
            "avatar": None,
            "wallet_address": wallet_address,
            "telegram_username": None,
            "telegram_connected": False,
            "rating": 0,
            "short_bio": "",
            "bio": ""
        }
    }


@router.get("/auth/me")
async def get_current_user():
    """Get current user info - returns empty for demo"""
    # In real app, would verify token and return user
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.post("/auth/refresh")
async def refresh_token():
    """Refresh access token"""
    raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/auth/check-wallet/{wallet_address}")
async def check_wallet_exists(wallet_address: str):
    """Check if wallet address already has an author"""
    wallet_lower = wallet_address.lower()
    existing = await db.authors.find_one({"wallet_address": wallet_lower})
    
    if existing:
        return {
            "exists": True,
            "author_id": existing["id"],
            "name": existing.get("name"),
            "telegram_connected": existing.get("telegram_connected", False)
        }
    
    return {"exists": False}
