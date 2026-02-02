from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

# ========== Author Models ==========
class SocialLinks(BaseModel):
    twitter: Optional[str] = None
    discord: Optional[str] = None
    telegram: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    website: Optional[str] = None

class Badge(BaseModel):
    id: str
    name: str
    icon: str  # icon name or URL
    description: str
    earned_at: Optional[datetime] = None

class Author(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fomo_id: int = Field(default_factory=lambda: int(uuid.uuid4().int % 1000000))
    name: str
    username: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    short_bio: Optional[str] = None  # Short bio for profile cards (max 100 chars)
    
    # Social & Web3
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    wallet_address: Optional[str] = None
    
    # Telegram Integration
    telegram_chat_id: Optional[str] = None  # Personal chat_id for alerts
    telegram_username: Optional[str] = None  # Telegram username
    telegram_connected: bool = False
    
    # Badges & Labels
    badges: List[Badge] = []
    labels: List[str] = []  # "Sponsored", "FOMO Choice", "Top Podcaster", "Verified"
    
    # Stats
    followers_count: int = 0
    following_count: int = 0
    podcasts_count: int = 0
    total_listens: int = 0
    rating: float = 0.0
    activity_score: int = 0  # XP
    
    # Referral
    referral_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    referred_by: Optional[str] = None
    referral_count: int = 0
    
    # Notifications
    clink_count: int = 0  # interactions
    support_count: int = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuthorCreate(BaseModel):
    id: Optional[str] = None
    name: str
    username: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    short_bio: Optional[str] = None
    wallet_address: Optional[str] = None
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    podcasts_count: Optional[int] = 0

class AuthorUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    short_bio: Optional[str] = None
    social_links: Optional[SocialLinks] = None
    wallet_address: Optional[str] = None

# ========== Podcast Models ==========
class Chapter(BaseModel):
    title: str
    start_time: int  # seconds
    end_time: Optional[int] = None

class Podcast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    author_id: str
    cover_image: Optional[str] = None
    audio_file_id: Optional[str] = None  # GridFS file ID
    
    # Audio metadata
    duration: int = 0  # seconds
    file_size: int = 0  # bytes
    audio_format: str = "mp3"
    
    # Content
    transcript: Optional[str] = None
    ai_summary: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    chapters: List[Chapter] = []
    
    # Status
    is_live: bool = False
    is_premium: bool = False  # NFT-gated
    nft_contract: Optional[str] = None
    visibility: str = "public"  # public, private, unlisted
    
    # Integration
    telegram_chat_id: Optional[str] = None
    telegram_bot_id: Optional[str] = None  # Reference to TelegramBotConfig
    
    # Stats
    views_count: int = 0
    listens_count: int = 0
    reactions_count: int = 0
    comments_count: int = 0
    reposts_count: int = 0
    saves_count: int = 0
    downloads_count: int = 0
    
    # Engagement
    likes: List[str] = []  # user_ids
    saves: List[str] = []  # user_ids
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None
    
class PodcastCreate(BaseModel):
    title: str
    description: Optional[str] = None
    author_id: str
    cover_image: Optional[str] = None
    tags: List[str] = []
    visibility: str = "public"
    is_premium: bool = False
    is_live: bool = False
    category: Optional[str] = None
    language: str = "ru"
    telegram_bot_id: Optional[str] = None  # Reference to TelegramBotConfig

# ========== Subscription Models ==========
class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    follower_id: str  # who is following
    author_id: str  # who is being followed
    notifications_enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== Reaction & Comment Models ==========
class Reaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    user_id: str
    reaction_type: str  # like, fire, heart, clap, mind_blown
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    text: str
    parent_id: Optional[str] = None  # for replies
    likes_count: int = 0
    liked_by: List[str] = []
    is_pinned: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    podcast_id: str
    user_id: str
    username: str
    text: str
    parent_id: Optional[str] = None

# ========== Playlist Models ==========
class Playlist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    title: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    podcast_ids: List[str] = []
    is_public: bool = True
    followers_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlaylistCreate(BaseModel):
    author_id: str
    title: str
    description: Optional[str] = None
    podcast_ids: List[str] = []
    is_public: bool = True

# ========== Telegram Models ==========
class TelegramConnection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    chat_id: str
    chat_title: str
    is_active: bool = True
    auto_record: bool = True
    auto_publish: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TelegramConnectionCreate(BaseModel):
    author_id: str
    chat_id: str
    chat_title: str

# ========== Analytics Models ==========
class Analytics(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    user_id: Optional[str] = None
    event_type: str  # view, play_start, play_complete, skip, download, share
    duration_listened: int = 0  # seconds
    playback_speed: float = 1.0
    device: Optional[str] = None
    location: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== Notification Models ==========
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # new_follower, new_episode, comment, reaction, mention
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== User Settings Models ==========
class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    
    # Notification settings
    notify_new_follower: bool = True
    notify_new_comment: bool = True
    notify_new_reaction: bool = True
    notify_new_episode: bool = True
    notify_mentions: bool = True
    email_notifications: bool = False
    
    # Privacy settings
    profile_visible: bool = True
    show_listening_history: bool = True
    allow_comments: bool = True
    
    # Playback settings
    default_playback_speed: float = 1.0
    auto_play_next: bool = True
    skip_silence: bool = False
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== Moderation Models (Phase 3) ==========
class BannedUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    banned_by: str  # moderator user_id
    reason: Optional[str] = None
    duration: Optional[int] = None  # minutes, None = permanent
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None

class ModerationAction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    moderator_id: str
    target_user_id: Optional[str] = None
    action_type: str  # mute, kick, ban, pin_message, delete_message, timeout
    reason: Optional[str] = None
    duration: Optional[int] = None  # for timeout, in minutes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== Live Broadcast Models (Phase 3) ==========
class LiveBroadcast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    author_id: str
    title: str
    is_active: bool = True
    listener_count: int = 0
    co_hosts: List[str] = []  # user_ids
    raise_hand_queue: List[str] = []  # user_ids waiting to speak
    stream_quality: str = "medium"  # low, medium, high
    is_recording: bool = False
    recording_file_id: Optional[str] = None
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None

# ========== Streaming Configuration Models (Phase 3) ==========
class StreamingPlatform(BaseModel):
    platform: str  # youtube, twitch, telegram, custom_rtmp
    enabled: bool = True
    stream_key: Optional[str] = None
    rtmp_url: Optional[str] = None
    chat_id: Optional[str] = None  # for telegram

class StreamingConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    platforms: List[StreamingPlatform] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== Phase 4: AI & Advanced Features Models ==========

# Transcript Models
class TranscriptSegment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    start_time: float  # seconds
    end_time: float  # seconds
    text: str
    speaker: Optional[str] = None  # Speaker ID from diarization
    confidence: float = 1.0

class PodcastTranscript(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    full_text: str
    segments: List[TranscriptSegment] = []
    language: str = "en"
    duration: float = 0.0
    speakers_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# AI Summary Models
class AISummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    summary: str
    key_points: List[str] = []
    topics: List[str] = []
    quotes: List[str] = []
    sentiment: str = "neutral"  # positive, negative, neutral
    content_warnings: List[str] = []
    show_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ========== Message Models ==========
class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    recipient_id: str
    content: str
    is_read: bool = False
    # File attachments
    attachment_url: Optional[str] = None  # URL or base64 of attached file
    attachment_type: Optional[str] = None  # image, file, audio
    attachment_name: Optional[str] = None  # Original filename
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Recording Session Models
class RecordingSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    title: Optional[str] = None
    status: str = "recording"  # recording, paused, completed, cancelled
    duration: int = 0  # seconds
    file_size: int = 0  # bytes
    audio_chunks: List[str] = []  # GridFS file IDs
    settings: Dict = {}  # Recording settings (bitrate, noise_suppression, etc.)
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

# NFT Gating Models
class NFTCollection(BaseModel):
    contract_address: str
    chain: str  # ethereum, polygon, solana, etc.
    token_ids: List[str] = []  # Empty list means any token from collection
    min_balance: int = 1  # Minimum tokens required

class NFTGate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    enabled: bool = True
    gate_type: str = "any"  # any, all (require any OR all collections)
    collections: List[NFTCollection] = []
    access_level: str = "full"  # full, preview (first 5 min), snippet
    preview_duration: int = 300  # seconds for preview
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NFTBadge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    badge_name: str
    badge_image: str
    nft_contract: str
    token_id: Optional[str] = None
    earned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ========== Social Sync & Recording Models ==========

class TelegramIntegration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    chat_id: str  # Telegram group/channel ID
    chat_title: Optional[str] = None
    voice_chat_enabled: bool = True
    auto_record: bool = True
    auto_publish: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TwitterIntegration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    twitter_user_id: str
    twitter_username: str
    access_token: Optional[str] = None  # Encrypted
    refresh_token: Optional[str] = None  # Encrypted
    space_enabled: bool = True
    auto_record: bool = True
    auto_publish: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VoiceRoomRecording(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    platform: str  # telegram, twitter, discord
    room_id: str  # Voice chat ID / Space ID
    room_title: str
    status: str = "recording"  # recording, processing, completed, failed
    recording_url: Optional[str] = None
    audio_file_id: Optional[str] = None  # GridFS
    duration: int = 0  # seconds
    participant_count: int = 0
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    podcast_id: Optional[str] = None  # Published podcast ID
    metadata: Dict = {}  # Additional platform-specific data

class SyncedBroadcast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    author_id: str
    title: str
    status: str = "live"  # scheduled, live, ended, error
    
    # Platform IDs
    telegram_voice_chat_id: Optional[str] = None
    twitter_space_id: Optional[str] = None
    youtube_stream_id: Optional[str] = None
    
    # Recording
    is_recording: bool = False
    recording_ids: List[str] = []  # VoiceRoomRecording IDs
    
    # Stats
    total_listeners: int = 0
    peak_listeners: int = 0
    
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ArchivedPodcast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    original_platform: str  # telegram, twitter, youtube, platform
    platform_id: str  # Original room/space/stream ID
    recording_id: Optional[str] = None
    archived_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    archive_quality: str = "high"  # high, medium, low
    file_size: int = 0
    is_public: bool = True


# ========== Webhook Models (Phase 6) ==========

class Webhook(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Author/User who owns this webhook
    name: str  # Friendly name for the webhook
    url: str  # Target URL for webhook calls
    events: List[str] = []  # Events to subscribe to
    secret: Optional[str] = None  # Secret key for signature verification
    is_active: bool = True
    
    # Telegram-specific settings
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    
    # Stats
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    last_triggered_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WebhookCreate(BaseModel):
    user_id: str
    name: str
    url: str
    events: List[str]
    secret: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None

class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    is_active: Optional[bool] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None

class WebhookLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webhook_id: str
    event: str  # Event type that triggered the webhook
    payload: Dict  # Data sent to webhook
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    error_message: Optional[str] = None
    attempt: int = 1  # Retry attempt number
    success: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ========== Telegram Bot Configuration (Phase 6) ==========

class TelegramBotConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Author/User who owns this bot
    name: str  # Friendly name (e.g., "My Channel Bot")
    bot_token: str  # Telegram bot token from @BotFather
    chat_id: str  # Telegram chat/channel ID
    
    # Optional settings
    description: Optional[str] = None
    is_active: bool = True
    auto_notify_new_podcast: bool = True
    auto_notify_live_start: bool = True
    
    # Stats
    total_messages_sent: int = 0
    last_used_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TelegramBotCreate(BaseModel):
    user_id: str
    name: str
    bot_token: str
    chat_id: str
    description: Optional[str] = None
    auto_notify_new_podcast: bool = True
    auto_notify_live_start: bool = True

class TelegramBotUpdate(BaseModel):
    name: Optional[str] = None
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    auto_notify_new_podcast: Optional[bool] = None
    auto_notify_live_start: Optional[bool] = None



# ========== Private RSS Feed Tokens (Phase 7) ==========

class RSSFeedToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of the RSS feed
    token: str = Field(default_factory=lambda: str(uuid.uuid4()))  # Unique token for RSS access
    name: str  # Friendly name (e.g., "Apple Podcasts", "Spotify")
    
    # Access control
    feed_type: str = "author"  # "author" or "podcast"
    author_id: Optional[str] = None  # If feed_type="author"
    podcast_id: Optional[str] = None  # If feed_type="podcast"
    
    # Settings
    is_active: bool = True
    allow_public_podcasts_only: bool = False  # If True, only shows public podcasts
    max_items: int = 100  # Max number of items in feed
    
    # Statistics
    access_count: int = 0
    last_accessed_at: Optional[datetime] = None
    
    # Metadata
    user_agent: Optional[str] = None  # Track which app is using this token
    ip_address: Optional[str] = None  # Last IP address that accessed
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None  # Optional expiration


class RSSFeedTokenCreate(BaseModel):
    user_id: str
    name: str
    feed_type: str = "author"  # "author" or "podcast"
    author_id: Optional[str] = None
    podcast_id: Optional[str] = None
    allow_public_podcasts_only: bool = False
    max_items: int = 100
    expires_at: Optional[datetime] = None


class RSSFeedTokenUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    allow_public_podcasts_only: Optional[bool] = None
    max_items: Optional[int] = None
    expires_at: Optional[datetime] = None


class RSSAccessLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token_id: str
    user_id: str  # Owner of the token
    
    # Request info
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    referer: Optional[str] = None
    
    # Feed info
    feed_type: str  # "author" or "podcast"
    feed_id: str  # author_id or podcast_id
    items_returned: int = 0
    
    accessed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))



# ========== Private Podcast Access (Phase 8) ==========

class PodcastAccessMember(BaseModel):
    """Member of a private podcast club"""
    model_config = ConfigDict(extra="ignore")
    
    user_id: str  # Wallet address or user ID
    username: Optional[str] = None  # Display name
    avatar: Optional[str] = None
    invited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    invited_by: str  # Author who invited
    last_listened_at: Optional[datetime] = None


class PodcastAccessList(BaseModel):
    """Access control list for private podcasts"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str  # Podcast this access list belongs to
    author_id: str  # Owner of the podcast
    
    # Members with access
    members: List[PodcastAccessMember] = []
    
    # Settings
    max_members: int = 1000  # Maximum number of members
    auto_approve: bool = False  # Auto-approve join requests
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PodcastAccessRequest(BaseModel):
    """Request to join a private podcast"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    podcast_id: str
    user_id: str  # User requesting access
    username: Optional[str] = None
    avatar: Optional[str] = None
    message: Optional[str] = None  # Optional message to author
    
    status: str = "pending"  # "pending", "approved", "rejected"
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None  # Author who reviewed


class InviteUserRequest(BaseModel):
    """Request body for inviting user to private podcast"""
    user_id: str  # Wallet address or user ID


class RemoveUserRequest(BaseModel):
    """Request body for removing user from private podcast"""
    user_id: str


# ========== PRIVATE VOICE CLUB MODELS ==========

# Club Settings
class ClubSettings(BaseModel):
    """Club-wide settings for Private Voice Club"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    club_name: str = "FOMO Voice Club"
    club_description: str = "Private podcast club with reputation economy"
    club_owner_wallet: str  # Master аккаунт
    club_admin_wallets: List[str] = []  # Admins
    
    # Settings
    max_members: int = 1000
    registration_mode: str = "open"  # open, approval_required
    enable_hand_raise: bool = True
    hand_raise_queue_limit: int = 10
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClubSettingsCreate(BaseModel):
    """Create club settings"""
    club_name: str
    club_description: str
    club_owner_wallet: str
    max_members: int = 1000
    registration_mode: str = "open"


class ClubSettingsUpdate(BaseModel):
    """Update club settings"""
    club_name: Optional[str] = None
    club_description: Optional[str] = None
    max_members: Optional[int] = None
    registration_mode: Optional[str] = None
    enable_hand_raise: Optional[bool] = None
    hand_raise_queue_limit: Optional[int] = None


# XP Breakdown
class XPBreakdown(BaseModel):
    listening_time: int = 0        # +1 XP за 1 минуту
    podcasts_listened: int = 0     # +10 XP за подкаст
    live_attendance: int = 0       # +50 XP за участие в live
    hand_raises: int = 0           # +20 XP за поднятие руки
    speeches_given: int = 0        # +100 XP за выступление
    support_received: int = 0      # +10 XP за поддержку


# Voice Stats
class VoiceStats(BaseModel):
    total_speeches: int = 0
    total_speech_time_minutes: int = 0
    hand_raise_count: int = 0
    hand_raise_success_rate: float = 0.0  # 0.0 - 1.0
    topics_participated: List[str] = []
    support_received: int = 0
    last_speech_at: Optional[datetime] = None


# Club Badge (новый тип для club members)
class ClubBadge(BaseModel):
    type: str  # participation, contribution, authority
    name: str
    description: str
    icon: Optional[str] = None
    earned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    visible: bool = True


# User Model (трансформация Author → User)
class User(BaseModel):
    """
    Club Member - трансформация из Author
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fomo_id: int = Field(default_factory=lambda: int(uuid.uuid4().int % 1000000))
    
    # Identity
    name: str  # Псевдоним
    username: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    short_bio: Optional[str] = None
    
    wallet_address: Optional[str] = None
    
    # Club Membership
    role: str = "listener"  # listener, member, speaker, moderator, admin, owner
    level: int = 1  # 1-5 (Observer, Active Member, Contributor, Speaker, Core Voice)
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    days_in_club: int = 0
    
    # XP System
    xp_total: int = 0
    xp_breakdown: XPBreakdown = Field(default_factory=XPBreakdown)
    
    # Badges
    badges: List[ClubBadge] = []
    
    # Voice History
    voice_stats: VoiceStats = Field(default_factory=VoiceStats)
    
    # Engagement
    engagement_score: float = 0.0  # 0-100
    priority_score: float = 50.0  # Влияет на очередь рук (0-100)
    
    # Telegram Integration (оставляем)
    telegram_chat_id: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_connected: bool = False
    
    # Social links (оставляем)
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    
    # Referral (оставляем)
    referral_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    referred_by: Optional[str] = None
    referral_count: int = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    """Create user"""
    id: Optional[str] = None
    name: str
    username: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    wallet_address: Optional[str] = None
    role: str = "listener"


class UserUpdate(BaseModel):
    """Update user"""
    name: Optional[str] = None
    username: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    short_bio: Optional[str] = None
    social_links: Optional[SocialLinks] = None


class UserRoleUpdate(BaseModel):
    """Update user role (Admin/Owner only)"""
    role: str  # listener, member, speaker, moderator, admin


# XP Transaction
class XPTransaction(BaseModel):
    """XP transaction log"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action: str  # podcast_listened, live_attended, hand_raised, speech_given, support_received
    xp_earned: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict = {}  # podcast_id, live_session_id, duration_minutes, etc.


class XPAward(BaseModel):
    """Award XP to user"""
    user_id: str
    action: str
    xp_amount: int
    metadata: Optional[Dict] = {}


# Hand Raise Event
class HandRaiseEvent(BaseModel):
    """Hand raise in live session"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    live_session_id: str
    raised_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # pending, approved, declined, expired
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None  # moderator user_id
    
    # Speech tracking
    speech_started_at: Optional[datetime] = None
    speech_ended_at: Optional[datetime] = None
    speech_duration_minutes: int = 0
    support_count: int = 0  # Сколько поддержали
    
    queue_position: int = 0
    priority_score: float = 50.0  # Для сортировки очереди


class HandRaiseCreate(BaseModel):
    """Raise hand in live session"""
    user_id: str
    live_session_id: str


class HandRaiseApprove(BaseModel):
    """Approve hand raise (Moderator)"""
    hand_raise_id: str
    approved_by: str  # moderator user_id


# Speech Support
class SpeechSupport(BaseModel):
    """Support after speech"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    speech_id: str  # hand_raise_event_id
    speaker_id: str
    supporter_id: str
    support_type: str = "valuable"  # valuable, insightful, helpful
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SpeechSupportCreate(BaseModel):
    """Create speech support"""
    speech_id: str
    speaker_id: str
    supporter_id: str
    support_type: str = "valuable"


# Badge Award
class BadgeAward(BaseModel):
    """Award badge to user (Admin/Owner)"""
    user_id: str
    badge_type: str  # participation, contribution, authority
    badge_name: str
    badge_description: str
    awarded_by: str  # admin user_id


# Leaderboard Entry
class LeaderboardEntry(BaseModel):
    """Leaderboard entry"""
    user_id: str
    name: str
    username: str
    avatar: Optional[str] = None
    level: int
    role: str
    xp_total: int
    engagement_score: float
    badges_count: int
    rank: int
