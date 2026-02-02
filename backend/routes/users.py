"""
Users Routes
Private Voice Club - User Management
"""
from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
import logging

from models import User, UserCreate, UserUpdate, UserRoleUpdate

router = APIRouter(tags=["users"])
logger = logging.getLogger(__name__)

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


async def check_admin_permission(user_id: str) -> bool:
    """Check if user is admin or owner"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return False
    return user.get("role") in ["admin", "owner"]


@router.get("/users")
async def get_users(
    role: Optional[str] = None,
    level: Optional[int] = None,
    limit: int = 100,
    skip: int = 0
):
    """
    Get all users (club members)
    
    Query params:
    - role: Filter by role (owner, admin, moderator, speaker, member, listener)
    - level: Filter by level (1-5)
    - limit: Max results (default 100)
    - skip: Skip results (pagination)
    """
    query = {}
    
    if role:
        query["role"] = role
    if level:
        query["level"] = level
    
    users = await db.users.find(query).skip(skip).limit(limit).to_list(length=limit)
    
    # Remove _id for JSON serialization
    for user in users:
        user.pop('_id', None)
    
    return users


@router.get("/users/{user_id}")
async def get_user(user_id: str):
    """
    Get user by ID
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.pop('_id', None)
    return user


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    data: UserUpdate
):
    """
    Update user profile
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        return user
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": user_id})
    updated_user.pop('_id', None)
    
    return updated_user


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    data: UserRoleUpdate,
    admin_id: str
):
    """
    Update user role (Admin/Owner only)
    
    Query param: ?admin_id=xxx
    """
    # Check permission
    if not await check_admin_permission(admin_id):
        raise HTTPException(status_code=403, detail="Only admins or owner can change roles")
    
    # Validate role
    valid_roles = ["listener", "member", "speaker", "moderator", "admin"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    # Check user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow changing owner role
    if user.get("role") == "owner":
        raise HTTPException(status_code=403, detail="Cannot change owner role")
    
    # Update role
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": data.role}}
    )
    
    admin = await db.users.find_one({"id": admin_id})
    logger.info(f"Admin {admin['name']} changed role of {user['name']} to {data.role}")
    
    return {
        "message": f"Role updated to {data.role}",
        "user_id": user_id,
        "new_role": data.role
    }


@router.get("/users/search")
async def search_users(
    q: str = Query(..., min_length=1),
    limit: int = 20
):
    """
    Search users by name or username
    
    Query param: ?q=search_term
    """
    # Search by name or username (case-insensitive)
    query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"username": {"$regex": q, "$options": "i"}}
        ]
    }
    
    users = await db.users.find(query).limit(limit).to_list(length=limit)
    
    # Remove _id
    for user in users:
        user.pop('_id', None)
    
    return {
        "query": q,
        "results": users,
        "total": len(users)
    }
