"""
Advanced Search Routes - Multi-filter podcast search
"""
from fastapi import APIRouter, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/search", tags=["search"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


@router.get("/podcasts")
async def search_podcasts(
    q: Optional[str] = Query(None, description="Search query for title"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    author_id: Optional[str] = Query(None, description="Filter by author"),
    min_duration: Optional[int] = Query(None, description="Minimum duration in seconds"),
    max_duration: Optional[int] = Query(None, description="Maximum duration in seconds"),
    date_from: Optional[str] = Query(None, description="Start date (ISO format)"),
    date_to: Optional[str] = Query(None, description="End date (ISO format)"),
    sort_by: Optional[str] = Query("created_at", description="Sort field: created_at, listens_count, views_count, likes_count"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    visibility: Optional[str] = Query("public", description="Visibility: public, private, all"),
    is_live: Optional[bool] = Query(None, description="Filter live podcasts"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """
    Advanced podcast search with multiple filters
    
    Examples:
    - /search/podcasts?q=tech&tags=programming,ai&sort_by=listens_count
    - /search/podcasts?author_id=123&min_duration=600
    - /search/podcasts?date_from=2024-01-01&sort_by=views_count&sort_order=desc
    """
    db = await get_db()
    
    # Build query
    query = {}
    
    # Title search (case-insensitive)
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    
    # Tags filter
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    
    # Author filter
    if author_id:
        query["author_id"] = author_id
    
    # Duration filter
    duration_query = {}
    if min_duration is not None:
        duration_query["$gte"] = min_duration
    if max_duration is not None:
        duration_query["$lte"] = max_duration
    if duration_query:
        query["duration"] = duration_query
    
    # Date range filter
    date_query = {}
    if date_from:
        try:
            date_query["$gte"] = date_from
        except Exception:
            pass
    if date_to:
        try:
            date_query["$lte"] = date_to
        except Exception:
            pass
    if date_query:
        query["created_at"] = date_query
    
    # Visibility filter
    if visibility and visibility != "all":
        query["visibility"] = visibility
    
    # Live filter
    if is_live is not None:
        query["is_live"] = is_live
    
    # Sort configuration
    sort_field = sort_by if sort_by in ["created_at", "listens_count", "views_count", "likes_count", "duration"] else "created_at"
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Execute query
    podcasts = await db.podcasts.find(
        query, {"_id": 0}
    ).sort(sort_field, sort_direction).skip(skip).limit(limit).to_list(length=limit)
    
    # Get total count for pagination
    total_count = await db.podcasts.count_documents(query)
    
    # Enrich with author data
    author_ids = list(set(p.get("author_id") for p in podcasts if p.get("author_id")))
    authors = {}
    if author_ids:
        author_docs = await db.authors.find(
            {"id": {"$in": author_ids}},
            {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar": 1}
        ).to_list(length=100)
        authors = {a["id"]: a for a in author_docs}
    
    for podcast in podcasts:
        author_id = podcast.get("author_id")
        if author_id and author_id in authors:
            podcast["author"] = authors[author_id]
    
    return {
        "results": podcasts,
        "total": total_count,
        "limit": limit,
        "skip": skip,
        "has_more": skip + len(podcasts) < total_count
    }


@router.get("/authors")
async def search_authors(
    q: Optional[str] = Query(None, description="Search query for name/username"),
    min_followers: Optional[int] = Query(None, description="Minimum followers count"),
    min_podcasts: Optional[int] = Query(None, description="Minimum podcasts count"),
    sort_by: Optional[str] = Query("followers_count", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Search authors/creators"""
    db = await get_db()
    
    query = {}
    
    # Name/username search
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"username": {"$regex": q, "$options": "i"}}
        ]
    
    # Followers filter
    if min_followers is not None:
        query["followers_count"] = {"$gte": min_followers}
    
    # Podcasts count filter
    if min_podcasts is not None:
        query["podcasts_count"] = {"$gte": min_podcasts}
    
    # Sort
    sort_field = sort_by if sort_by in ["followers_count", "podcasts_count", "created_at"] else "followers_count"
    sort_direction = -1 if sort_order == "desc" else 1
    
    authors = await db.authors.find(
        query, {"_id": 0}
    ).sort(sort_field, sort_direction).skip(skip).limit(limit).to_list(length=limit)
    
    total_count = await db.authors.count_documents(query)
    
    return {
        "results": authors,
        "total": total_count,
        "limit": limit,
        "skip": skip,
        "has_more": skip + len(authors) < total_count
    }


@router.get("/tags")
async def get_popular_tags(limit: int = Query(20, ge=1, le=100)):
    """Get popular tags for filtering"""
    db = await get_db()
    
    # Aggregate tags from podcasts
    pipeline = [
        {"$match": {"visibility": "public"}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    result = await db.podcasts.aggregate(pipeline).to_list(length=limit)
    
    tags = [{"tag": r["_id"], "count": r["count"]} for r in result if r["_id"]]
    
    return {"tags": tags}


@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Query for suggestions")
):
    """Get search suggestions based on query"""
    db = await get_db()
    
    suggestions = []
    
    # Search podcast titles
    podcasts = await db.podcasts.find(
        {
            "title": {"$regex": f"^{q}", "$options": "i"},
            "visibility": "public"
        },
        {"_id": 0, "title": 1}
    ).limit(5).to_list(length=5)
    
    for p in podcasts:
        suggestions.append({
            "type": "podcast",
            "text": p["title"]
        })
    
    # Search author names
    authors = await db.authors.find(
        {"name": {"$regex": f"^{q}", "$options": "i"}},
        {"_id": 0, "name": 1, "id": 1}
    ).limit(5).to_list(length=5)
    
    for a in authors:
        suggestions.append({
            "type": "author",
            "text": a["name"],
            "id": a["id"]
        })
    
    # Search tags
    tags_pipeline = [
        {"$unwind": "$tags"},
        {"$match": {"tags": {"$regex": f"^{q}", "$options": "i"}}},
        {"$group": {"_id": "$tags"}},
        {"$limit": 5}
    ]
    
    tag_results = await db.podcasts.aggregate(tags_pipeline).to_list(length=5)
    
    for t in tag_results:
        if t["_id"]:
            suggestions.append({
                "type": "tag",
                "text": t["_id"]
            })
    
    return {"suggestions": suggestions[:10]}


@router.get("/filters")
async def get_available_filters():
    """Get available filter options for UI"""
    db = await get_db()
    
    # Get duration ranges
    duration_stats = await db.podcasts.aggregate([
        {"$match": {"visibility": "public", "duration": {"$exists": True, "$gt": 0}}},
        {
            "$group": {
                "_id": None,
                "min_duration": {"$min": "$duration"},
                "max_duration": {"$max": "$duration"},
                "avg_duration": {"$avg": "$duration"}
            }
        }
    ]).to_list(length=1)
    
    duration_info = duration_stats[0] if duration_stats else {
        "min_duration": 0,
        "max_duration": 7200,
        "avg_duration": 1800
    }
    
    # Get date range
    date_stats = await db.podcasts.aggregate([
        {"$match": {"visibility": "public"}},
        {
            "$group": {
                "_id": None,
                "oldest": {"$min": "$created_at"},
                "newest": {"$max": "$created_at"}
            }
        }
    ]).to_list(length=1)
    
    date_info = date_stats[0] if date_stats else {}
    
    # Get popular tags
    tags = await get_popular_tags(20)
    
    return {
        "duration": {
            "min": duration_info.get("min_duration", 0),
            "max": duration_info.get("max_duration", 7200),
            "avg": int(duration_info.get("avg_duration", 1800)),
            "presets": [
                {"label": "< 15 min", "min": 0, "max": 900},
                {"label": "15-30 min", "min": 900, "max": 1800},
                {"label": "30-60 min", "min": 1800, "max": 3600},
                {"label": "> 60 min", "min": 3600, "max": None}
            ]
        },
        "date": {
            "oldest": date_info.get("oldest"),
            "newest": date_info.get("newest"),
            "presets": [
                {"label": "Today", "days": 1},
                {"label": "This week", "days": 7},
                {"label": "This month", "days": 30},
                {"label": "This year", "days": 365}
            ]
        },
        "sort_options": [
            {"value": "created_at", "label": "Newest"},
            {"value": "listens_count", "label": "Most Listened"},
            {"value": "views_count", "label": "Most Viewed"},
            {"value": "likes_count", "label": "Most Liked"},
            {"value": "duration", "label": "Duration"}
        ],
        "tags": tags["tags"]
    }
