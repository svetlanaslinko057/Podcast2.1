"""
Whisper API Integration for Audio Transcription
Uses OpenAI Whisper API to transcribe podcast audio
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from bson import ObjectId
import httpx
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcribe", tags=["transcribe"])

# Shared database reference
db = None

def set_db(database):
    global db
    db = database


@router.post("/podcast/{podcast_id}")
async def transcribe_podcast(
    podcast_id: str,
    audio_file: Optional[UploadFile] = File(None),
    use_existing: bool = Form(False)
):
    """
    Transcribe podcast audio using Whisper API
    
    Options:
    1. Upload new audio file
    2. Use existing audio from GridFS (use_existing=True)
    """
    try:
        # Get OpenAI API key (use Emergent LLM key or custom)
        api_key = os.getenv('OPENAI_API_KEY') or os.getenv('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="OpenAI API key not configured. Please set OPENAI_API_KEY or EMERGENT_LLM_KEY"
            )
        
        # Download audio if using existing
        audio_data = None
        filename = "podcast.mp3"
        
        if use_existing:
            # Get podcast audio from GridFS
            podcasts_collection = db['podcasts']
            podcast = await podcasts_collection.find_one({"_id": ObjectId(podcast_id)})
            
            if not podcast or not podcast.get('audio_file_id'):
                raise HTTPException(status_code=404, detail="Podcast audio not found")
            
            # TODO: Download from GridFS
            # For now, return error if no file uploaded
            raise HTTPException(status_code=400, detail="Please upload audio file directly for now")
        
        elif audio_file:
            audio_data = await audio_file.read()
            filename = audio_file.filename or "podcast.mp3"
        else:
            raise HTTPException(status_code=400, detail="Please provide audio file")
        
        # Call Whisper API
        logger.info(f"🎤 Transcribing podcast {podcast_id} using Whisper API...")
        
        async with httpx.AsyncClient(timeout=300.0) as client:  # 5 min timeout
            files = {
                'file': (filename, audio_data, 'audio/mpeg'),
            }
            data = {
                'model': 'whisper-1',
                'response_format': 'verbose_json',  # Get timestamps
                'language': 'en'  # or auto-detect
            }
            headers = {
                'Authorization': f'Bearer {api_key}'
            }
            
            response = await client.post(
                'https://api.openai.com/v1/audio/transcriptions',
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"Whisper API error: {error_detail}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Whisper API error: {error_detail}"
                )
            
            result = response.json()
        
        # Extract transcript and timestamps
        transcript = result.get('text', '')
        segments = result.get('segments', [])
        
        # Format timestamps for storage
        transcript_timestamps = [
            {
                'start': segment['start'],
                'end': segment['end'],
                'text': segment['text']
            }
            for segment in segments
        ]
        
        # Save to database
        podcasts_collection = db['podcasts']
        await podcasts_collection.update_one(
            {"_id": ObjectId(podcast_id)},
            {
                "$set": {
                    "transcript": transcript,
                    "transcript_timestamps": transcript_timestamps,
                    "transcribed_at": None  # MongoDB will set timestamp
                }
            }
        )
        
        logger.info(f"✅ Transcription complete: {len(transcript)} characters, {len(segments)} segments")
        
        return JSONResponse({
            "message": "Transcription complete",
            "transcript": transcript,
            "segments_count": len(segments),
            "character_count": len(transcript)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcast/{podcast_id}/status")
async def get_transcription_status(podcast_id: str):
    """Check if podcast has been transcribed"""
    try:
        podcasts_collection = db['podcasts']
        podcast = await podcasts_collection.find_one(
            {"_id": ObjectId(podcast_id)},
            {"transcript": 1, "transcript_timestamps": 1, "transcribed_at": 1}
        )
        
        if not podcast:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        has_transcript = bool(podcast.get('transcript'))
        
        return {
            "has_transcript": has_transcript,
            "character_count": len(podcast.get('transcript', '')),
            "segments_count": len(podcast.get('transcript_timestamps', [])),
            "transcribed_at": podcast.get('transcribed_at')
        }
        
    except Exception as e:
        logger.error(f"Failed to get transcription status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/podcast/{podcast_id}/generate-chapters")
async def generate_chapters_from_transcript(podcast_id: str):
    """
    Generate chapters automatically using AI analysis of transcript
    Requires transcript to be available
    """
    try:
        # Get podcast transcript
        podcasts_collection = db['podcasts']
        podcast = await podcasts_collection.find_one(
            {"_id": ObjectId(podcast_id)},
            {"transcript": 1, "transcript_timestamps": 1, "title": 1}
        )
        
        if not podcast or not podcast.get('transcript'):
            raise HTTPException(
                status_code=400, 
                detail="Podcast must be transcribed first"
            )
        
        transcript = podcast['transcript']
        timestamps = podcast.get('transcript_timestamps', [])
        
        # Get API key
        api_key = os.getenv('OPENAI_API_KEY') or os.getenv('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured"
            )
        
        # Call GPT to generate chapters
        logger.info(f"🤖 Generating chapters for podcast {podcast_id}...")
        
        prompt = f"""Analyze this podcast transcript and create 5-7 chapters with timestamps.

Podcast: {podcast.get('title', 'Untitled')}

Transcript:
{transcript[:4000]}  # First 4000 chars

Return JSON format:
[
  {{
    "title": "Introduction",
    "start_time": 0,
    "end_time": 180,
    "description": "Brief description"
  }}
]

Make sure start_time and end_time are in seconds."""
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                'https://api.openai.com/v1/chat/completions',
                json={
                    'model': 'gpt-4o-mini',  # Cost-effective
                    'messages': [
                        {'role': 'system', 'content': 'You are a podcast chapter generator. Return only valid JSON.'},
                        {'role': 'user', 'content': prompt}
                    ],
                    'response_format': {'type': 'json_object'}
                },
                headers={'Authorization': f'Bearer {api_key}'}
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"GPT API error: {response.text}"
                )
            
            result = response.json()
            chapters_text = result['choices'][0]['message']['content']
        
        # Parse chapters
        import json
        chapters = json.loads(chapters_text)
        
        if isinstance(chapters, dict):
            chapters = chapters.get('chapters', [])
        
        # Save chapters
        await podcasts_collection.update_one(
            {"_id": ObjectId(podcast_id)},
            {"$set": {"chapters": chapters}}
        )
        
        logger.info(f"✅ Generated {len(chapters)} chapters")
        
        return {
            "message": "Chapters generated successfully",
            "chapters": chapters,
            "count": len(chapters)
        }
        
    except Exception as e:
        logger.error(f"Chapter generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
