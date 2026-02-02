"""
AI-Powered Features for Podcasts
Auto Summary, Quotes Extraction, Highlights Detection
"""
from fastapi import APIRouter, HTTPException, Form
from fastapi.responses import JSONResponse
from bson import ObjectId
import httpx
import os
import logging
import json
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Shared database reference
db = None

def set_db(database):
    global db
    db = database


async def find_podcast_by_id(podcast_id: str):
    """Helper to find podcast by UUID id or ObjectId"""
    podcasts_collection = db['podcasts']
    # Try finding by UUID id first
    podcast = await podcasts_collection.find_one({"id": podcast_id})
    if not podcast:
        try:
            podcast = await podcasts_collection.find_one({"_id": ObjectId(podcast_id)})
        except Exception:
            pass
    return podcast


async def update_podcast_by_id(podcast_id: str, update_data: dict):
    """Helper to update podcast by UUID id or ObjectId"""
    podcasts_collection = db['podcasts']
    # Try updating by UUID id first
    result = await podcasts_collection.update_one(
        {"id": podcast_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        try:
            result = await podcasts_collection.update_one(
                {"_id": ObjectId(podcast_id)},
                {"$set": update_data}
            )
        except Exception:
            pass
    return result


async def call_gpt4(prompt: str, system_prompt: str = None, model: str = "gpt-4o-mini"):
    """Helper function to call GPT-4"""
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': prompt})
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            'https://api.openai.com/v1/chat/completions',
            json={
                'model': model,
                'messages': messages,
                'temperature': 0.7,
            },
            headers={'Authorization': f'Bearer {api_key}'}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"GPT-4 API error: {response.text}"
            )
        
        result = response.json()
        return result['choices'][0]['message']['content']


# ============= AUTO SUMMARY =============

@router.post("/podcast/{podcast_id}/summary")
async def generate_summary(podcast_id: str, force_regenerate: bool = Form(False)):
    """
    Generate AI summary of podcast
    Returns: 2-3 paragraph summary of the episode
    """
    try:
        podcast = await find_podcast_by_id(podcast_id)
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        # Check if summary already exists
        if podcast.get('ai_summary') and not force_regenerate:
            return {
                "summary": podcast['ai_summary'],
                "cached": True
            }
        
        # Need transcript
        transcript = podcast.get('transcript')
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail="Podcast must be transcribed first. Use /api/transcribe/podcast/{id} endpoint."
            )
        
        logger.info(f"🤖 Generating summary for podcast {podcast_id}...")
        
        # Prepare prompt
        prompt = f"""Summarize this podcast episode in 2-3 engaging paragraphs.
Make it interesting and highlight the key takeaways.

Title: {podcast.get('title', 'Untitled')}
Author: {podcast.get('author', {}).get('name', 'Unknown')}

Transcript:
{transcript[:8000]}  # First 8000 chars

Write a compelling summary that would make someone want to listen."""
        
        system_prompt = "You are a podcast summarizer. Write engaging, concise summaries that capture the essence of the episode."
        
        summary = await call_gpt4(prompt, system_prompt)
        
        # Save to database
        await update_podcast_by_id(podcast_id, {"ai_summary": summary})
        
        logger.info(f"✅ Summary generated: {len(summary)} characters")
        
        return {
            "summary": summary,
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summary generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= QUOTES EXTRACTOR =============

@router.post("/podcast/{podcast_id}/quotes")
async def extract_quotes(podcast_id: str, count: int = Form(5), force_regenerate: bool = Form(False)):
    """
    Extract shareable quotes from podcast
    Returns: List of impactful, shareable quotes
    """
    try:
        podcast = await find_podcast_by_id(podcast_id)
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        # Check if quotes already exist
        if podcast.get('ai_quotes') and not force_regenerate:
            return {
                "quotes": podcast['ai_quotes'][:count],
                "cached": True
            }
        
        # Need transcript
        transcript = podcast.get('transcript')
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail="Podcast must be transcribed first"
            )
        
        logger.info(f"💬 Extracting quotes from podcast {podcast_id}...")
        
        # Prepare prompt
        prompt = f"""Extract {count} impactful, shareable quotes from this podcast transcript.

Rules:
- Each quote should be 1-2 sentences
- Must be self-contained and understandable without context
- Should be inspiring, insightful, or thought-provoking
- Perfect for sharing on Twitter/Telegram
- Return ONLY the quotes, one per line
- No numbering, no extra text

Podcast: {podcast.get('title', 'Untitled')}
Author: {podcast.get('author', {}).get('name', 'Unknown')}

Transcript:
{transcript[:10000]}

Extract the {count} best quotes:"""
        
        system_prompt = "You are a quote extractor. Find the most impactful, shareable quotes from podcasts."
        
        quotes_text = await call_gpt4(prompt, system_prompt)
        
        # Parse quotes (one per line)
        quotes = [q.strip() for q in quotes_text.split('\n') if q.strip() and not q.strip().startswith('#')]
        quotes = [q for q in quotes if len(q) > 20]  # Filter out very short lines
        
        # Save to database
        await update_podcast_by_id(podcast_id, {"ai_quotes": quotes})
        
        logger.info(f"✅ Extracted {len(quotes)} quotes")
        
        return {
            "quotes": quotes[:count],
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quote extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= AI HIGHLIGHTS =============

@router.post("/podcast/{podcast_id}/highlights")
async def detect_highlights(podcast_id: str, count: int = Form(3), force_regenerate: bool = Form(False)):
    """
    Detect best moments/highlights in podcast
    Returns: List of timestamps with descriptions
    """
    try:
        podcast = await find_podcast_by_id(podcast_id)
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        # Check if highlights already exist
        if podcast.get('ai_highlights') and not force_regenerate:
            return {
                "highlights": podcast['ai_highlights'][:count],
                "cached": True
            }
        
        # Need transcript with timestamps
        transcript = podcast.get('transcript')
        timestamps = podcast.get('transcript_timestamps', [])
        
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail="Podcast must be transcribed first"
            )
        
        logger.info(f"✨ Detecting highlights in podcast {podcast_id}...")
        
        # Prepare transcript with timestamps for analysis
        transcript_with_time = ""
        if timestamps:
            # Sample every ~10th segment to keep prompt size manageable
            sample_timestamps = timestamps[::max(1, len(timestamps)//50)]
            for segment in sample_timestamps[:50]:  # Max 50 segments
                start_min = int(segment['start']) // 60
                start_sec = int(segment['start']) % 60
                transcript_with_time += f"[{start_min}:{start_sec:02d}] {segment['text']}\n"
        else:
            # No timestamps, use plain transcript
            transcript_with_time = transcript[:8000]
        
        # Prepare prompt
        prompt = f"""Analyze this podcast and identify the {count} BEST moments/highlights.

For each highlight:
1. Find the most engaging, insightful, or entertaining moments
2. Provide the timestamp (in seconds from start)
3. Give it a catchy title (5-8 words)
4. Explain why it's a highlight (1 sentence)

Podcast: {podcast.get('title', 'Untitled')}
Duration: {podcast.get('duration', 0)} seconds

Transcript with timestamps:
{transcript_with_time}

Return ONLY valid JSON array:
[
  {{
    "start_time": 125,
    "end_time": 185,
    "title": "Amazing insight about creativity",
    "description": "The host explains a breakthrough method",
    "reason": "Key insight + practical advice"
  }}
]

Focus on moments that are:
- Surprising insights or revelations
- Emotional or funny moments
- Practical tips or actionable advice
- Controversial or thought-provoking statements"""
        
        system_prompt = "You are a podcast highlight detector. Find the most engaging moments. Return ONLY valid JSON."
        
        # Use JSON mode for structured output
        async with httpx.AsyncClient(timeout=120.0) as client:
            api_key = os.getenv('OPENAI_API_KEY')
            response = await client.post(
                'https://api.openai.com/v1/chat/completions',
                json={
                    'model': 'gpt-4o-mini',
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': prompt}
                    ],
                    'response_format': {'type': 'json_object'},
                    'temperature': 0.7,
                },
                headers={'Authorization': f'Bearer {api_key}'}
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"GPT-4 API error: {response.text}"
                )
            
            result = response.json()
            highlights_text = result['choices'][0]['message']['content']
        
        # Parse JSON
        try:
            highlights_data = json.loads(highlights_text)
            if isinstance(highlights_data, dict):
                highlights = highlights_data.get('highlights', [])
            else:
                highlights = highlights_data
        except json.JSONDecodeError:
            # Fallback: try to extract JSON from text
            import re
            json_match = re.search(r'\[.*\]', highlights_text, re.DOTALL)
            if json_match:
                highlights = json.loads(json_match.group(0))
            else:
                highlights = []
        
        # Validate and clean highlights
        valid_highlights = []
        for h in highlights[:count]:
            if isinstance(h, dict) and 'start_time' in h and 'title' in h:
                # Ensure end_time exists
                if 'end_time' not in h:
                    h['end_time'] = h['start_time'] + 60  # Default 60 seconds
                valid_highlights.append(h)
        
        # Save to database
        await update_podcast_by_id(podcast_id, {"ai_highlights": valid_highlights})
        
        logger.info(f"✅ Detected {len(valid_highlights)} highlights")
        
        return {
            "highlights": valid_highlights,
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Highlight detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= GET ALL AI DATA =============

@router.get("/podcast/{podcast_id}/all")
async def get_all_ai_data(podcast_id: str):
    """Get all AI-generated data for a podcast"""
    try:
        podcast = await find_podcast_by_id(podcast_id)
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        return {
            "has_transcript": bool(podcast.get('transcript')),
            "has_summary": bool(podcast.get('ai_summary')),
            "has_quotes": bool(podcast.get('ai_quotes')),
            "has_highlights": bool(podcast.get('ai_highlights')),
            "summary": podcast.get('ai_summary'),
            "quotes": podcast.get('ai_quotes', []),
            "highlights": podcast.get('ai_highlights', [])
        }
        
    except Exception as e:
        logger.error(f"Failed to get AI data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
