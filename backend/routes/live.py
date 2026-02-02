"""
Live Room Routes - WebSocket and HTTP endpoints for live rooms
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Form, Query, HTTPException
from typing import Optional, List
import json
from datetime import datetime

from websocket_manager import manager

router = APIRouter(prefix="/live", tags=["live"])


# ========== Get Single Live Session by ID ==========

@router.get("/session/{session_id}")
async def get_live_session(session_id: str):
    """
    Get a specific live session by ID
    Used for joining Telegram-initiated live streams
    """
    from server import db
    
    session = await db.live_sessions.find_one({"id": session_id}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")
    
    return session


# ========== Get All Active Live Sessions (for homepage) ==========

@router.get("/active/all")
async def get_all_active_lives():
    """
    Get all currently active live sessions across all platforms
    Used for showing live streams on homepage/creators page
    """
    from server import db
    
    sessions = await db.live_sessions.find(
        {"is_live": True},
        {"_id": 0}
    ).sort("started_at", -1).to_list(20)
    
    return sessions


# ========== Get Active Live Sessions by Author ==========

@router.get("/{author_id}")
async def get_author_live_sessions(
    author_id: str,
    platform: Optional[str] = Query(None)
):
    """
    Get live sessions for an author
    Optional filter by platform (telegram, browser, etc.)
    """
    from server import db
    
    query = {"author_id": author_id}
    if platform:
        query["platform"] = platform
    
    sessions = await db.live_sessions.find(query, {"_id": 0}).to_list(50)
    return sessions


# ========== WebSocket Endpoint ==========

@router.websocket("/ws/{room_id}")
async def websocket_live_room(
    websocket: WebSocket,
    room_id: str,
    user_id: str = "anonymous",
    username: str = "Guest",
    role: str = "listener"
):
    """
    WebSocket endpoint for live room real-time updates
    
    Query params:
    - user_id: User identifier
    - username: Display name
    - role: 'listener' or 'speaker'
    """
    print(f"🔌 WebSocket connection attempt: room={room_id}, user={user_id}, role={role}")
    
    await manager.connect(websocket, room_id, user_id, role)
    
    try:
        # Send initial room data
        room_data = manager.get_room_data(room_id)
        await websocket.send_json({
            "type": "room_data",
            "data": room_data
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            
            if msg_type == "chat_message":
                await manager.handle_chat_message(
                    room_id, user_id, username, message.get("message", "")
                )
            
            elif msg_type == "hand_raise":
                await manager.handle_hand_raise(
                    room_id, user_id, message.get("action", "raise")
                )
            
            elif msg_type == "speaking_status":
                await manager.update_speaking_status(
                    room_id, user_id, message.get("is_speaking", False)
                )
            
            elif msg_type == "promote_user":
                # Only speakers/hosts can promote
                target_user = message.get("target_user_id")
                if target_user:
                    await manager.promote_to_speaker(room_id, target_user)
            
            elif msg_type == "demote_user":
                target_user = message.get("target_user_id")
                if target_user:
                    await manager.demote_to_listener(room_id, target_user)
                    
    except WebSocketDisconnect:
        print(f"❌ WebSocket disconnected: room={room_id}, user={user_id}")
        manager.disconnect(websocket, room_id, user_id)
        
        # Broadcast user left
        await manager.broadcast_to_room(room_id, {
            "type": "user_left",
            "user_id": user_id,
            "stats": manager.get_room_stats(room_id)
        })
        
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket, room_id, user_id)


# ========== HTTP Fallback Endpoints ==========

@router.get("/room/{room_id}/data")
async def get_room_data(room_id: str):
    """Get current room data (HTTP fallback for polling)"""
    return manager.get_room_data(room_id)


@router.post("/room/{room_id}/chat")
async def send_chat_message(
    room_id: str,
    user_id: str = Form(...),
    username: str = Form(...),
    message: str = Form(...)
):
    """Send chat message via HTTP (fallback when WebSocket unavailable)"""
    await manager.handle_chat_message(room_id, user_id, username, message)
    
    # Return the message that was sent
    chat_message = {
        "id": f"{user_id}_{datetime.utcnow().timestamp()}",
        "user_id": user_id,
        "username": username,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    return {
        "success": True,
        "message": chat_message
    }


@router.post("/room/{room_id}/hand")
async def toggle_hand_raise(
    room_id: str,
    user_id: str = Form(...),
    action: str = Form(...)  # 'raise' or 'lower'
):
    """Raise or lower hand via HTTP"""
    await manager.handle_hand_raise(room_id, user_id, action)
    return {
        "success": True,
        "action": action,
        "stats": manager.get_room_stats(room_id)
    }


@router.post("/room/{room_id}/promote/{target_user_id}")
async def promote_user(room_id: str, target_user_id: str):
    """Promote a listener to speaker"""
    await manager.promote_to_speaker(room_id, target_user_id)
    return {
        "success": True,
        "user_id": target_user_id,
        "new_role": "speaker"
    }


@router.post("/room/{room_id}/demote/{target_user_id}")
async def demote_user(room_id: str, target_user_id: str):
    """Demote a speaker to listener"""
    await manager.demote_to_listener(room_id, target_user_id)
    return {
        "success": True,
        "user_id": target_user_id,
        "new_role": "listener"
    }


@router.get("/room/{room_id}/stats")
async def get_room_stats(room_id: str):
    """Get room statistics"""
    return manager.get_room_stats(room_id)
