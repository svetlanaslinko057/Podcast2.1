"""
Analytics Routes - Advanced podcast analytics and tracking
"""
from fastapi import APIRouter, HTTPException, Form
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Simple in-memory cache
analytics_cache = {}
CACHE_TTL = 300  # 5 minutes


async def get_db():
    """Get database instance"""
    from server import db
    return db


def get_cache_key(podcast_id: str, endpoint: str) -> str:
    """Generate cache key"""
    return f"{endpoint}:{podcast_id}"


def get_cached_data(cache_key: str):
    """Get cached data if not expired"""
    if cache_key in analytics_cache:
        cached_item = analytics_cache[cache_key]
        if datetime.now(timezone.utc).timestamp() - cached_item['timestamp'] < CACHE_TTL:
            return cached_item['data']
    return None


def set_cache_data(cache_key: str, data):
    """Set cache data"""
    analytics_cache[cache_key] = {
        'data': data,
        'timestamp': datetime.now(timezone.utc).timestamp()
    }


@router.get("/podcast/{podcast_id}/retention")
async def get_podcast_retention(podcast_id: str):
    """Get retention analytics for a podcast"""
    # Check cache first
    cache_key = get_cache_key(podcast_id, 'retention')
    cached = get_cached_data(cache_key)
    if cached:
        return cached
    
    db = await get_db()
    
    # Check if podcast exists
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Get all listening sessions for this podcast
    sessions = await db.listening_sessions.find(
        {"podcast_id": podcast_id}
    ).to_list(10000)
    
    if not sessions:
        return {
            "podcast_id": podcast_id,
            "total_sessions": 0,
            "retention": {
                "0-25%": 0,
                "25-50%": 0,
                "50-75%": 0,
                "75-100%": 0,
                "100%": 0
            },
            "retention_curve": [],
            "average_completion_rate": 0,
            "drop_off_points": []
        }
    
    duration = podcast.get("duration", 0)
    if duration == 0:
        duration = 1800  # Default 30 min
    
    # Calculate retention buckets
    retention = {
        "0-25%": 0,
        "25-50%": 0,
        "50-75%": 0,
        "75-100%": 0,
        "100%": 0
    }
    
    completion_rates = []
    drop_offs = {}  # minute -> count
    
    for session in sessions:
        progress = session.get("last_position", 0)
        completion = (progress / duration * 100) if duration > 0 else 0
        completion_rates.append(completion)
        
        # Bucket by completion percentage
        if completion >= 100:
            retention["100%"] += 1
        elif completion >= 75:
            retention["75-100%"] += 1
        elif completion >= 50:
            retention["50-75%"] += 1
        elif completion >= 25:
            retention["25-50%"] += 1
        else:
            retention["0-25%"] += 1
        
        # Track drop-off points (rounded to minute)
        if completion < 100:
            drop_minute = int(progress / 60)
            drop_offs[drop_minute] = drop_offs.get(drop_minute, 0) + 1
    
    # Calculate average completion rate
    avg_completion = sum(completion_rates) / len(completion_rates) if completion_rates else 0
    
    # Format drop-off points (sorted by minute for timeline visualization)
    drop_off_points = [
        {"minute": minute, "count": count}
        for minute, count in sorted(drop_offs.items())
    ]
    
    # Calculate minute-by-minute retention curve
    retention_curve = []
    total_sessions_count = len(sessions)
    for minute in range(0, int(duration / 60) + 1, 1):
        listeners_at_minute = sum(
            1 for s in sessions 
            if s.get("last_position", 0) >= minute * 60
        )
        retention_curve.append({
            "minute": minute,
            "listeners": listeners_at_minute,
            "percentage": round((listeners_at_minute / total_sessions_count * 100) if total_sessions_count > 0 else 0, 1)
        })
    
    result = {
        "podcast_id": podcast_id,
        "total_sessions": total_sessions_count,
        "retention": retention,
        "retention_curve": retention_curve,
        "average_completion_rate": round(avg_completion, 2),
        "drop_off_points": drop_off_points[:10]  # Top 10 drop-off points
    }
    
    set_cache_data(cache_key, result)
    return result


@router.get("/podcast/{podcast_id}/engagement")
async def get_podcast_engagement(podcast_id: str):
    """Get engagement analytics for a podcast"""
    # Check cache
    cache_key = get_cache_key(podcast_id, 'engagement')
    cached = get_cached_data(cache_key)
    if cached:
        return cached
    
    db = await get_db()
    
    # Check if podcast exists
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Get comments
    comments = await db.comments.find({"podcast_id": podcast_id}).to_list(10000)
    
    # Calculate live vs post-live listeners
    is_live = podcast.get("is_live", False)
    live_started_at = podcast.get("live_started_at")
    
    # Get listening sessions
    sessions = await db.listening_sessions.find({"podcast_id": podcast_id}).to_list(10000)
    
    live_sessions = 0
    post_live_sessions = 0
    
    if live_started_at:
        live_cutoff = datetime.fromisoformat(live_started_at.replace('Z', '+00:00'))
        for session in sessions:
            session_start = session.get("started_at")
            if isinstance(session_start, str):
                session_time = datetime.fromisoformat(session_start.replace('Z', '+00:00'))
                if session_time < live_cutoff + timedelta(hours=2):  # 2 hours for live
                    live_sessions += 1
                else:
                    post_live_sessions += 1
            else:
                post_live_sessions += 1
    else:
        post_live_sessions = len(sessions)
    
    # Count comments during/after live
    comments_during_live = 0
    comments_after_live = 0
    
    if live_started_at:
        live_cutoff = datetime.fromisoformat(live_started_at.replace('Z', '+00:00'))
        for comment in comments:
            comment_time = comment.get("created_at")
            if isinstance(comment_time, str):
                comment_dt = datetime.fromisoformat(comment_time.replace('Z', '+00:00'))
                if comment_dt < live_cutoff + timedelta(hours=2):
                    comments_during_live += 1
                else:
                    comments_after_live += 1
            else:
                comments_after_live += 1
    else:
        comments_after_live = len(comments)
    
    # Count reactions
    reactions_during = {"fire": 0, "heart": 0, "like": 0, "mind_blown": 0, "clap": 0}
    reactions_after = {"fire": 0, "heart": 0, "like": 0, "mind_blown": 0, "clap": 0}
    
    for comment in comments:
        reactions = comment.get("reactions", {})
        is_during = False
        
        if live_started_at:
            comment_time = comment.get("created_at")
            if isinstance(comment_time, str):
                comment_dt = datetime.fromisoformat(comment_time.replace('Z', '+00:00'))
                live_cutoff = datetime.fromisoformat(live_started_at.replace('Z', '+00:00'))
                is_during = comment_dt < live_cutoff + timedelta(hours=2)
        
        target = reactions_during if is_during else reactions_after
        for r_type, count in reactions.items():
            if r_type in target:
                target[r_type] += count
    
    result = {
        "podcast_id": podcast_id,
        "is_live": is_live,
        "live_listeners": live_sessions,
        "post_live_listeners": post_live_sessions,
        "total_listeners": len(sessions),
        "comments": {
            "during_live": comments_during_live,
            "after_live": comments_after_live,
            "total": len(comments)
        },
        "reactions": {
            "during_live": reactions_during,
            "after_live": reactions_after
        }
    }
    
    set_cache_data(cache_key, result)
    return result


@router.get("/podcast/{podcast_id}/timeline")
async def get_podcast_timeline(podcast_id: str, interval: str = "hour"):
    """Get timeline data for podcast (listens over time)"""
    db = await get_db()
    
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    sessions = await db.listening_sessions.find({"podcast_id": podcast_id}).to_list(10000)
    
    # Group by time interval
    timeline = {}
    
    for session in sessions:
        started_at = session.get("started_at")
        if isinstance(started_at, str):
            dt = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
            
            if interval == "hour":
                key = dt.strftime("%Y-%m-%d %H:00")
            elif interval == "day":
                key = dt.strftime("%Y-%m-%d")
            else:
                key = dt.strftime("%Y-%m-%d %H:00")
            
            timeline[key] = timeline.get(key, 0) + 1
    
    # Convert to list
    timeline_data = [
        {"timestamp": ts, "listens": count}
        for ts, count in sorted(timeline.items())
    ]
    
    return {
        "podcast_id": podcast_id,
        "interval": interval,
        "data": timeline_data
    }


@router.post("/podcasts/{podcast_id}/progress")
async def track_listening_progress(
    podcast_id: str,
    user_id: str = Form(...),
    current_position: int = Form(...),
    duration: Optional[int] = Form(None)
):
    """Track user's listening progress (with batch optimization)"""
    db = await get_db()
    
    # Check if podcast exists
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Find or create listening session
    session = await db.listening_sessions.find_one({
        "podcast_id": podcast_id,
        "user_id": user_id
    })
    
    # Determine if this is a significant update (every 30 seconds or 5%)
    should_increment_listens = False
    
    if session:
        last_position = session.get("last_position", 0)
        time_diff = current_position - last_position
        
        # Only update if at least 30 seconds passed or 5% progress
        if time_diff >= 30 or (current_position / max(duration or podcast.get("duration", 1), 1)) >= 0.05:
            # Update existing session
            await db.listening_sessions.update_one(
                {"_id": session["_id"]},
                {
                    "$set": {
                        "last_position": current_position,
                        "updated_at": now,
                        "completed": current_position >= (duration or podcast.get("duration", 0)) * 0.95
                    }
                }
            )
    else:
        # Create new session
        session_id = str(uuid.uuid4())
        await db.listening_sessions.insert_one({
            "id": session_id,
            "podcast_id": podcast_id,
            "user_id": user_id,
            "started_at": now,
            "last_position": current_position,
            "updated_at": now,
            "completed": False
        })
        should_increment_listens = True
    
    # Batch update: Only increment listens for new sessions
    if should_increment_listens:
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$inc": {"listens_count": 1}}
        )
        
        # Clear cache for this podcast
        cache_key_retention = get_cache_key(podcast_id, 'retention')
        cache_key_engagement = get_cache_key(podcast_id, 'engagement')
        if cache_key_retention in analytics_cache:
            del analytics_cache[cache_key_retention]
        if cache_key_engagement in analytics_cache:
            del analytics_cache[cache_key_engagement]
    
    return {"message": "Progress tracked", "position": current_position}


@router.delete("/cache/{podcast_id}")
async def clear_analytics_cache(podcast_id: str):
    """Clear analytics cache for a podcast"""
    cleared = []
    for endpoint in ['retention', 'engagement', 'timeline']:
        cache_key = get_cache_key(podcast_id, endpoint)
        if cache_key in analytics_cache:
            del analytics_cache[cache_key]
            cleared.append(endpoint)
    
    return {
        "message": "Cache cleared",
        "podcast_id": podcast_id,
        "cleared": cleared
    }
