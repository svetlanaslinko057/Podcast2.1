"""
Club Management Routes
Handles private club members and access control
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
from database import get_database as get_db

router = APIRouter(prefix="/club", tags=["club"])


class AddMemberRequest(BaseModel):
    user_id: str
    access_level: str = "full"  # full, limited, preview


class UpdateMemberRequest(BaseModel):
    access_level: str


# ============ Club Members ============

@router.get("/{author_id}/members")
async def get_club_members(author_id: str):
    """Get all club members for an author"""
    db = await get_db()
    
    members = await db.club_members.find(
        {"author_id": author_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Enrich with user data
    enriched_members = []
    for member in members:
        user = await db.authors.find_one({"id": member["user_id"]}, {"_id": 0})
        enriched_members.append({
            **member,
            "username": user.get("username") or user.get("name") if user else None,
            "avatar": user.get("avatar") if user else None
        })
    
    return enriched_members


@router.post("/{author_id}/members")
async def add_club_member(author_id: str, request: AddMemberRequest):
    """Add a member to the private club"""
    db = await get_db()
    
    # Check if already a member
    existing = await db.club_members.find_one({
        "author_id": author_id,
        "user_id": request.user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a club member")
    
    member = {
        "id": str(uuid4()),
        "author_id": author_id,
        "user_id": request.user_id,
        "access_level": request.access_level,
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "invited_by": author_id
    }
    
    await db.club_members.insert_one(member)
    
    return {"success": True, "member": {k: v for k, v in member.items() if k != "_id"}}


@router.put("/{author_id}/members/{user_id}")
async def update_club_member(author_id: str, user_id: str, request: UpdateMemberRequest):
    """Update a club member's access level"""
    db = await get_db()
    
    result = await db.club_members.update_one(
        {"author_id": author_id, "user_id": user_id},
        {"$set": {
            "access_level": request.access_level,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {"success": True}


@router.delete("/{author_id}/members/{user_id}")
async def remove_club_member(author_id: str, user_id: str):
    """Remove a member from the private club"""
    db = await get_db()
    
    result = await db.club_members.delete_one({
        "author_id": author_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {"success": True}


# ============ Club Requests ============

@router.get("/{author_id}/requests")
async def get_club_requests(author_id: str, status: str = "pending"):
    """Get pending requests to join the club"""
    db = await get_db()
    
    query = {"author_id": author_id}
    if status != "all":
        query["status"] = status
    
    requests = await db.club_requests.find(
        query,
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with user data
    enriched_requests = []
    for req in requests:
        user = await db.authors.find_one({"id": req["user_id"]}, {"_id": 0})
        enriched_requests.append({
            **req,
            "username": user.get("username") or user.get("name") if user else None,
            "avatar": user.get("avatar") if user else None
        })
    
    return enriched_requests


@router.post("/{author_id}/requests")
async def create_club_request(author_id: str, user_id: str, message: str = ""):
    """Request to join a private club"""
    db = await get_db()
    
    # Check if already a member
    existing_member = await db.club_members.find_one({
        "author_id": author_id,
        "user_id": user_id
    })
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a club member")
    
    # Check for existing pending request
    existing_request = await db.club_requests.find_one({
        "author_id": author_id,
        "user_id": user_id,
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(status_code=400, detail="Request already pending")
    
    request_doc = {
        "id": str(uuid4()),
        "author_id": author_id,
        "user_id": user_id,
        "message": message,
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.club_requests.insert_one(request_doc)
    
    return {"success": True, "request_id": request_doc["id"]}


@router.post("/{author_id}/requests/{request_id}/approve")
async def approve_club_request(author_id: str, request_id: str):
    """Approve a club join request"""
    db = await get_db()
    
    request_doc = await db.club_requests.find_one({
        "id": request_id,
        "author_id": author_id,
        "status": "pending"
    })
    
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    
    # Update request status
    await db.club_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add as club member
    member = {
        "id": str(uuid4()),
        "author_id": author_id,
        "user_id": request_doc["user_id"],
        "access_level": "full",
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "joined_via": "request"
    }
    
    await db.club_members.insert_one(member)
    
    return {"success": True}


@router.post("/{author_id}/requests/{request_id}/reject")
async def reject_club_request(author_id: str, request_id: str):
    """Reject a club join request"""
    db = await get_db()
    
    result = await db.club_requests.update_one(
        {"id": request_id, "author_id": author_id, "status": "pending"},
        {"$set": {
            "status": "rejected",
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    
    return {"success": True}


# ============ Access Check ============

@router.get("/{author_id}/check-access/{user_id}")
async def check_club_access(author_id: str, user_id: str):
    """Check if a user has access to an author's private content"""
    db = await get_db()
    
    member = await db.club_members.find_one({
        "author_id": author_id,
        "user_id": user_id
    })
    
    if member:
        return {
            "has_access": True,
            "access_level": member.get("access_level", "full"),
            "joined_at": member.get("joined_at")
        }
    
    return {
        "has_access": False,
        "access_level": None,
        "joined_at": None
    }
