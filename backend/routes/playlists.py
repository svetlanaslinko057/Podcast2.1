"""
Playlist Routes - API for managing user playlists
"""
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4

router = APIRouter(prefix="/playlists", tags=["playlists"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


# ========== Playlist CRUD ==========

@router.post("")
async def create_playlist(data: dict):
    """Create a new playlist"""
    db = await get_db()
    
    user_id = data.get("user_id")
    name = data.get("name")
    description = data.get("description")
    is_public = data.get("is_public", True)
    podcast_ids = data.get("podcast_ids", [])
    
    if not user_id or not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id and name are required"
        )
    
    playlist = {
        "id": str(uuid4()),
        "user_id": user_id,
        "name": name,
        "description": description,
        "is_public": is_public,
        "podcast_ids": podcast_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.playlists.insert_one(playlist)
    
    # Return without _id
    if "_id" in playlist:
        del playlist["_id"]
    return playlist


@router.get("")
async def get_all_playlists(
    limit: int = 50,
    skip: int = 0,
    is_public: Optional[bool] = None
):
    """Get all public playlists"""
    db = await get_db()
    
    query = {}
    if is_public is not None:
        query["is_public"] = is_public
    else:
        query["is_public"] = True  # Default to public only
    
    playlists = await db.playlists.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with podcast data
    for playlist in playlists:
        if playlist.get("podcast_ids"):
            podcasts = await db.podcasts.find(
                {"id": {"$in": playlist["podcast_ids"]}},
                {"_id": 0, "id": 1, "title": 1, "cover_image": 1, "duration": 1}
            ).to_list(length=100)
            playlist["podcasts"] = podcasts
    
    return playlists


@router.get("/user/{user_id}")
async def get_user_playlists(user_id: str):
    """Get all playlists for a specific user"""
    db = await get_db()
    
    playlists = await db.playlists.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    # Enrich with podcast data
    for playlist in playlists:
        if playlist.get("podcast_ids"):
            podcasts = await db.podcasts.find(
                {"id": {"$in": playlist["podcast_ids"]}},
                {"_id": 0, "id": 1, "title": 1, "cover_image": 1, "duration": 1, "author_id": 1}
            ).to_list(length=100)
            playlist["podcasts"] = podcasts
    
    return playlists


@router.get("/{playlist_id}")
async def get_playlist(playlist_id: str):
    """Get a specific playlist by ID"""
    db = await get_db()
    
    playlist = await db.playlists.find_one(
        {"id": playlist_id},
        {"_id": 0}
    )
    
    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found"
        )
    
    # Enrich with full podcast data
    if playlist.get("podcast_ids"):
        podcasts = await db.podcasts.find(
            {"id": {"$in": playlist["podcast_ids"]}},
            {"_id": 0}
        ).to_list(length=100)
        playlist["podcasts"] = podcasts
    
    return playlist


@router.put("/{playlist_id}")
async def update_playlist(playlist_id: str, data: dict):
    """Update a playlist"""
    db = await get_db()
    
    # Check playlist exists
    existing = await db.playlists.find_one({"id": playlist_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found"
        )
    
    name = data.get("name")
    description = data.get("description")
    is_public = data.get("is_public")
    
    # Build update document
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if is_public is not None:
        update_data["is_public"] = is_public
    
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$set": update_data}
    )
    
    # Return updated playlist
    playlist = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    return playlist


@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: str):
    """Delete a playlist"""
    db = await get_db()
    
    result = await db.playlists.delete_one({"id": playlist_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found"
        )
    
    return {"message": "Playlist deleted", "id": playlist_id}


# ========== Playlist Podcast Management ==========

@router.post("/{playlist_id}/add/{podcast_id}")
async def add_podcast_to_playlist(playlist_id: str, podcast_id: str):
    """Add a podcast to a playlist"""
    db = await get_db()
    
    # Check playlist exists
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found"
        )
    
    # Check podcast exists
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Podcast not found"
        )
    
    # Check if already in playlist
    if podcast_id in playlist.get("podcast_ids", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Podcast already in playlist"
        )
    
    # Add podcast
    await db.playlists.update_one(
        {"id": playlist_id},
        {
            "$push": {"podcast_ids": podcast_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "message": "Podcast added to playlist",
        "playlist_id": playlist_id,
        "podcast_id": podcast_id
    }


@router.delete("/{playlist_id}/remove/{podcast_id}")
async def remove_podcast_from_playlist(playlist_id: str, podcast_id: str):
    """Remove a podcast from a playlist"""
    db = await get_db()
    
    # Check playlist exists
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found"
        )
    
    # Check if podcast is in playlist
    if podcast_id not in playlist.get("podcast_ids", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Podcast not in playlist"
        )
    
    # Remove podcast
    await db.playlists.update_one(
        {"id": playlist_id},
        {
            "$pull": {"podcast_ids": podcast_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "message": "Podcast removed from playlist",
        "playlist_id": playlist_id,
        "podcast_id": podcast_id
    }


# ========== Reorder Podcasts ==========

@router.put("/{playlist_id}/reorder")
async def reorder_playlist(playlist_id: str, podcast_ids: List[str]):
    """Reorder podcasts in a playlist"""
    db = await get_db()
    
    # Check playlist exists
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found"
        )
    
    # Verify all podcast_ids are valid
    existing_ids = set(playlist.get("podcast_ids", []))
    new_ids = set(podcast_ids)
    
    if existing_ids != new_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Podcast IDs must match existing playlist podcasts"
        )
    
    # Update order
    await db.playlists.update_one(
        {"id": playlist_id},
        {
            "$set": {
                "podcast_ids": podcast_ids,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Playlist reordered", "podcast_ids": podcast_ids}
