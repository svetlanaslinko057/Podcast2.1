"""
Club Management Routes
Private Voice Club - Club Settings & Admin Management
"""
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import List, Optional
import os

from models import (
    ClubSettings,
    ClubSettingsCreate,
    ClubSettingsUpdate,
    User
)

router = APIRouter(tags=["club"])

# Database dependency - will be set by server.py
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


# Helper: Check if user is Owner
async def check_owner_permission(user_id: str) -> bool:
    """Check if user is club owner"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return False
    return user.get("role") == "owner"


# Helper: Check if user is Admin or Owner
async def check_admin_permission(user_id: str) -> bool:
    """Check if user is admin or owner"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return False
    return user.get("role") in ["admin", "owner"]


@router.post("/club/initialize")
async def initialize_club(data: ClubSettingsCreate):
    """
    Initialize club for the first time
    Only call this once!
    """
    # Check if club already exists
    existing_club = await db.club_settings.find_one({})
    if existing_club:
        raise HTTPException(status_code=400, detail="Club already initialized")
    
    # Find user with this wallet to make them Owner
    user = await db.users.find_one({"wallet_address": data.club_owner_wallet})
    if not user:
        raise HTTPException(status_code=404, detail="Owner wallet not found in users")
    
    # Create club settings
    club = ClubSettings(
        club_name=data.club_name,
        club_description=data.club_description,
        club_owner_wallet=data.club_owner_wallet,
        club_admin_wallets=[],
        max_members=data.max_members,
        registration_mode=data.registration_mode
    )
    
    await db.club_settings.insert_one(club.model_dump())
    
    # Update user role to owner
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"role": "owner"}}
    )
    
    return {
        "message": "Club initialized successfully",
        "club": club.model_dump(),
        "owner": {
            "id": user['id'],
            "name": user['name'],
            "wallet": user['wallet_address']
        }
    }


@router.get("/club/settings")
async def get_club_settings():
    """
    Get club settings
    Public endpoint - anyone can see club info
    """
    club = await db.club_settings.find_one({})
    if not club:
        raise HTTPException(status_code=404, detail="Club not initialized")
    
    # Remove _id for JSON serialization
    club.pop('_id', None)
    
    return club


@router.put("/club/settings")
async def update_club_settings(
    data: ClubSettingsUpdate,
    owner_id: str
):
    """
    Update club settings
    Only Owner can update
    
    Query param: ?owner_id=xxx
    """
    # Check permission
    if not await check_owner_permission(owner_id):
        raise HTTPException(status_code=403, detail="Only club owner can update settings")
    
    club = await db.club_settings.find_one({})
    if not club:
        raise HTTPException(status_code=404, detail="Club not initialized")
    
    # Prepare update data
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    # Update
    await db.club_settings.update_one(
        {},
        {"$set": update_data}
    )
    
    # Get updated club
    updated_club = await db.club_settings.find_one({})
    updated_club.pop('_id', None)
    
    return updated_club


@router.post("/club/admins")
async def add_admin(
    user_id: str,
    owner_id: str
):
    """
    Add user as Admin
    Only Owner can add admins
    
    Query params: ?user_id=xxx&owner_id=xxx
    """
    # Check permission
    if not await check_owner_permission(owner_id):
        raise HTTPException(status_code=403, detail="Only club owner can add admins")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already admin or owner
    if user.get('role') in ['admin', 'owner']:
        raise HTTPException(status_code=400, detail="User is already admin or owner")
    
    # Update user role to admin
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": "admin"}}
    )
    
    # Add to club admin list
    club = await db.club_settings.find_one({})
    if user.get('wallet_address') and user['wallet_address'] not in club.get('club_admin_wallets', []):
        await db.club_settings.update_one(
            {},
            {
                "$push": {"club_admin_wallets": user['wallet_address']},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    return {
        "message": f"User {user['name']} is now an Admin",
        "user": {
            "id": user['id'],
            "name": user['name'],
            "role": "admin"
        }
    }


@router.delete("/club/admins/{user_id}")
async def remove_admin(
    user_id: str,
    owner_id: str
):
    """
    Remove Admin role
    Only Owner can remove admins
    
    Query param: ?owner_id=xxx
    """
    # Check permission
    if not await check_owner_permission(owner_id):
        raise HTTPException(status_code=403, detail="Only club owner can remove admins")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if actually admin
    if user.get('role') != 'admin':
        raise HTTPException(status_code=400, detail="User is not an admin")
    
    # Downgrade role to member
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": "member"}}
    )
    
    # Remove from club admin list
    if user.get('wallet_address'):
        await db.club_settings.update_one(
            {},
            {
                "$pull": {"club_admin_wallets": user['wallet_address']},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    return {
        "message": f"User {user['name']} is no longer an Admin",
        "user": {
            "id": user['id'],
            "name": user['name'],
            "role": "member"
        }
    }


@router.get("/club/stats")
async def get_club_stats():
    """
    Get club statistics
    Public endpoint
    """
    # Total members
    total_members = await db.users.count_documents({})
    
    # Members by role
    roles_pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    roles_data = await db.users.aggregate(roles_pipeline).to_list(length=None)
    roles_count = {item['_id']: item['count'] for item in roles_data}
    
    # Members by level
    levels_pipeline = [
        {"$group": {"_id": "$level", "count": {"$sum": 1}}}
    ]
    levels_data = await db.users.aggregate(levels_pipeline).to_list(length=None)
    levels_count = {item['_id']: item['count'] for item in levels_data}
    
    # Total XP earned
    total_xp_pipeline = [
        {"$group": {"_id": None, "total_xp": {"$sum": "$xp_total"}}}
    ]
    total_xp_data = await db.users.aggregate(total_xp_pipeline).to_list(length=None)
    total_xp = total_xp_data[0]['total_xp'] if total_xp_data else 0
    
    # Total speeches
    total_speeches = await db.hand_raise_events.count_documents({"status": "approved"})
    
    # Total badges awarded
    badges_pipeline = [
        {"$unwind": "$badges"},
        {"$count": "total"}
    ]
    badges_data = await db.users.aggregate(badges_pipeline).to_list(length=None)
    total_badges = badges_data[0]['total'] if badges_data else 0
    
    return {
        "total_members": total_members,
        "roles": roles_count,
        "levels": levels_count,
        "total_xp_earned": total_xp,
        "total_speeches": total_speeches,
        "total_badges_awarded": total_badges
    }


@router.get("/club/admins")
async def get_admins():
    """
    Get list of club admins
    Public endpoint
    """
    admins = await db.users.find({"role": {"$in": ["admin", "owner"]}}).to_list(length=None)
    
    # Format response
    result = []
    for admin in admins:
        admin.pop('_id', None)
        result.append({
            "id": admin['id'],
            "name": admin['name'],
            "username": admin['username'],
            "avatar": admin.get('avatar'),
            "role": admin['role'],
            "level": admin.get('level', 1),
            "joined_at": admin.get('joined_at')
        })
    
    return {"admins": result}
