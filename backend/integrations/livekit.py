"""LiveKit Integration
Single source for LiveKit token generation and room management
"""
import os
import logging
from typing import Optional
from datetime import timedelta

try:
    from livekit import api
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False

logger = logging.getLogger(__name__)


class LiveKitIntegration:
    """LiveKit token generation and room management"""
    
    def __init__(self):
        self.api_key = os.environ.get('LIVEKIT_API_KEY', '')
        self.api_secret = os.environ.get('LIVEKIT_API_SECRET', '')
        self.url = os.environ.get('LIVEKIT_URL', '')
        
        self._configured = bool(self.api_key and self.api_secret and self.url)
    
    @property
    def is_configured(self) -> bool:
        """Check if LiveKit is properly configured"""
        return self._configured and LIVEKIT_AVAILABLE
    
    def generate_token(
        self,
        room_name: str,
        user_id: str,
        user_name: str,
        can_publish: bool = False,
        can_subscribe: bool = True,
        ttl_hours: int = 24
    ) -> Optional[str]:
        """
        Generate LiveKit access token
        
        Args:
            room_name: Name of the room to join
            user_id: Unique user identifier
            user_name: Display name
            can_publish: Whether user can publish audio/video (speaker)
            can_subscribe: Whether user can receive streams (listener)
            ttl_hours: Token validity in hours
        
        Returns:
            JWT token string or None if not configured
        """
        if not self.is_configured:
            logger.warning("LiveKit not configured, returning mock token")
            return None
        
        try:
            token = api.AccessToken(self.api_key, self.api_secret)
            token.with_identity(user_id)
            token.with_name(user_name)
            token.with_grants(api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=can_publish,
                can_subscribe=can_subscribe
            ))
            token.with_ttl(timedelta(hours=ttl_hours))
            
            return token.to_jwt()
        except Exception as e:
            logger.error(f"Failed to generate LiveKit token: {e}")
            return None
    
    def get_connection_info(self, token: str = None) -> dict:
        """Get LiveKit connection information"""
        return {
            "url": self.url,
            "token": token,
            "configured": self.is_configured,
            "mock_mode": not self.is_configured
        }


# Global instance
_livekit: Optional[LiveKitIntegration] = None


def get_livekit() -> LiveKitIntegration:
    """Get LiveKit integration instance"""
    global _livekit
    if _livekit is None:
        _livekit = LiveKitIntegration()
    return _livekit


def generate_session_token(
    session_id: str,
    user_id: str,
    username: str,
    is_speaker: bool = False
) -> dict:
    """
    Convenience function to generate token for a live session
    
    Returns:
        dict with token, url, room, and mock_mode
    """
    livekit = get_livekit()
    room_name = f"session-{session_id}"
    
    token = livekit.generate_token(
        room_name=room_name,
        user_id=user_id,
        user_name=username,
        can_publish=is_speaker,
        can_subscribe=True
    )
    
    return {
        "token": token or "mock-token",
        "url": livekit.url,
        "room": room_name,
        "mock_mode": not livekit.is_configured or token is None
    }
