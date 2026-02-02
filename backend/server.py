"""
FOMO Podcasts Platform - Main Server
Refactored modular architecture
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# GridFS for audio files
fs = AsyncIOMotorGridFSBucket(db)

# Initialize Webhook Service
from webhook_service import WebhookService
webhook_service = WebhookService(db)

# Create FastAPI app
app = FastAPI(
    title="FOMO Podcasts API",
    description="Phase 6: RSS Feeds & Webhooks + Modular Architecture",
    version="6.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from routes.authors import router as authors_router
from routes.podcasts import router as podcasts_router
from routes.library import router as library_router
from routes.rss_webhooks import router as rss_webhooks_router
from routes.telegram import router as telegram_router
from routes.telegram_bots import router as telegram_bots_router
from routes.moderation import router as moderation_router
from routes.costream import router as costream_router
from routes.comments import router as comments_router
from routes.analytics import router as analytics_router
from routes.websocket import router as websocket_router
from routes.notifications import router as notifications_router
from routes.messages import router as messages_router, users_router
from routes.podcast_access import router as podcast_access_router
from routes.live import router as live_router
from routes.playlists import router as playlists_router
from routes.push_notifications import router as push_router
from routes.search import router as search_router
from routes.badges import router as badges_router
from routes.club import router as club_router
from routes.player_features import router as player_features_router
from routes.transcribe import router as transcribe_router
from routes.ai_features import router as ai_features_router
from routes.social_features import router as social_features_router
from routes.content_features import router as content_features_router
from routes.telegram_subscriptions import router as telegram_subscriptions_router
from routes.telegram_streaming import router as telegram_streaming_router
from routes.recommendations import router as recommendations_router
from routes.auth import router as auth_router
from routes import player_features as pf_module
from routes import transcribe as transcribe_module
from routes import ai_features as ai_module
from routes import social_features as social_module
from routes import content_features as content_module

# Private Voice Club routes
from routes.club_management import router as club_management_router
from routes.xp import router as xp_router
from routes.hand_raise import router as hand_raise_router
from routes.speech_support import router as speech_support_router
from routes.badges import router as badges_club_router  # Renamed to avoid conflict
from routes.users import router as users_club_router
from routes.admin_panel import router as admin_panel_router
from routes.live_sessions import router as live_sessions_router
from routes import club_management as club_module
from routes import xp as xp_module
from routes import hand_raise as hand_raise_module
from routes import speech_support as speech_support_module
from routes import badges as badges_club_module
from routes import users as users_club_module
from routes import admin_panel as admin_panel_module
from routes import live_sessions as live_sessions_module

# Include routers with /api prefix
app.include_router(authors_router, prefix="/api")
app.include_router(podcasts_router, prefix="/api")
app.include_router(library_router, prefix="/api")
app.include_router(rss_webhooks_router, prefix="/api")
app.include_router(telegram_router, prefix="/api")
app.include_router(telegram_bots_router, prefix="/api")
app.include_router(moderation_router, prefix="/api")
app.include_router(costream_router, prefix="/api")
app.include_router(comments_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(websocket_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(messages_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(podcast_access_router, prefix="/api")
app.include_router(live_router, prefix="/api")
app.include_router(playlists_router, prefix="/api")
app.include_router(push_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(badges_router, prefix="/api")
app.include_router(club_router, prefix="/api")
app.include_router(player_features_router)
app.include_router(transcribe_router)
app.include_router(ai_features_router)
app.include_router(social_features_router)
app.include_router(content_features_router)
app.include_router(telegram_subscriptions_router, prefix="/api")
app.include_router(telegram_streaming_router, prefix="/api")
app.include_router(recommendations_router)
app.include_router(auth_router, prefix="/api")

# Private Voice Club routers
app.include_router(club_management_router, prefix="/api")
app.include_router(xp_router, prefix="/api")
app.include_router(hand_raise_router, prefix="/api")
app.include_router(speech_support_router, prefix="/api")
app.include_router(badges_club_router, prefix="/api")
app.include_router(users_club_router, prefix="/api")
app.include_router(admin_panel_router)  # No prefix - will have /api/admin
app.include_router(live_sessions_router)  # Has /api/live prefix

# Set database reference for player features, transcribe, AI, social, and content
pf_module.set_db(db)
transcribe_module.set_db(db)
ai_module.set_db(db)
social_module.set_db(db)
content_module.set_db(db)

# Set database for Private Voice Club modules
club_module.set_db(db)
xp_module.set_db(db)
hand_raise_module.set_db(db)
speech_support_module.set_db(db)
badges_club_module.set_db(db)
users_club_module.set_db(db)
admin_panel_module.set_db(db)
live_sessions_module.set_db(db)


@app.get("/api/")
async def root():
    """API root endpoint"""
    return {
        "message": "FOMO Podcast API",
        "version": "6.0 - Phase 6: RSS & Webhooks + Modular Architecture"
    }


@app.on_event("startup")
async def startup_check():
    """Check database status on startup"""
    # Store db in app state for middleware access
    app.state.db = db
    
    try:
        # Check for users (new) or authors (old - backward compatible)
        users_count = await db.users.count_documents({})
        authors_count = await db.authors.count_documents({})
        podcasts_count = await db.podcasts.count_documents({})
        
        if users_count > 0:
            logger.info(f"✅ Database status: {users_count} users, {podcasts_count} podcasts")
            # Check if club initialized
            club = await db.club_settings.find_one({})
            if club:
                logger.info(f"✅ Private Voice Club initialized: {club.get('club_name')}")
            else:
                logger.warning("⚠️  Club not initialized. Run migration script.")
        else:
            logger.info(f"✅ Database status: {authors_count} authors (old), {podcasts_count} podcasts")
            if authors_count > 0:
                logger.warning("⚠️  Migration needed: Run python migration_to_private_club.py")
        
        # Start reminder task for scheduled sessions
        try:
            from routes.live_sessions import start_reminder_task
            start_reminder_task()
            logger.info("✅ Session reminder task started")
        except Exception as e:
            logger.warning(f"⚠️  Could not start reminder task: {e}")
            
    except Exception as e:
        logger.error(f"❌ Database check error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    await webhook_service.close()
    client.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
