"""
WebSocket manager для live комнат
Управление real-time коммуникацией между участниками
"""
from typing import Dict, List, Set
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        # room_id -> list of websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # room_id -> room data (participants, speakers, listeners)
        self.rooms: Dict[str, dict] = {}
        # user_id -> room_id mapping
        self.user_rooms: Dict[str, str] = {}
        
    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, role: str = "listener"):
        """Connect user to a live room"""
        await websocket.accept()
        
        # Initialize room if doesn't exist
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
            self.rooms[room_id] = {
                "participants": {},
                "speakers": set(),
                "listeners": set(),
                "hand_raised": set(),
                "chat_messages": [],
                "started_at": datetime.utcnow().isoformat()
            }
        
        # Add connection
        self.active_connections[room_id].append(websocket)
        self.user_rooms[user_id] = room_id
        
        # Add participant
        self.rooms[room_id]["participants"][user_id] = {
            "user_id": user_id,
            "role": role,
            "joined_at": datetime.utcnow().isoformat(),
            "is_speaking": False,
            "is_muted": False
        }
        
        if role == "speaker":
            self.rooms[room_id]["speakers"].add(user_id)
        else:
            self.rooms[room_id]["listeners"].add(user_id)
        
        # Broadcast join event
        await self.broadcast_to_room(room_id, {
            "type": "user_joined",
            "user_id": user_id,
            "role": role,
            "stats": self.get_room_stats(room_id)
        })
    
    def disconnect(self, websocket: WebSocket, room_id: str, user_id: str):
        """Disconnect user from room"""
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            
            # Remove participant
            if user_id in self.rooms[room_id]["participants"]:
                del self.rooms[room_id]["participants"][user_id]
            
            self.rooms[room_id]["speakers"].discard(user_id)
            self.rooms[room_id]["listeners"].discard(user_id)
            self.rooms[room_id]["hand_raised"].discard(user_id)
            
            # Clean up empty room
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                del self.rooms[room_id]
        
        if user_id in self.user_rooms:
            del self.user_rooms[user_id]
    
    async def broadcast_to_room(self, room_id: str, message: dict):
        """Broadcast message to all participants in room"""
        if room_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    disconnected.append(connection)
            
            # Remove disconnected connections
            for conn in disconnected:
                if conn in self.active_connections[room_id]:
                    self.active_connections[room_id].remove(conn)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user"""
        if user_id in self.user_rooms:
            room_id = self.user_rooms[user_id]
            if room_id in self.active_connections:
                for connection in self.active_connections[room_id]:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass
    
    def get_room_stats(self, room_id: str) -> dict:
        """Get room statistics"""
        if room_id not in self.rooms:
            return {}
        
        room = self.rooms[room_id]
        return {
            "total_participants": len(room["participants"]),
            "speakers_count": len(room["speakers"]),
            "listeners_count": len(room["listeners"]),
            "hand_raised_count": len(room["hand_raised"])
        }
    
    def get_room_data(self, room_id: str) -> dict:
        """Get full room data"""
        if room_id not in self.rooms:
            return {}
        
        room = self.rooms[room_id]
        return {
            "participants": list(room["participants"].values()),
            "speakers": list(room["speakers"]),
            "listeners": list(room["listeners"]),
            "hand_raised": list(room["hand_raised"]),
            "chat_messages": room["chat_messages"][-50:],  # Last 50 messages
            "stats": self.get_room_stats(room_id),
            "started_at": room["started_at"]
        }
    
    async def handle_hand_raise(self, room_id: str, user_id: str, action: str):
        """Handle hand raise/lower action"""
        if room_id not in self.rooms:
            return
        
        if action == "raise":
            self.rooms[room_id]["hand_raised"].add(user_id)
        elif action == "lower":
            self.rooms[room_id]["hand_raised"].discard(user_id)
        
        await self.broadcast_to_room(room_id, {
            "type": "hand_raised_update",
            "user_id": user_id,
            "action": action,
            "hand_raised": list(self.rooms[room_id]["hand_raised"]),
            "stats": self.get_room_stats(room_id)
        })
    
    async def promote_to_speaker(self, room_id: str, user_id: str):
        """Promote listener to speaker"""
        if room_id not in self.rooms:
            return
        
        room = self.rooms[room_id]
        
        # Move from listeners to speakers
        room["listeners"].discard(user_id)
        room["speakers"].add(user_id)
        room["hand_raised"].discard(user_id)
        
        if user_id in room["participants"]:
            room["participants"][user_id]["role"] = "speaker"
        
        await self.broadcast_to_room(room_id, {
            "type": "user_promoted",
            "user_id": user_id,
            "stats": self.get_room_stats(room_id)
        })
    
    async def demote_to_listener(self, room_id: str, user_id: str):
        """Demote speaker to listener"""
        if room_id not in self.rooms:
            return
        
        room = self.rooms[room_id]
        
        # Move from speakers to listeners
        room["speakers"].discard(user_id)
        room["listeners"].add(user_id)
        
        if user_id in room["participants"]:
            room["participants"][user_id]["role"] = "listener"
        
        await self.broadcast_to_room(room_id, {
            "type": "user_demoted",
            "user_id": user_id,
            "stats": self.get_room_stats(room_id)
        })
    
    async def handle_chat_message(self, room_id: str, user_id: str, username: str, message: str):
        """Handle chat message"""
        if room_id not in self.rooms:
            return
        
        chat_message = {
            "id": f"{user_id}_{datetime.utcnow().timestamp()}",
            "user_id": user_id,
            "username": username,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.rooms[room_id]["chat_messages"].append(chat_message)
        
        # Keep only last 100 messages
        if len(self.rooms[room_id]["chat_messages"]) > 100:
            self.rooms[room_id]["chat_messages"] = self.rooms[room_id]["chat_messages"][-100:]
        
        await self.broadcast_to_room(room_id, {
            "type": "chat_message",
            "message": chat_message
        })
    
    async def update_speaking_status(self, room_id: str, user_id: str, is_speaking: bool):
        """Update user speaking status"""
        if room_id not in self.rooms:
            return
        
        if user_id in self.rooms[room_id]["participants"]:
            self.rooms[room_id]["participants"][user_id]["is_speaking"] = is_speaking
        
        await self.broadcast_to_room(room_id, {
            "type": "speaking_status",
            "user_id": user_id,
            "is_speaking": is_speaking
        })

# Global manager instance
manager = ConnectionManager()
