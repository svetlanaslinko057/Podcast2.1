"""
WebSocket Manager for Real-time Features
Handles Socket.IO connections for live sessions
"""
import socketio
import asyncio
from typing import Dict, List, Set
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Track active connections per session
session_participants: Dict[str, Set[str]] = {}  # session_id -> set of sid
user_sessions: Dict[str, str] = {}  # sid -> session_id
user_info: Dict[str, dict] = {}  # sid -> user data


@sio.event
async def connect(sid, environ):
    """Handle new Socket.IO connection"""
    logger.info(f"Client connected: {sid}")
    await sio.emit('connected', {'sid': sid}, to=sid)


@sio.event
async def disconnect(sid):
    """Handle Socket.IO disconnection"""
    logger.info(f"Client disconnected: {sid}")
    
    # Remove from session
    if sid in user_sessions:
        session_id = user_sessions[sid]
        if session_id in session_participants:
            session_participants[session_id].discard(sid)
            
            # Notify others in the session
            await sio.emit('participant_left', {
                'user': user_info.get(sid, {}),
                'count': len(session_participants[session_id])
            }, room=session_id, skip_sid=sid)
        
        del user_sessions[sid]
    
    if sid in user_info:
        del user_info[sid]


@sio.event
async def join_session(sid, data):
    """Join a live session room"""
    session_id = data.get('session_id')
    user_data = data.get('user', {})
    
    if not session_id:
        await sio.emit('error', {'message': 'session_id required'}, to=sid)
        return
    
    # Store user info
    user_info[sid] = user_data
    user_sessions[sid] = session_id
    
    # Add to session participants
    if session_id not in session_participants:
        session_participants[session_id] = set()
    session_participants[session_id].add(sid)
    
    # Join Socket.IO room
    await sio.enter_room(sid, session_id)
    
    # Notify user
    await sio.emit('joined_session', {
        'session_id': session_id,
        'participants_count': len(session_participants[session_id])
    }, to=sid)
    
    # Notify others
    await sio.emit('participant_joined', {
        'user': user_data,
        'count': len(session_participants[session_id])
    }, room=session_id, skip_sid=sid)
    
    logger.info(f"User {sid} joined session {session_id}")


@sio.event
async def leave_session(sid, data):
    """Leave a live session room"""
    session_id = data.get('session_id')
    
    if not session_id:
        return
    
    # Remove from session
    if session_id in session_participants:
        session_participants[session_id].discard(sid)
        
        # Notify others
        await sio.emit('participant_left', {
            'user': user_info.get(sid, {}),
            'count': len(session_participants[session_id])
        }, room=session_id, skip_sid=sid)
    
    # Leave Socket.IO room
    await sio.leave_room(sid, session_id)
    
    if sid in user_sessions:
        del user_sessions[sid]
    
    logger.info(f"User {sid} left session {session_id}")


@sio.event
async def send_comment(sid, data):
    """Send a comment to the live session"""
    session_id = user_sessions.get(sid)
    
    if not session_id:
        await sio.emit('error', {'message': 'Not in a session'}, to=sid)
        return
    
    comment_text = data.get('text', '').strip()
    if not comment_text:
        return
    
    user_data = user_info.get(sid, {})
    
    comment = {
        'id': f"{sid}_{asyncio.get_event_loop().time()}",
        'text': comment_text,
        'user': user_data,
        'timestamp': asyncio.get_event_loop().time()
    }
    
    # Broadcast to all in session
    await sio.emit('new_comment', comment, room=session_id)
    
    logger.info(f"Comment sent in session {session_id}")


@sio.event
async def send_reaction(sid, data):
    """Send a reaction emoji"""
    session_id = user_sessions.get(sid)
    
    if not session_id:
        return
    
    emoji = data.get('emoji')
    if not emoji:
        return
    
    user_data = user_info.get(sid, {})
    
    reaction = {
        'emoji': emoji,
        'user': user_data,
        'timestamp': asyncio.get_event_loop().time()
    }
    
    # Broadcast to all in session
    await sio.emit('new_reaction', reaction, room=session_id)


@sio.event
async def raise_hand(sid, data):
    """Raise hand to speak"""
    session_id = user_sessions.get(sid)
    
    if not session_id:
        await sio.emit('error', {'message': 'Not in a session'}, to=sid)
        return
    
    user_data = user_info.get(sid, {})
    
    hand_raise = {
        'user': user_data,
        'sid': sid,
        'timestamp': asyncio.get_event_loop().time()
    }
    
    # Notify admins/host (broadcast to session)
    await sio.emit('hand_raised', hand_raise, room=session_id)
    
    # Confirm to user
    await sio.emit('hand_raise_confirmed', {'status': 'pending'}, to=sid)
    
    logger.info(f"Hand raised by user in session {session_id}")


@sio.event
async def lower_hand(sid, data):
    """Lower raised hand"""
    session_id = user_sessions.get(sid)
    
    if not session_id:
        return
    
    user_data = user_info.get(sid, {})
    
    # Notify session
    await sio.emit('hand_lowered', {'user': user_data, 'sid': sid}, room=session_id)


@sio.event
async def approve_speaker(sid, data):
    """Approve someone to speak (admin only)"""
    session_id = user_sessions.get(sid)
    
    if not session_id:
        return
    
    target_sid = data.get('sid')
    if not target_sid:
        return
    
    # Notify the approved user
    await sio.emit('speaker_approved', {
        'approved': True,
        'message': 'You can now speak!'
    }, to=target_sid)
    
    # Notify session
    target_user = user_info.get(target_sid, {})
    await sio.emit('speaker_promoted', {'user': target_user}, room=session_id)
    
    logger.info(f"Speaker {target_sid} approved in session {session_id}")


@sio.event
async def reject_speaker(sid, data):
    """Reject speaker request (admin only)"""
    session_id = user_sessions.get(sid)
    
    if not session_id:
        return
    
    target_sid = data.get('sid')
    if not target_sid:
        return
    
    # Notify the rejected user
    await sio.emit('speaker_rejected', {
        'approved': False,
        'message': 'Speaker request denied'
    }, to=target_sid)
    
    logger.info(f"Speaker {target_sid} rejected in session {session_id}")


@sio.event
async def get_participants(sid, data):
    """Get list of participants in session"""
    session_id = user_sessions.get(sid)
    
    if not session_id:
        return
    
    participants = []
    if session_id in session_participants:
        for participant_sid in session_participants[session_id]:
            participants.append(user_info.get(participant_sid, {}))
    
    await sio.emit('participants_list', {
        'participants': participants,
        'count': len(participants)
    }, to=sid)


# Helper function to broadcast session updates
async def broadcast_session_update(session_id: str, event: str, data: dict):
    """Broadcast update to all participants in a session"""
    await sio.emit(event, data, room=session_id)
    logger.info(f"Broadcasted {event} to session {session_id}")


# Helper function to get participant count
def get_participant_count(session_id: str) -> int:
    """Get number of participants in a session"""
    return len(session_participants.get(session_id, set()))
