"""
FOMO Podcasts Platform - Main Server
Refactored with clean modular architecture
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
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

# Import core modules
from core.database import init_database, close_database, get_db
from core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting FOMO Podcasts Platform...")
    
    # Initialize database
    db = await init_database()
    app.state.db = db
    
    # Check database status
    try:
        users_count = await db.users.count_documents({})
        podcasts_count = await db.podcasts.count_documents({})
        club = await db.club_settings.find_one({})
        
        logger.info(f"✅ Database: {users_count} users, {podcasts_count} podcasts")
        if club:
            logger.info(f"✅ Club: {club.get('club_name')}")
    except Exception as e:
        logger.warning(f"⚠️ Database check: {e}")
    
    # Initialize services
    try:
        from services.badge_service import register_badge_events
        register_badge_events()
        logger.info("✅ Event handlers registered")
    except Exception as e:
        logger.warning(f"⚠️ Event handlers: {e}")
    
    # Start background tasks
    try:
        from background_tasks import start_reminder_task
        start_reminder_task()
        logger.info("✅ Background tasks started")
    except Exception as e:
        logger.warning(f"⚠️ Background tasks: {e}")
    
    logger.info("✅ Application startup complete")
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("🛑 Shutting down...")
    await close_database()
    logger.info("✅ Shutdown complete")


# Create FastAPI app with lifespan
app = FastAPI(
    title="FOMO Podcasts API",
    description="Private Voice Club Platform with LiveKit & Telegram",
    version="7.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_dir = ROOT_DIR / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# ============================================
# ROUTE REGISTRATION
# Kept explicit for clarity and debugging
# ============================================

# --- Core Routes ---
from routes.authors import router as authors_router
from routes.podcasts import router as podcasts_router
from routes.library import router as library_router
from routes.comments import router as comments_router
from routes.search import router as search_router
from routes.playlists import router as playlists_router

app.include_router(authors_router, prefix="/api", tags=["Authors"])
app.include_router(podcasts_router, prefix="/api", tags=["Podcasts"])
app.include_router(library_router, prefix="/api", tags=["Library"])
app.include_router(comments_router, prefix="/api", tags=["Comments"])
app.include_router(search_router, prefix="/api", tags=["Search"])
app.include_router(playlists_router, prefix="/api", tags=["Playlists"])

# --- User Management ---
from routes.users import router as users_router
from routes.badges import router as badges_router
from routes.xp import router as xp_router
from routes.admin_panel import router as admin_router

app.include_router(users_router, prefix="/api", tags=["Users"])
app.include_router(badges_router, prefix="/api", tags=["Badges"])
app.include_router(xp_router, prefix="/api", tags=["XP"])
app.include_router(admin_router, tags=["Admin"])

# --- Live Sessions ---
from routes.live_sessions import router as live_sessions_router
from routes.hand_raise import router as hand_raise_router
from routes.speech_support import router as speech_support_router
from routes.websocket import router as websocket_router

app.include_router(live_sessions_router, tags=["Live Sessions"])
app.include_router(hand_raise_router, prefix="/api", tags=["Hand Raise"])
app.include_router(speech_support_router, prefix="/api", tags=["Speech Support"])
app.include_router(websocket_router, prefix="/api", tags=["WebSocket"])

# --- Telegram ---
from routes.telegram import router as telegram_router
from routes.telegram_bots import router as telegram_bots_router

app.include_router(telegram_router, prefix="/api", tags=["Telegram"])
app.include_router(telegram_bots_router, prefix="/api", tags=["Telegram Bots"])

# --- Club ---
from routes.club import router as club_router
from routes.club_management import router as club_management_router

app.include_router(club_router, prefix="/api", tags=["Club"])
app.include_router(club_management_router, prefix="/api", tags=["Club Management"])

# --- Analytics ---
from routes.analytics import router as analytics_router
from routes.notifications import router as notifications_router

app.include_router(analytics_router, prefix="/api", tags=["Analytics"])
app.include_router(notifications_router, prefix="/api", tags=["Notifications"])

# --- Advanced Features ---
from routes.ai_features import router as ai_features_router
from routes.rss_webhooks import router as rss_webhooks_router

app.include_router(ai_features_router, tags=["AI Features"])
app.include_router(rss_webhooks_router, prefix="/api", tags=["RSS & Webhooks"])

# --- Additional Routes (optional features) ---
try:
    from routes.moderation import router as moderation_router
    from routes.costream import router as costream_router
    from routes.messages import router as messages_router
    from routes.podcast_access import router as podcast_access_router
    from routes.live import router as live_router
    from routes.push_notifications import router as push_router
    from routes.player_features import router as player_features_router
    from routes.transcribe import router as transcribe_router
    from routes.social_features import router as social_features_router
    from routes.content_features import router as content_features_router
    from routes.telegram_subscriptions import router as telegram_subscriptions_router
    from routes.telegram_streaming import router as telegram_streaming_router
    from routes.recommendations import router as recommendations_router
    from routes.auth import router as auth_router
    
    app.include_router(moderation_router, prefix="/api", tags=["Moderation"])
    app.include_router(costream_router, prefix="/api", tags=["Costream"])
    app.include_router(messages_router, prefix="/api", tags=["Messages"])
    app.include_router(podcast_access_router, prefix="/api", tags=["Podcast Access"])
    app.include_router(live_router, prefix="/api", tags=["Live Legacy"])
    app.include_router(push_router, prefix="/api", tags=["Push Notifications"])
    app.include_router(player_features_router, tags=["Player"])
    app.include_router(transcribe_router, tags=["Transcribe"])
    app.include_router(social_features_router, tags=["Social"])
    app.include_router(content_features_router, tags=["Content"])
    app.include_router(telegram_subscriptions_router, prefix="/api", tags=["Telegram Subs"])
    app.include_router(telegram_streaming_router, prefix="/api", tags=["Telegram Stream"])
    app.include_router(recommendations_router, tags=["Recommendations"])
    app.include_router(auth_router, prefix="/api", tags=["Auth"])
except ImportError as e:
    logger.warning(f"Optional routes not loaded: {e}")


# ============================================
# MODULE DATABASE INJECTION (Legacy support)
# Will be removed after full migration to services
# ============================================

def inject_db_to_modules():
    """Inject database to legacy modules that need it"""
    from core.database import get_db
    db = get_db()
    
    modules_to_inject = [
        'routes.player_features',
        'routes.transcribe', 
        'routes.ai_features',
        'routes.social_features',
        'routes.content_features',
        'routes.club_management',
        'routes.xp',
        'routes.hand_raise',
        'routes.speech_support',
        'routes.badges',
        'routes.users',
        'routes.admin_panel',
        'routes.live_sessions'
    ]
    
    for module_name in modules_to_inject:
        try:
            import importlib
            module = importlib.import_module(module_name)
            if hasattr(module, 'set_db'):
                module.set_db(db)
        except Exception as e:
            logger.debug(f"Module {module_name}: {e}")


# ============================================
# API ENDPOINTS
# ============================================

@app.get("/api/")
async def root():
    """API root endpoint"""
    return {
        "message": "FOMO Podcast API",
        "version": "7.0 - Clean Architecture",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    from core.database import get_db
    from core.config import settings
    
    try:
        db = get_db()
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "livekit": "configured" if settings.livekit_configured else "not configured",
        "telegram": "configured" if settings.telegram_configured else "not configured"
    }


# ============================================
# BACKWARD COMPATIBILITY
# Expose db and fs for legacy code
# ============================================

# These are kept for backward compatibility with existing code
# New code should use core.database.get_db()
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os

_mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
_db_name = os.environ.get('DB_NAME', 'test_database')

client = AsyncIOMotorClient(_mongo_url)
db = client[_db_name]
fs = AsyncIOMotorGridFSBucket(db)

# Inject to modules after imports
try:
    inject_db_to_modules()
except Exception as e:
    logger.warning(f"DB injection: {e}")

# Webhook service (legacy)
try:
    from webhook_service import WebhookService
    webhook_service = WebhookService(db)
except Exception as e:
    webhook_service = None
    logger.warning(f"Webhook service not initialized: {e}")
