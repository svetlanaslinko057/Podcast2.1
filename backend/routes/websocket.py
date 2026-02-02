"""
WebSocket Routes - Real-time updates for comments and live events
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio

router = APIRouter(tags=["websocket"])

# Store active WebSocket connections
# podcast_id -> list of WebSocket connections
active_connections: Dict[str, List[WebSocket]] = {}


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, podcast_id: str):
        await websocket.accept()
        if podcast_id not in self.active_connections:
            self.active_connections[podcast_id] = []
        self.active_connections[podcast_id].append(websocket)
        print(f"✅ Client connected to podcast {podcast_id}. Total: {len(self.active_connections[podcast_id])}")
    
    def disconnect(self, websocket: WebSocket, podcast_id: str):
        if podcast_id in self.active_connections:
            self.active_connections[podcast_id].remove(websocket)
            if len(self.active_connections[podcast_id]) == 0:
                del self.active_connections[podcast_id]
            print(f"❌ Client disconnected from podcast {podcast_id}")
    
    async def broadcast(self, podcast_id: str, message: dict):
        """Broadcast message to all connections for a podcast"""
        if podcast_id not in self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections[podcast_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn, podcast_id)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")


manager = ConnectionManager()


@router.websocket("/ws/podcast/{podcast_id}")
async def websocket_podcast(websocket: WebSocket, podcast_id: str):
    """WebSocket endpoint for real-time podcast updates"""
    await manager.connect(websocket, podcast_id)
    
    try:
        # Send welcome message
        await manager.send_personal_message({
            "type": "connected",
            "podcast_id": podcast_id,
            "message": "Connected to podcast updates"
        }, websocket)
        
        # Keep connection alive and listen for messages
        while True:
            data = await websocket.receive_text()
            # Echo back for now (can be used for user presence, typing indicators, etc.)
            await manager.send_personal_message({
                "type": "echo",
                "data": data
            }, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, podcast_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, podcast_id)


async def broadcast_new_comment(podcast_id: str, comment: dict):
    """Broadcast new comment to all connected clients"""
    await manager.broadcast(podcast_id, {
        "type": "new_comment",
        "podcast_id": podcast_id,
        "comment": comment
    })


async def broadcast_comment_like(podcast_id: str, comment_id: str, likes_count: int):
    """Broadcast comment like update"""
    await manager.broadcast(podcast_id, {
        "type": "comment_liked",
        "podcast_id": podcast_id,
        "comment_id": comment_id,
        "likes_count": likes_count
    })


async def broadcast_live_status(podcast_id: str, is_live: bool):
    """Broadcast live status change"""
    await manager.broadcast(podcast_id, {
        "type": "live_status",
        "podcast_id": podcast_id,
        "is_live": is_live
    })


async def broadcast_viewer_count(podcast_id: str, count: int):
    """Broadcast current viewer count"""
    await manager.broadcast(podcast_id, {
        "type": "viewer_count",
        "podcast_id": podcast_id,
        "count": count
    })
