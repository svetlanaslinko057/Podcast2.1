"""
Private Podcast Access Routes
Manage access control for private podcasts (closed clubs)
"""
from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime, timezone

from models import (
    PodcastAccessList, PodcastAccessMember, PodcastAccessRequest,
    InviteUserRequest, RemoveUserRequest
)

router = APIRouter(prefix="/podcasts", tags=["private-access"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


# ========== Helper Functions ==========

async def get_or_create_access_list(db, podcast_id: str, author_id: str) -> dict:
    """Get existing access list or create new one"""
    access_list = await db.podcast_access_lists.find_one(
        {"podcast_id": podcast_id},
        {"_id": 0}
    )
    
    if not access_list:
        # Create new access list
        new_list = PodcastAccessList(
            podcast_id=podcast_id,
            author_id=author_id,
            members=[]
        )
        doc = new_list.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.podcast_access_lists.insert_one(doc)
        access_list = doc
    
    return access_list


async def has_access(db, podcast_id: str, user_id: str) -> bool:
    """Check if user has access to private podcast"""
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        return False
    
    # Public podcasts are accessible to all
    if podcast.get('visibility') != 'private':
        return True
    
    # Author always has access
    if user_id == podcast.get('author_id'):
        return True
    
    # Check access list
    access_list = await db.podcast_access_lists.find_one(
        {"podcast_id": podcast_id},
        {"_id": 0}
    )
    
    if not access_list:
        return False
    
    # Check if user is in members list
    members = access_list.get('members', [])
    return any(member.get('user_id') == user_id for member in members)


# ========== Access Management Endpoints ==========

@router.post("/{podcast_id}/access/invite")
async def invite_user_to_podcast(
    podcast_id: str,
    request: InviteUserRequest,
    current_user_id: str = None  # TODO: Get from auth
):
    """
    Invite a user to private podcast (author only)
    """
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check if current user is the author
    # TODO: Use proper auth when available
    author_id = podcast.get('author_id')
    if current_user_id and current_user_id != author_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only podcast author can invite users"
        )
    
    # Check if podcast is private
    if podcast.get('visibility') != 'private':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only invite users to private podcasts"
        )
    
    # Get or create access list
    access_list = await get_or_create_access_list(db, podcast_id, author_id)
    
    # Check if user already invited
    members = access_list.get('members', [])
    if any(member.get('user_id') == request.user_id for member in members):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has access to this podcast"
        )
    
    # Check max members limit
    if len(members) >= access_list.get('max_members', 1000):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of members reached"
        )
    
    # Get user/author info for display
    user_info = await db.authors.find_one({"id": request.user_id})
    
    # Create new member
    new_member = PodcastAccessMember(
        user_id=request.user_id,
        username=user_info.get('username') if user_info else None,
        avatar=user_info.get('avatar') if user_info else None,
        invited_by=author_id,
        invited_at=datetime.now(timezone.utc)
    )
    
    member_doc = new_member.model_dump()
    member_doc['invited_at'] = member_doc['invited_at'].isoformat()
    if member_doc.get('last_listened_at'):
        member_doc['last_listened_at'] = member_doc['last_listened_at'].isoformat()
    
    # Add member to access list
    await db.podcast_access_lists.update_one(
        {"podcast_id": podcast_id},
        {
            "$push": {"members": member_doc},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # TODO: Send notification to invited user
    
    return {
        "message": "User invited successfully",
        "user_id": request.user_id,
        "podcast_id": podcast_id
    }


@router.delete("/{podcast_id}/access/remove")
async def remove_user_from_podcast(
    podcast_id: str,
    request: RemoveUserRequest,
    current_user_id: str = None  # TODO: Get from auth
):
    """
    Remove a user from private podcast (author only)
    """
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check if current user is the author
    author_id = podcast.get('author_id')
    if current_user_id and current_user_id != author_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only podcast author can remove users"
        )
    
    # Remove user from access list
    result = await db.podcast_access_lists.update_one(
        {"podcast_id": podcast_id},
        {
            "$pull": {"members": {"user_id": request.user_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in access list"
        )
    
    return {
        "message": "User removed successfully",
        "user_id": request.user_id,
        "podcast_id": podcast_id
    }


@router.get("/{podcast_id}/access/list")
async def get_podcast_access_list(
    podcast_id: str,
    current_user_id: str = None  # TODO: Get from auth
):
    """
    Get list of users with access to private podcast (author only)
    """
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check if current user is the author
    author_id = podcast.get('author_id')
    if current_user_id and current_user_id != author_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only podcast author can view access list"
        )
    
    # Get access list
    access_list = await db.podcast_access_lists.find_one(
        {"podcast_id": podcast_id},
        {"_id": 0}
    )
    
    if not access_list:
        return {
            "podcast_id": podcast_id,
            "members": [],
            "total_members": 0,
            "max_members": 1000
        }
    
    members = access_list.get('members', [])
    
    return {
        "podcast_id": podcast_id,
        "members": members,
        "total_members": len(members),
        "max_members": access_list.get('max_members', 1000)
    }


@router.get("/{podcast_id}/access/check")
async def check_podcast_access(
    podcast_id: str,
    user_id: str
):
    """
    Check if a user has access to a podcast
    Public endpoint - anyone can check
    """
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check access
    access = await has_access(db, podcast_id, user_id)
    
    return {
        "podcast_id": podcast_id,
        "user_id": user_id,
        "has_access": access,
        "visibility": podcast.get('visibility', 'public'),
        "is_author": user_id == podcast.get('author_id')
    }


@router.post("/{podcast_id}/access/request")
async def request_podcast_access(
    podcast_id: str,
    user_id: str,
    message: str = None
):
    """
    Request access to a private podcast
    User can send a request that author can approve/reject
    """
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check if podcast is private
    if podcast.get('visibility') != 'private':
        return {
            "message": "This podcast is public, no access request needed",
            "has_access": True
        }
    
    # Check if already has access
    access = await has_access(db, podcast_id, user_id)
    if access:
        return {
            "message": "You already have access to this podcast",
            "has_access": True
        }
    
    # Check if request already exists
    existing = await db.podcast_access_requests.find_one({
        "podcast_id": podcast_id,
        "user_id": user_id,
        "status": "pending"
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending request for this podcast"
        )
    
    # Get user info
    user_info = await db.authors.find_one({"id": user_id})
    
    # Create access request
    request_obj = PodcastAccessRequest(
        podcast_id=podcast_id,
        user_id=user_id,
        username=user_info.get('username') if user_info else None,
        avatar=user_info.get('avatar') if user_info else None,
        message=message,
        status="pending"
    )
    
    doc = request_obj.model_dump()
    doc['requested_at'] = doc['requested_at'].isoformat()
    if doc.get('reviewed_at'):
        doc['reviewed_at'] = doc['reviewed_at'].isoformat()
    
    await db.podcast_access_requests.insert_one(doc)
    
    # TODO: Send notification to podcast author
    
    return {
        "message": "Access request sent successfully",
        "request_id": doc['id'],
        "status": "pending"
    }


@router.get("/{podcast_id}/access/requests")
async def get_podcast_access_requests(
    podcast_id: str,
    current_user_id: str = None,  # TODO: Get from auth
    status_filter: str = "pending"
):
    """
    Get pending access requests for private podcast (author only)
    """
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check if current user is the author
    author_id = podcast.get('author_id')
    if current_user_id and current_user_id != author_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only podcast author can view access requests"
        )
    
    # Get requests
    query = {"podcast_id": podcast_id}
    if status_filter:
        query["status"] = status_filter
    
    requests = await db.podcast_access_requests.find(
        query,
        {"_id": 0}
    ).sort("requested_at", -1).to_list(length=100)
    
    return {
        "podcast_id": podcast_id,
        "requests": requests,
        "total": len(requests)
    }


@router.post("/{podcast_id}/access/requests/{request_id}/approve")
async def approve_access_request(
    podcast_id: str,
    request_id: str,
    current_user_id: str = None  # TODO: Get from auth
):
    """
    Approve access request and add user to podcast (author only)
    """
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check if current user is the author
    author_id = podcast.get('author_id')
    if current_user_id and current_user_id != author_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only podcast author can approve requests"
        )
    
    # Get request
    access_request = await db.podcast_access_requests.find_one(
        {"id": request_id, "podcast_id": podcast_id}
    )
    
    if not access_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found"
        )
    
    if access_request.get('status') != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request already processed"
        )
    
    # Add user to access list
    user_id = access_request.get('user_id')
    invite_request = InviteUserRequest(user_id=user_id)
    
    try:
        await invite_user_to_podcast(podcast_id, invite_request, author_id)
    except HTTPException as e:
        # User might already be added
        if e.status_code != status.HTTP_400_BAD_REQUEST:
            raise
    
    # Update request status
    await db.podcast_access_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": author_id
            }
        }
    )
    
    return {
        "message": "Access request approved",
        "request_id": request_id,
        "user_id": user_id
    }


@router.post("/{podcast_id}/access/requests/{request_id}/reject")
async def reject_access_request(
    podcast_id: str,
    request_id: str,
    current_user_id: str = None  # TODO: Get from auth
):
    """
    Reject access request (author only)
    """
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check if current user is the author
    author_id = podcast.get('author_id')
    if current_user_id and current_user_id != author_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only podcast author can reject requests"
        )
    
    # Update request status
    result = await db.podcast_access_requests.update_one(
        {"id": request_id, "podcast_id": podcast_id, "status": "pending"},
        {
            "$set": {
                "status": "rejected",
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": author_id
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found or already processed"
        )
    
    return {
        "message": "Access request rejected",
        "request_id": request_id
    }
