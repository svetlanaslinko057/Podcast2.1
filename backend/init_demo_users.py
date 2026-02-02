"""
Initialize Demo Users for FOMO Voice Club
Creates test users and club settings
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
import uuid

load_dotenv()


async def init_demo_data():
    """Create demo users and club settings"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("=" * 60)
    print("FOMO VOICE CLUB - DEMO DATA INITIALIZATION")
    print("=" * 60)
    
    # Check if users already exist
    users_count = await db.users.count_documents({})
    if users_count > 0:
        print(f"\n⚠️  WARNING: Database already has {users_count} users")
        response = input("Continue and add more demo users? (y/n): ")
        if response.lower() != 'y':
            print("Initialization cancelled.")
            return
    
    print("\n📝 Creating demo users...")
    
    # Demo users
    demo_users = [
        {
            "id": "demo-owner-001",
            "fomo_id": 1001,
            "name": "Club Owner",
            "username": "owner",
            "avatar": None,
            "bio": "Owner and creator of the club",
            "short_bio": "Owner",
            "wallet_address": "0x1234567890abcdef",
            "telegram_chat_id": None,
            "telegram_username": None,
            "telegram_connected": False,
            "role": "owner",
            "level": 5,
            "xp_total": 10000,
            "badges": ["authority", "contribution", "participation"],
            "voice_stats": {
                "speeches_count": 50,
                "total_speaking_time": 5000,
                "avg_support_score": 4.5
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "demo-admin-002",
            "fomo_id": 1002,
            "name": "Admin User",
            "username": "admin",
            "avatar": None,
            "bio": "Club administrator",
            "short_bio": "Admin",
            "wallet_address": "0xabcdef1234567890",
            "telegram_chat_id": None,
            "telegram_username": None,
            "telegram_connected": False,
            "role": "admin",
            "level": 4,
            "xp_total": 5000,
            "badges": ["contribution", "participation"],
            "voice_stats": {
                "speeches_count": 30,
                "total_speaking_time": 3000,
                "avg_support_score": 4.2
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "demo-user-003",
            "fomo_id": 1003,
            "name": "Test User",
            "username": "testuser",
            "avatar": None,
            "bio": "Regular club member",
            "short_bio": "Member",
            "wallet_address": "0x9876543210fedcba",
            "telegram_chat_id": None,
            "telegram_username": None,
            "telegram_connected": False,
            "role": "member",
            "level": 2,
            "xp_total": 500,
            "badges": ["participation"],
            "voice_stats": {
                "speeches_count": 5,
                "total_speaking_time": 500,
                "avg_support_score": 3.8
            },
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    for user in demo_users:
        result = await db.users.update_one(
            {"id": user["id"]},
            {"$set": user},
            upsert=True
        )
        if result.upserted_id:
            print(f"✅ Created user: {user['name']} ({user['role']})")
        else:
            print(f"📝 Updated user: {user['name']} ({user['role']})")
    
    print("\n📝 Creating club settings...")
    
    # Club settings
    club_settings = {
        "club_name": "FOMO Voice Club",
        "description": "Private voice club with reputation economy",
        "owner_id": "demo-owner-001",
        "admin_ids": ["demo-admin-002"],
        "is_private": True,
        "max_members": 1000,
        "levels": [
            {"level": 1, "name": "Observer", "xp_required": 0},
            {"level": 2, "name": "Active", "xp_required": 100},
            {"level": 3, "name": "Contributor", "xp_required": 500},
            {"level": 4, "name": "Speaker", "xp_required": 2000},
            {"level": 5, "name": "Core Voice", "xp_required": 5000}
        ],
        "badge_definitions": [
            {
                "id": "participation",
                "name": "Participation",
                "description": "Active participation in club",
                "icon": "🎖️"
            },
            {
                "id": "contribution",
                "name": "Contribution",
                "description": "Significant contributions",
                "icon": "⭐"
            },
            {
                "id": "authority",
                "name": "Authority",
                "description": "Community authority",
                "icon": "👑"
            }
        ],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.club_settings.update_one(
        {},
        {"$set": club_settings},
        upsert=True
    )
    
    if result.upserted_id:
        print(f"✅ Created club settings: {club_settings['club_name']}")
    else:
        print(f"📝 Updated club settings: {club_settings['club_name']}")
    
    print("\n" + "=" * 60)
    print("✅ INITIALIZATION COMPLETE!")
    print("=" * 60)
    
    # Show stats
    users_count = await db.users.count_documents({})
    club_count = await db.club_settings.count_documents({})
    
    print(f"\n📊 Database Stats:")
    print(f"   Users: {users_count}")
    print(f"   Club Settings: {club_count}")
    
    print("\n🎉 Demo users created successfully!")
    print("\nDemo accounts:")
    print("  1. demo-owner-001 (Owner) - Club Owner")
    print("  2. demo-admin-002 (Admin) - Admin User")
    print("  3. demo-user-003 (Member) - Test User")
    
    print("\n✨ Your FOMO Voice Club is ready to use!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(init_demo_data())
