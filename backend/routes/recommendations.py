"""
Recommendations Routes
Similar podcasts by tags, guests, and other criteria
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


@router.get("/similar-by-tags/{podcast_id}")
async def get_similar_by_tags(
    podcast_id: str,
    limit: int = Query(6, ge=1, le=20)
):
    """
    Get similar podcasts based on shared tags
    Returns podcasts that share the most tags with the given podcast
    """
    db = await get_db()
    
    # Get the source podcast
    podcast = await db.podcasts.find_one({"id": podcast_id}, {"_id": 0})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    tags = podcast.get('tags', [])
    if not tags:
        # If no tags, return popular podcasts instead
        popular = await db.podcasts.find(
            {"id": {"$ne": podcast_id}},
            {"_id": 0}
        ).sort("play_count", -1).limit(limit).to_list(limit)
        
        return {
            "source_podcast_id": podcast_id,
            "source_tags": [],
            "recommendations": popular,
            "match_type": "popular"
        }
    
    # Find podcasts with matching tags using aggregation
    pipeline = [
        # Exclude the source podcast
        {"$match": {"id": {"$ne": podcast_id}, "tags": {"$exists": True, "$ne": []}}},
        # Add field for number of matching tags
        {"$addFields": {
            "matching_tags": {
                "$setIntersection": ["$tags", tags]
            }
        }},
        {"$addFields": {
            "match_count": {"$size": {"$ifNull": ["$matching_tags", []]}}
        }},
        # Filter only podcasts with at least 1 matching tag
        {"$match": {"match_count": {"$gt": 0}}},
        # Sort by match count (most matches first), then by play_count
        {"$sort": {"match_count": -1, "play_count": -1}},
        # Limit results
        {"$limit": limit},
        # Exclude MongoDB _id
        {"$project": {"_id": 0}}
    ]
    
    similar = await db.podcasts.aggregate(pipeline).to_list(limit)
    
    # Get author info for each recommendation
    for pod in similar:
        if pod.get('author_id'):
            author = await db.authors.find_one(
                {"id": pod['author_id']},
                {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar_url": 1}
            )
            pod['author'] = author
    
    return {
        "source_podcast_id": podcast_id,
        "source_tags": tags,
        "recommendations": similar,
        "match_type": "tags"
    }


@router.get("/by-guest/{guest_id}")
async def get_podcasts_by_guest(
    guest_id: str,
    exclude_podcast_id: Optional[str] = None,
    limit: int = Query(6, ge=1, le=20)
):
    """
    Get other podcasts featuring the same guest
    """
    db = await get_db()
    
    # Get all podcast IDs where this guest appears
    guest_appearances = await db.guests.find(
        {"id": guest_id},
        {"_id": 0, "podcast_id": 1}
    ).to_list(100)
    
    if not guest_appearances:
        return {
            "guest_id": guest_id,
            "recommendations": [],
            "total_appearances": 0
        }
    
    podcast_ids = [g['podcast_id'] for g in guest_appearances]
    
    # Exclude the current podcast if specified
    if exclude_podcast_id and exclude_podcast_id in podcast_ids:
        podcast_ids.remove(exclude_podcast_id)
    
    # Get podcast details
    podcasts = await db.podcasts.find(
        {"id": {"$in": podcast_ids}},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get guest info
    guest = await db.guests.find_one({"id": guest_id}, {"_id": 0})
    
    # Get author info for each podcast
    for pod in podcasts:
        if pod.get('author_id'):
            author = await db.authors.find_one(
                {"id": pod['author_id']},
                {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar_url": 1}
            )
            pod['author'] = author
    
    return {
        "guest_id": guest_id,
        "guest": guest,
        "recommendations": podcasts,
        "total_appearances": len(guest_appearances)
    }


@router.get("/by-author/{author_id}")
async def get_more_from_author(
    author_id: str,
    exclude_podcast_id: Optional[str] = None,
    limit: int = Query(6, ge=1, le=20)
):
    """
    Get more podcasts from the same author
    """
    db = await get_db()
    
    query = {"author_id": author_id}
    if exclude_podcast_id:
        query["id"] = {"$ne": exclude_podcast_id}
    
    podcasts = await db.podcasts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get author info
    author = await db.authors.find_one(
        {"id": author_id},
        {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar_url": 1}
    )
    
    return {
        "author_id": author_id,
        "author": author,
        "recommendations": podcasts
    }


@router.get("/trending")
async def get_trending_podcasts(
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = None
):
    """
    Get trending podcasts based on recent engagement
    """
    db = await get_db()
    
    query = {}
    if category:
        query["tags"] = category
    
    # Sort by a combination of recent plays and engagement
    podcasts = await db.podcasts.find(
        query,
        {"_id": 0}
    ).sort([("play_count", -1), ("reactions_count", -1)]).limit(limit).to_list(limit)
    
    # Get author info
    for pod in podcasts:
        if pod.get('author_id'):
            author = await db.authors.find_one(
                {"id": pod['author_id']},
                {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar_url": 1}
            )
            pod['author'] = author
    
    return {
        "category": category,
        "recommendations": podcasts
    }


@router.get("/for-you/{user_id}")
async def get_personalized_recommendations(
    user_id: str,
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get personalized recommendations based on user's listening history and preferences
    """
    db = await get_db()
    
    # Get user's recently listened podcasts
    recent_plays = await db.listening_sessions.find(
        {"user_id": user_id},
        {"_id": 0, "podcast_id": 1}
    ).sort("started_at", -1).limit(20).to_list(20)
    
    listened_ids = [p['podcast_id'] for p in recent_plays]
    
    # Get tags from listened podcasts
    listened_podcasts = await db.podcasts.find(
        {"id": {"$in": listened_ids}},
        {"_id": 0, "tags": 1}
    ).to_list(20)
    
    # Collect all tags
    all_tags = []
    for pod in listened_podcasts:
        all_tags.extend(pod.get('tags', []))
    
    if not all_tags:
        # No listening history, return trending
        return await get_trending_podcasts(limit=limit)
    
    # Count tag frequency
    tag_counts = {}
    for tag in all_tags:
        tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # Get top tags
    top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    preferred_tags = [t[0] for t in top_tags]
    
    # Find podcasts with these tags that user hasn't listened to
    pipeline = [
        {"$match": {
            "id": {"$nin": listened_ids},
            "tags": {"$in": preferred_tags}
        }},
        {"$addFields": {
            "matching_tags": {"$setIntersection": ["$tags", preferred_tags]},
        }},
        {"$addFields": {
            "relevance_score": {"$size": {"$ifNull": ["$matching_tags", []]}}
        }},
        {"$sort": {"relevance_score": -1, "play_count": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0}}
    ]
    
    recommendations = await db.podcasts.aggregate(pipeline).to_list(limit)
    
    # Get author info
    for pod in recommendations:
        if pod.get('author_id'):
            author = await db.authors.find_one(
                {"id": pod['author_id']},
                {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar_url": 1}
            )
            pod['author'] = author
    
    return {
        "user_id": user_id,
        "preferred_tags": preferred_tags,
        "recommendations": recommendations
    }
