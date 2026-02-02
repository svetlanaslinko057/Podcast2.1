"""
Initialize FOMO Voice Club Platform
Creates all necessary data for the platform to function
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import uuid
from dotenv import load_dotenv

load_dotenv()


async def init_platform():
    """Initialize the platform with all required data"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("=" * 60)
    print("🚀 INITIALIZING FOMO VOICE CLUB PLATFORM")
    print("=" * 60)
    
    # 1. Create Owner User
    print("\n📝 Creating Owner user...")
    
    owner_wallet = "0xOwnerWallet123456789"  # Default owner wallet
    owner_user = {
        "id": "owner-001",
        "fomo_id": 100001,
        "name": "Club Owner",
        "username": "owner",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=owner",
        "bio": "Founder and owner of FOMO Voice Club",
        "short_bio": "Club Owner",
        "wallet_address": owner_wallet,
        "role": "owner",
        "level": 5,
        "joined_at": datetime.now(timezone.utc) - timedelta(days=30),
        "days_in_club": 30,
        "xp_total": 10000,
        "xp_breakdown": {
            "listening_time": 3000,
            "podcasts_listened": 50,
            "live_attendance": 2500,
            "hand_raises": 100,
            "speeches_given": 200,
            "support_received": 50
        },
        "badges": [
            {"type": "authority", "name": "Founder", "description": "Platform founder", "visible": True}
        ],
        "voice_stats": {
            "total_speeches": 50,
            "total_speech_time_minutes": 500,
            "hand_raise_count": 100,
            "hand_raise_success_rate": 1.0,
            "topics_participated": ["tech", "crypto", "podcasting"],
            "support_received": 50,
            "last_speech_at": datetime.now(timezone.utc).isoformat()
        },
        "engagement_score": 100.0,
        "priority_score": 100.0,
        "telegram_connected": False,
        "telegram_chat_id": None,
        "telegram_username": None,
        "social_links": {},
        "referral_code": "OWNER001",
        "referred_by": None,
        "referral_count": 10,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30)
    }
    
    await db.users.update_one(
        {"id": owner_user["id"]},
        {"$set": owner_user},
        upsert=True
    )
    print(f"✅ Owner created: {owner_user['name']} (wallet: {owner_wallet})")
    
    # Also create in authors collection for backward compatibility
    author_data = {
        "id": owner_user["id"],
        "fomo_id": owner_user["fomo_id"],
        "name": owner_user["name"],
        "username": owner_user["username"],
        "avatar": owner_user["avatar"],
        "bio": owner_user["bio"],
        "wallet_address": owner_wallet,
        "telegram_connected": False,
        "badges": [],
        "labels": ["Admin"],
        "followers_count": 100,
        "following_count": 10,
        "podcasts_count": 5,
        "total_listens": 1000,
        "rating": 5.0,
        "activity_score": 10000,
        "created_at": datetime.now(timezone.utc)
    }
    await db.authors.update_one(
        {"id": author_data["id"]},
        {"$set": author_data},
        upsert=True
    )
    
    # 2. Create Admin User
    print("\n📝 Creating Admin user...")
    
    admin_wallet = "0xAdminWallet987654321"
    admin_user = {
        "id": "admin-001",
        "fomo_id": 100002,
        "name": "Club Admin",
        "username": "admin",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
        "bio": "Platform administrator",
        "short_bio": "Admin",
        "wallet_address": admin_wallet,
        "role": "admin",
        "level": 4,
        "joined_at": datetime.now(timezone.utc) - timedelta(days=20),
        "days_in_club": 20,
        "xp_total": 5000,
        "xp_breakdown": {
            "listening_time": 1500,
            "podcasts_listened": 30,
            "live_attendance": 1500,
            "hand_raises": 50,
            "speeches_given": 100,
            "support_received": 30
        },
        "badges": [
            {"type": "authority", "name": "Moderator", "description": "Platform moderator", "visible": True}
        ],
        "voice_stats": {
            "total_speeches": 25,
            "total_speech_time_minutes": 250,
            "hand_raise_count": 50,
            "hand_raise_success_rate": 0.9,
            "topics_participated": ["tech", "news"],
            "support_received": 30,
            "last_speech_at": datetime.now(timezone.utc).isoformat()
        },
        "engagement_score": 85.0,
        "priority_score": 90.0,
        "telegram_connected": False,
        "social_links": {},
        "referral_code": "ADMIN001",
        "created_at": datetime.now(timezone.utc) - timedelta(days=20)
    }
    
    await db.users.update_one(
        {"id": admin_user["id"]},
        {"$set": admin_user},
        upsert=True
    )
    print(f"✅ Admin created: {admin_user['name']} (wallet: {admin_wallet})")
    
    # 3. Create test listener
    print("\n📝 Creating test Listener...")
    
    listener_wallet = "0xListenerWallet111222333"
    listener_user = {
        "id": "listener-001",
        "fomo_id": 100003,
        "name": "Test Listener",
        "username": "listener",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=listener",
        "bio": "Just listening to great content",
        "wallet_address": listener_wallet,
        "role": "listener",
        "level": 1,
        "joined_at": datetime.now(timezone.utc) - timedelta(days=5),
        "days_in_club": 5,
        "xp_total": 100,
        "xp_breakdown": {
            "listening_time": 50,
            "podcasts_listened": 5,
            "live_attendance": 30,
            "hand_raises": 2,
            "speeches_given": 0,
            "support_received": 0
        },
        "badges": [],
        "voice_stats": {
            "total_speeches": 0,
            "total_speech_time_minutes": 0,
            "hand_raise_count": 2,
            "hand_raise_success_rate": 0.0,
            "topics_participated": [],
            "support_received": 0,
            "last_speech_at": None
        },
        "engagement_score": 20.0,
        "priority_score": 50.0,
        "telegram_connected": False,
        "social_links": {},
        "referral_code": "LIST001",
        "created_at": datetime.now(timezone.utc) - timedelta(days=5)
    }
    
    await db.users.update_one(
        {"id": listener_user["id"]},
        {"$set": listener_user},
        upsert=True
    )
    print(f"✅ Listener created: {listener_user['name']}")
    
    # 4. Create Club Settings
    print("\n📝 Creating Club Settings...")
    
    club_settings = {
        "id": str(uuid.uuid4()),
        "club_name": "FOMO Voice Club",
        "club_description": "Private podcast club with reputation economy",
        "club_owner_wallet": owner_wallet,
        "club_owner_id": owner_user["id"],
        "club_admin_wallets": [admin_wallet],
        "owner_wallet": owner_wallet,  # Alternative key used in some places
        "admin_wallets": [admin_wallet],  # Alternative key
        "max_members": 1000,
        "registration_mode": "open",
        "enable_hand_raise": True,
        "hand_raise_queue_limit": 10,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.club_settings.update_one(
        {},  # Only one document
        {"$set": club_settings},
        upsert=True
    )
    print(f"✅ Club Settings created: {club_settings['club_name']}")
    
    # 5. Create Sample Podcast
    print("\n📝 Creating sample podcast...")
    
    sample_podcast = {
        "id": str(uuid.uuid4()),
        "title": "Welcome to FOMO Voice Club",
        "description": "Introduction to our private voice club platform. Learn about features, XP system, and how to participate.",
        "author_id": owner_user["id"],
        "author_name": owner_user["name"],
        "cover_image": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500",
        "audio_url": None,
        "audio_file_id": None,
        "duration": 1800,
        "file_size": 0,
        "audio_format": "mp3",
        "transcript": None,
        "ai_summary": None,
        "tags": ["welcome", "introduction", "club", "podcast"],
        "chapters": [],
        "is_live": False,
        "is_premium": False,
        "visibility": "public",
        "category": "Introduction",
        "views_count": 150,
        "listens_count": 100,
        "reactions_count": 25,
        "comments_count": 10,
        "likes": 25,
        "listens": 100,
        "is_private": False,
        "created_at": datetime.now(timezone.utc) - timedelta(days=7),
        "published_at": datetime.now(timezone.utc) - timedelta(days=7),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.podcasts.update_one(
        {"title": sample_podcast["title"]},
        {"$set": sample_podcast},
        upsert=True
    )
    print(f"✅ Sample podcast created: {sample_podcast['title']}")
    
    # 6. Create Indexes
    print("\n📝 Creating database indexes...")
    
    # Users indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("wallet_address")
    await db.users.create_index("role")
    await db.users.create_index("xp_total")
    
    # Podcasts indexes
    await db.podcasts.create_index("id", unique=True)
    await db.podcasts.create_index("author_id")
    await db.podcasts.create_index("created_at")
    
    # Live sessions indexes
    await db.live_sessions.create_index("id", unique=True)
    await db.live_sessions.create_index("status")
    
    # Authors indexes (backward compat)
    await db.authors.create_index("id", unique=True)
    await db.authors.create_index("wallet_address")
    
    print("✅ Indexes created")
    
    # 7. Summary
    print("\n" + "=" * 60)
    print("✅ PLATFORM INITIALIZATION COMPLETE!")
    print("=" * 60)
    
    users_count = await db.users.count_documents({})
    podcasts_count = await db.podcasts.count_documents({})
    
    print(f"\n📊 Database Summary:")
    print(f"   Users: {users_count}")
    print(f"   Podcasts: {podcasts_count}")
    print(f"   Club Settings: ✅")
    
    print(f"\n👤 Created Users:")
    print(f"   Owner: {owner_user['name']} (wallet: {owner_wallet})")
    print(f"   Admin: {admin_user['name']} (wallet: {admin_wallet})")
    print(f"   Listener: {listener_user['name']} (wallet: {listener_wallet})")
    
    print(f"\n🔑 Admin Access:")
    print(f"   Connect wallet '{owner_wallet}' for Owner access")
    print(f"   Connect wallet '{admin_wallet}' for Admin access")
    
    print(f"\n🎯 Next Steps:")
    print(f"   1. Go to the site and connect wallet")
    print(f"   2. Use one of the admin wallets above")
    print(f"   3. Create a Live Session from /live")
    print(f"   4. Start streaming!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(init_platform())
