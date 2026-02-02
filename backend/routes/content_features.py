"""
Podcast Content Router
Chapters, Guests, Resources, Facts, Transcript Search
"""
from fastapi import APIRouter, Form, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import logging
import uuid
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/content", tags=["content"])

db = None

def set_db(database):
    global db
    db = database


# ============ CHAPTERS / TOPICS ============

@router.post("/podcasts/{podcast_id}/chapters")
async def add_chapter(
    podcast_id: str,
    title: str = Form(...),
    start_time: int = Form(...),
    end_time: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    icon: Optional[str] = Form(None)  # emoji icon
):
    """Add a chapter/topic marker"""
    try:
        chapter = {
            "id": str(uuid.uuid4()),
            "podcast_id": podcast_id,
            "title": title,
            "start_time": start_time,
            "end_time": end_time,
            "description": description,
            "icon": icon or "📍",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db['chapters'].insert_one(chapter)
        chapter.pop('_id', None)
        
        logger.info(f"📑 Chapter added: {title} at {start_time}s")
        return JSONResponse({"message": "Chapter added", "chapter": chapter}, status_code=201)
        
    except Exception as e:
        logger.error(f"Failed to add chapter: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/chapters")
async def get_chapters(podcast_id: str):
    """Get all chapters for a podcast"""
    try:
        chapters = await db['chapters'].find(
            {"podcast_id": podcast_id},
            {"_id": 0}
        ).sort("start_time", 1).to_list(100)
        
        return chapters
        
    except Exception as e:
        logger.error(f"Failed to get chapters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: str):
    """Delete a chapter"""
    try:
        result = await db['chapters'].delete_one({"id": chapter_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Chapter not found")
        return {"message": "Chapter deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ GUESTS ============

@router.post("/podcasts/{podcast_id}/guests")
async def add_guest(
    podcast_id: str,
    name: str = Form(...),
    role: Optional[str] = Form(None),  # "Host", "Guest", "Co-host"
    bio: Optional[str] = Form(None),
    twitter: Optional[str] = Form(None),
    avatar_url: Optional[str] = Form(None),
    company: Optional[str] = Form(None),
    website: Optional[str] = Form(None)
):
    """Add a guest to the episode"""
    try:
        guest = {
            "id": str(uuid.uuid4()),
            "podcast_id": podcast_id,
            "name": name,
            "role": role or "Guest",
            "bio": bio,
            "twitter": twitter,
            "avatar_url": avatar_url,
            "company": company,
            "website": website,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db['guests'].insert_one(guest)
        guest.pop('_id', None)
        
        logger.info(f"👤 Guest added: {name}")
        return JSONResponse({"message": "Guest added", "guest": guest}, status_code=201)
        
    except Exception as e:
        logger.error(f"Failed to add guest: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/guests")
async def get_guests(podcast_id: str):
    """Get all guests for a podcast"""
    try:
        guests = await db['guests'].find(
            {"podcast_id": podcast_id},
            {"_id": 0}
        ).to_list(20)
        
        return guests
        
    except Exception as e:
        logger.error(f"Failed to get guests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ RESOURCES / LINKS ============

@router.post("/podcasts/{podcast_id}/resources")
async def add_resource(
    podcast_id: str,
    title: str = Form(...),
    url: str = Form(...),
    resource_type: Optional[str] = Form(None),  # "article", "tool", "project", "token", "exchange"
    description: Optional[str] = Form(None),
    timestamp: Optional[int] = Form(None),  # when it was mentioned
    icon: Optional[str] = Form(None)
):
    """Add a resource/link mentioned in episode"""
    try:
        resource = {
            "id": str(uuid.uuid4()),
            "podcast_id": podcast_id,
            "title": title,
            "url": url,
            "type": resource_type or "link",
            "description": description,
            "timestamp": timestamp,
            "icon": icon or "🔗",
            "clicks": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db['resources'].insert_one(resource)
        resource.pop('_id', None)
        
        logger.info(f"🔗 Resource added: {title}")
        return JSONResponse({"message": "Resource added", "resource": resource}, status_code=201)
        
    except Exception as e:
        logger.error(f"Failed to add resource: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/resources")
async def get_resources(podcast_id: str):
    """Get all resources for a podcast"""
    try:
        resources = await db['resources'].find(
            {"podcast_id": podcast_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(100)
        
        return resources
        
    except Exception as e:
        logger.error(f"Failed to get resources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resources/{resource_id}/click")
async def track_resource_click(resource_id: str):
    """Track click on resource"""
    try:
        await db['resources'].update_one(
            {"id": resource_id},
            {"$inc": {"clicks": 1}}
        )
        return {"message": "Click tracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ FACT CHECK / NOTES ============

@router.post("/podcasts/{podcast_id}/facts")
async def add_fact(
    podcast_id: str,
    text: str = Form(...),
    source: Optional[str] = Form(None),
    source_url: Optional[str] = Form(None),
    timestamp: Optional[int] = Form(None),
    fact_type: Optional[str] = Form(None),  # "fact", "clarification", "correction", "note"
    verified: bool = Form(False)
):
    """Add a fact check or note"""
    try:
        fact = {
            "id": str(uuid.uuid4()),
            "podcast_id": podcast_id,
            "text": text,
            "source": source,
            "source_url": source_url,
            "timestamp": timestamp,
            "type": fact_type or "note",
            "verified": verified,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db['facts'].insert_one(fact)
        fact.pop('_id', None)
        
        logger.info(f"✅ Fact added for podcast {podcast_id}")
        return JSONResponse({"message": "Fact added", "fact": fact}, status_code=201)
        
    except Exception as e:
        logger.error(f"Failed to add fact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/facts")
async def get_facts(podcast_id: str):
    """Get all facts for a podcast"""
    try:
        facts = await db['facts'].find(
            {"podcast_id": podcast_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(100)
        
        return facts
        
    except Exception as e:
        logger.error(f"Failed to get facts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ TRANSCRIPT SEARCH ============

@router.get("/podcasts/{podcast_id}/transcript/search")
async def search_transcript(
    podcast_id: str,
    query: str = Query(..., min_length=2),
    context_words: int = Query(20, ge=5, le=100)
):
    """
    Search transcript for specific terms
    Returns matching segments with timestamps
    Example: "покажи момент где говорили про Binance"
    """
    try:
        # Get podcast with transcript
        podcast = await db['podcasts'].find_one({"id": podcast_id})
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        transcript = podcast.get('transcript', '')
        timestamps = podcast.get('transcript_timestamps', [])
        
        if not transcript:
            return {
                "query": query,
                "matches": [],
                "total_matches": 0,
                "message": "No transcript available"
            }
        
        # Search for matches
        query_lower = query.lower()
        matches = []
        
        # If we have timestamps, search through segments
        if timestamps:
            for segment in timestamps:
                segment_text = segment.get('text', '')
                if query_lower in segment_text.lower():
                    matches.append({
                        "text": segment_text,
                        "timestamp": segment.get('start', 0),
                        "end_time": segment.get('end', 0),
                        "formatted_time": format_timestamp(segment.get('start', 0))
                    })
        else:
            # Search in full transcript text
            words = transcript.split()
            total_words = len(words)
            
            for i, word in enumerate(words):
                if query_lower in word.lower():
                    # Get context around the match
                    start_idx = max(0, i - context_words)
                    end_idx = min(total_words, i + context_words)
                    context = ' '.join(words[start_idx:end_idx])
                    
                    # Estimate timestamp based on position
                    duration = podcast.get('duration', 0)
                    if duration > 0:
                        estimated_time = int((i / total_words) * duration)
                    else:
                        estimated_time = 0
                    
                    matches.append({
                        "text": context,
                        "timestamp": estimated_time,
                        "formatted_time": format_timestamp(estimated_time),
                        "word_position": i
                    })
        
        # Remove duplicates (same timestamp)
        seen_times = set()
        unique_matches = []
        for m in matches:
            time_bucket = m['timestamp'] // 10  # 10-second buckets
            if time_bucket not in seen_times:
                seen_times.add(time_bucket)
                unique_matches.append(m)
        
        return {
            "query": query,
            "matches": unique_matches[:20],  # Max 20 results
            "total_matches": len(unique_matches),
            "has_timestamps": bool(timestamps)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcript search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def format_timestamp(seconds):
    """Format seconds to MM:SS"""
    if not seconds:
        return "0:00"
    mins = int(seconds) // 60
    secs = int(seconds) % 60
    return f"{mins}:{secs:02d}"


# ============ TAGS MANAGEMENT ============

@router.post("/podcasts/{podcast_id}/tags")
async def update_tags(
    podcast_id: str,
    tags: str = Form(...)  # comma-separated
):
    """Update podcast tags"""
    try:
        tag_list = [t.strip() for t in tags.split(',') if t.strip()]
        
        # Categorize tags
        categorized = categorize_tags(tag_list)
        
        await db['podcasts'].update_one(
            {"id": podcast_id},
            {"$set": {
                "tags": tag_list,
                "categorized_tags": categorized
            }}
        )
        
        return {"message": "Tags updated", "tags": tag_list, "categorized": categorized}
        
    except Exception as e:
        logger.error(f"Failed to update tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def categorize_tags(tags):
    """Categorize tags into topics, projects, tokens, people"""
    # Known patterns for categorization
    token_patterns = ['btc', 'eth', 'sol', 'bnb', 'xrp', 'ada', 'dot', 'usdt', 'usdc', 'doge']
    exchange_patterns = ['binance', 'coinbase', 'kraken', 'ftx', 'okx', 'bybit', 'kucoin']
    
    categorized = {
        "topics": [],
        "projects": [],
        "tokens": [],
        "people": [],
        "exchanges": [],
        "other": []
    }
    
    for tag in tags:
        tag_lower = tag.lower()
        
        if any(p in tag_lower for p in token_patterns):
            categorized["tokens"].append(tag)
        elif any(p in tag_lower for p in exchange_patterns):
            categorized["exchanges"].append(tag)
        elif tag.startswith('@') or tag.startswith('#'):
            categorized["people"].append(tag)
        elif any(kw in tag_lower for kw in ['defi', 'nft', 'web3', 'crypto', 'blockchain', 'security', 'trading']):
            categorized["topics"].append(tag)
        else:
            categorized["other"].append(tag)
    
    return categorized


# ============ GET ALL CONTENT INFO ============

@router.get("/podcasts/{podcast_id}/all")
async def get_all_content(
    podcast_id: str
):
    """Get all structured content for a podcast"""
    try:
        # Fetch all content in parallel-ish
        chapters = await db['chapters'].find({"podcast_id": podcast_id}, {"_id": 0}).sort("start_time", 1).to_list(100)
        guests = await db['guests'].find({"podcast_id": podcast_id}, {"_id": 0}).to_list(20)
        resources = await db['resources'].find({"podcast_id": podcast_id}, {"_id": 0}).sort("timestamp", 1).to_list(100)
        facts = await db['facts'].find({"podcast_id": podcast_id}, {"_id": 0}).sort("timestamp", 1).to_list(100)
        
        # Get podcast for tags and transcript info
        podcast = await db['podcasts'].find_one({"id": podcast_id})
        
        return {
            "chapters": chapters,
            "guests": guests,
            "resources": resources,
            "facts": facts,
            "tags": podcast.get('tags', []) if podcast else [],
            "categorized_tags": podcast.get('categorized_tags', {}) if podcast else {},
            "has_transcript": bool(podcast.get('transcript')) if podcast else False,
            "transcript_length": len(podcast.get('transcript', '')) if podcast else 0
        }
        
    except Exception as e:
        logger.error(f"Failed to get content: {e}")
        raise HTTPException(status_code=500, detail=str(e))
