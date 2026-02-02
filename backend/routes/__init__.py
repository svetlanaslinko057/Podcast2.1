"""
Routes Registration Module
Centralizes all route registration to clean up server.py
"""
from fastapi import FastAPI
import logging

logger = logging.getLogger(__name__)


def register_all_routes(app: FastAPI):
    """
    Register all API routes with the FastAPI application.
    This cleans up server.py and makes route management easier.
    """
    
    # Core routes
    from routes.authors import router as authors_router
    from routes.podcasts import router as podcasts_router
    from routes.library import router as library_router
    from routes.playlists import router as playlists_router
    from routes.search import router as search_router
    from routes.trending import router as trending_router
    from routes.comments import router as comments_router
    from routes.reactions import router as reactions_router
    from routes.bookmarks import router as bookmarks_router
    from routes.audio import router as audio_router
    
    # User management routes
    from routes.users import router as users_router
    from routes.users_club import router as users_club_router
    from routes.subscribers import router as subscribers_router
    from routes.follow import router as follow_router
    from routes.badges import router as badges_router
    from routes.xp import router as xp_router
    from routes.referrals import router as referrals_router
    
    # Live session routes
    from routes.live_sessions import router as live_sessions_router
    from routes.hand_raise import router as hand_raise_router
    from routes.speech_support import router as speech_support_router
    from routes.websocket import router as websocket_router
    
    # Telegram routes
    from routes.telegram import router as telegram_router
    from routes.telegram_bots import router as telegram_bots_router
    
    # Admin routes
    from routes.admin_panel import router as admin_router
    from routes.club import router as club_router
    
    # Analytics routes
    from routes.analytics import router as analytics_router
    from routes.listening_history import router as listening_router
    from routes.activity import router as activity_router
    
    # Advanced features
    from routes.ai_features import router as ai_router
    from routes.rss import router as rss_router
    from routes.webhooks import router as webhooks_router
    from routes.private_rss import router as private_rss_router
    from routes.notifications import router as notifications_router
    
    # All routes with their prefixes
    routes = [
        # Core
        (authors_router, "/api", "Authors"),
        (podcasts_router, "/api", "Podcasts"),
        (library_router, "/api", "Library"),
        (playlists_router, "/api", "Playlists"),
        (search_router, "/api", "Search"),
        (trending_router, "/api", "Trending"),
        (comments_router, "/api", "Comments"),
        (reactions_router, "/api", "Reactions"),
        (bookmarks_router, "/api", "Bookmarks"),
        (audio_router, "/api", "Audio"),
        
        # Users
        (users_router, "/api", "Users"),
        (users_club_router, "/api", "Users Club"),
        (subscribers_router, "/api", "Subscribers"),
        (follow_router, "/api", "Follow"),
        (badges_router, "/api", "Badges"),
        (xp_router, "/api", "XP"),
        (referrals_router, "/api", "Referrals"),
        
        # Live
        (live_sessions_router, "/api", "Live Sessions"),
        (hand_raise_router, "/api", "Hand Raise"),
        (speech_support_router, "/api", "Speech Support"),
        (websocket_router, "/api", "WebSocket"),
        
        # Telegram
        (telegram_router, "/api", "Telegram"),
        (telegram_bots_router, "/api", "Telegram Bots"),
        
        # Admin
        (admin_router, "/api", "Admin"),
        (club_router, "/api", "Club"),
        
        # Analytics
        (analytics_router, "/api", "Analytics"),
        (listening_router, "/api", "Listening History"),
        (activity_router, "/api", "Activity"),
        
        # Advanced
        (ai_router, "/api", "AI Features"),
        (rss_router, "/api", "RSS"),
        (webhooks_router, "/api", "Webhooks"),
        (private_rss_router, "/api", "Private RSS"),
        (notifications_router, "/api", "Notifications"),
    ]
    
    # Register all routes
    for router, prefix, name in routes:
        try:
            app.include_router(router, prefix=prefix)
            logger.debug(f"Registered route: {name}")
        except Exception as e:
            logger.error(f"Failed to register {name}: {e}")
    
    logger.info(f"Registered {len(routes)} route modules")


def register_event_handlers():
    """Register all event handlers from services"""
    from services.badge_service import register_badge_events
    
    register_badge_events()
    logger.info("Event handlers registered")
