"""
Core Event Bus
Event-driven architecture to eliminate circular dependencies
"""
from typing import Callable, Dict, List, Any
import asyncio
import logging

logger = logging.getLogger(__name__)


class EventBus:
    """
    Simple event bus for decoupling modules.
    
    Usage:
        # Subscribe to event
        EventBus.subscribe("xp_awarded", handle_xp_awarded)
        
        # Emit event
        await EventBus.emit("xp_awarded", {"user_id": "123", "amount": 50})
    """
    _listeners: Dict[str, List[Callable]] = {}
    _initialized: bool = False
    
    @classmethod
    def subscribe(cls, event: str, handler: Callable):
        """Subscribe handler to event"""
        if event not in cls._listeners:
            cls._listeners[event] = []
        cls._listeners[event].append(handler)
        logger.debug(f"Subscribed {handler.__name__} to {event}")
    
    @classmethod
    def unsubscribe(cls, event: str, handler: Callable):
        """Unsubscribe handler from event"""
        if event in cls._listeners and handler in cls._listeners[event]:
            cls._listeners[event].remove(handler)
    
    @classmethod
    async def emit(cls, event: str, data: Dict[str, Any] = None):
        """Emit event to all subscribers"""
        if event not in cls._listeners:
            return
        
        data = data or {}
        
        for handler in cls._listeners[event]:
            try:
                if asyncio.iscoroutinefunction(handler):
                    asyncio.create_task(handler(data))
                else:
                    handler(data)
            except Exception as e:
                logger.error(f"Event handler error for {event}: {e}")
    
    @classmethod
    async def emit_sync(cls, event: str, data: Dict[str, Any] = None):
        """Emit event and wait for all handlers to complete"""
        if event not in cls._listeners:
            return
        
        data = data or {}
        
        for handler in cls._listeners[event]:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                logger.error(f"Event handler error for {event}: {e}")
    
    @classmethod
    def clear(cls):
        """Clear all subscriptions"""
        cls._listeners = {}


# Event names constants
class Events:
    """Event name constants"""
    # XP Events
    XP_AWARDED = "xp_awarded"
    XP_LEVEL_UP = "xp_level_up"
    
    # Badge Events
    BADGE_AWARDED = "badge_awarded"
    BADGE_CHECK_NEEDED = "badge_check_needed"
    
    # Live Session Events
    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"
    USER_JOINED_SESSION = "user_joined_session"
    USER_LEFT_SESSION = "user_left_session"
    HAND_RAISED = "hand_raised"
    SPEAKER_PROMOTED = "speaker_promoted"
    
    # Podcast Events
    PODCAST_CREATED = "podcast_created"
    PODCAST_LISTENED = "podcast_listened"
    
    # User Events
    USER_REGISTERED = "user_registered"
    USER_ROLE_CHANGED = "user_role_changed"
