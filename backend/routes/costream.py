"""
Co-Streaming API Routes
Endpoints for managing simultaneous streaming to platform and Telegram
"""
from fastapi import APIRouter, HTTPException, Form
from typing import Optional, List
from pydantic import BaseModel

router = APIRouter(prefix="/costream", tags=["costream"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


async def get_costream_service():
    """Get co-streaming service"""
    from services.costream_service import costream_service, init_costream_service
    
    if costream_service is None:
        db = await get_db()
        return init_costream_service(db)
    
    return costream_service


# Request models
class StartCostreamRequest(BaseModel):
    podcast_id: str
    author_id: str
    bot_id: str
    title: str
    description: Optional[str] = None
    platform_url: Optional[str] = None


class ForwardMessageRequest(BaseModel):
    username: str
    message: str


class UpdateStatusRequest(BaseModel):
    speakers: Optional[List[str]] = None
    listener_count: Optional[int] = None
    hand_raised_count: Optional[int] = None


@router.post("/start")
async def start_costream(request: StartCostreamRequest):
    """
    Start co-streaming to Telegram
    
    Begins forwarding stream events and chat messages to configured Telegram channel
    """
    service = await get_costream_service()
    
    result = await service.start_costream(
        podcast_id=request.podcast_id,
        author_id=request.author_id,
        bot_id=request.bot_id,
        title=request.title,
        description=request.description,
        platform_url=request.platform_url
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/stop/{podcast_id}")
async def stop_costream(podcast_id: str):
    """
    Stop co-streaming session
    
    Ends the co-streaming and sends final statistics to Telegram
    """
    service = await get_costream_service()
    
    result = await service.stop_costream(podcast_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/forward/{podcast_id}")
async def forward_chat_message(podcast_id: str, request: ForwardMessageRequest):
    """
    Forward chat message to Telegram
    
    Called when a user sends a message in the live room chat
    """
    service = await get_costream_service()
    
    result = await service.forward_chat_message(
        podcast_id=podcast_id,
        username=request.username,
        message=request.message
    )
    
    return result


@router.post("/update-status/{podcast_id}")
async def update_stream_status(podcast_id: str, request: UpdateStatusRequest):
    """
    Update stream status in Telegram
    
    Called when significant changes occur (speaker change, listener milestone)
    """
    service = await get_costream_service()
    
    result = await service.update_stream_status(
        podcast_id=podcast_id,
        speakers=request.speakers,
        listener_count=request.listener_count,
        hand_raised_count=request.hand_raised_count
    )
    
    return result


@router.post("/speaker-joined/{podcast_id}")
async def notify_speaker_joined(podcast_id: str, speaker_name: str = Form(...)):
    """Notify Telegram when a speaker joins"""
    service = await get_costream_service()
    return await service.send_speaker_joined(podcast_id, speaker_name)


@router.post("/speaker-left/{podcast_id}")
async def notify_speaker_left(podcast_id: str, speaker_name: str = Form(...)):
    """Notify Telegram when a speaker leaves"""
    service = await get_costream_service()
    return await service.send_speaker_left(podcast_id, speaker_name)


@router.get("/status/{podcast_id}")
async def get_costream_status(podcast_id: str):
    """
    Get current co-streaming session status
    
    Returns session info if active, null otherwise
    """
    service = await get_costream_service()
    
    session = service.get_active_session(podcast_id)
    
    return {
        "is_active": session is not None,
        "session": session
    }


@router.get("/is-active/{podcast_id}")
async def is_costreaming(podcast_id: str):
    """Quick check if podcast is being co-streamed"""
    service = await get_costream_service()
    return {"is_costreaming": service.is_costreaming(podcast_id)}


@router.get("/history/{author_id}")
async def get_session_history(author_id: str, limit: int = 20):
    """
    Get co-streaming session history for author
    
    Returns list of past co-streaming sessions with statistics
    """
    service = await get_costream_service()
    
    sessions = await service.get_session_history(author_id, limit)
    
    return {"sessions": sessions, "count": len(sessions)}
