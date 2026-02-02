"""
Create Full Demo Data with XP transactions and Live Sessions
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv
import uuid

load_dotenv()


async def create_full_demo_data():
    """Create comprehensive demo data"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("=" * 60)
    print("CREATING FULL DEMO DATA")
    print("=" * 60)
    
    # 1. Update existing users with more detailed data
    print("\n📝 Updating users with detailed XP data...")
    
    users_updates = [
        {
            "id": "demo-owner-001",
            "xp_breakdown": {
                "listening_time": 3000,
                "live_attendance": 2500,
                "hand_raises": 40,
                "speeches_given": 100,
                "support_received": 10
            }
        },
        {
            "id": "demo-admin-002",
            "xp_breakdown": {
                "listening_time": 1500,
                "live_attendance": 1200,
                "hand_raises": 25,
                "speeches_given": 60,
                "support_received": 8
            }
        },
        {
            "id": "demo-user-003",
            "xp_breakdown": {
                "listening_time": 200,
                "live_attendance": 150,
                "hand_raises": 10,
                "speeches_given": 5,
                "support_received": 2
            }
        }
    ]
    
    for update in users_updates:
        user_id = update["id"]
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": {"xp_breakdown": update["xp_breakdown"]}}
        )
        print(f"✅ Updated XP breakdown for {user_id}")
    
    # 2. Create XP transactions
    print("\n📝 Creating XP transactions...")
    
    xp_transactions = [
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo-owner-001",
            "xp_amount": 50,
            "reason": "Attended live session",
            "source": "live_attendance",
            "created_at": datetime.now(timezone.utc) - timedelta(days=1)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo-owner-001",
            "xp_amount": 20,
            "reason": "Gave a speech",
            "source": "speech",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=12)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo-admin-002",
            "xp_amount": 30,
            "reason": "Listened to podcast",
            "source": "listening",
            "created_at": datetime.now(timezone.utc) - timedelta(days=2)
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo-user-003",
            "xp_amount": 10,
            "reason": "Raised hand in session",
            "source": "hand_raise",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=6)
        }
    ]
    
    for transaction in xp_transactions:
        await db.xp_transactions.update_one(
            {"id": transaction["id"]},
            {"$set": transaction},
            upsert=True
        )
    
    print(f"✅ Created {len(xp_transactions)} XP transactions")
    
    # 3. Create a test live session
    print("\n📝 Creating test live session...")
    
    live_session = {
        "id": "live-session-001",
        "title": "Test Live Session - Club Discussion",
        "description": "A test live session to demonstrate hand raise functionality",
        "host_id": "demo-owner-001",
        "status": "active",  # active, scheduled, ended
        "started_at": datetime.now(timezone.utc) - timedelta(minutes=30),
        "ended_at": None,
        "participants": ["demo-owner-001", "demo-admin-002", "demo-user-003"],
        "max_participants": 50,
        "is_recording": False,
        "created_at": datetime.now(timezone.utc) - timedelta(minutes=30),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.live_sessions.update_one(
        {"id": live_session["id"]},
        {"$set": live_session},
        upsert=True
    )
    
    print(f"✅ Created live session: {live_session['title']}")
    
    # 4. Create hand raise events
    print("\n📝 Creating hand raise events...")
    
    hand_raise_events = [
        {
            "id": str(uuid.uuid4()),
            "session_id": "live-session-001",
            "user_id": "demo-user-003",
            "status": "pending",  # pending, approved, rejected, completed
            "raised_at": datetime.now(timezone.utc) - timedelta(minutes=5),
            "approved_at": None,
            "speech_started_at": None,
            "speech_ended_at": None,
            "priority_score": 98.7
        },
        {
            "id": str(uuid.uuid4()),
            "session_id": "live-session-001",
            "user_id": "demo-admin-002",
            "status": "completed",
            "raised_at": datetime.now(timezone.utc) - timedelta(minutes=20),
            "approved_at": datetime.now(timezone.utc) - timedelta(minutes=18),
            "speech_started_at": datetime.now(timezone.utc) - timedelta(minutes=18),
            "speech_ended_at": datetime.now(timezone.utc) - timedelta(minutes=15),
            "priority_score": 95.2,
            "speech_duration": 180  # 3 minutes in seconds
        }
    ]
    
    for event in hand_raise_events:
        await db.hand_raise_events.update_one(
            {"id": event["id"]},
            {"$set": event},
            upsert=True
        )
    
    print(f"✅ Created {len(hand_raise_events)} hand raise events")
    
    # 5. Create test podcast
    print("\n📝 Creating test podcast...")
    
    podcast = {
        "id": "podcast-001",
        "title": "Welcome to FOMO Voice Club",
        "description": "Introduction to our private voice club and its features",
        "author_id": "demo-owner-001",
        "author_name": "Club Owner",
        "duration": 1800,  # 30 minutes
        "audio_url": None,  # Will be uploaded later
        "cover_image": None,
        "status": "published",
        "listens": 125,
        "likes": 45,
        "category": "Introduction",
        "tags": ["welcome", "introduction", "club"],
        "is_private": False,
        "created_at": datetime.now(timezone.utc) - timedelta(days=7),
        "published_at": datetime.now(timezone.utc) - timedelta(days=7),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.podcasts.update_one(
        {"id": podcast["id"]},
        {"$set": podcast},
        upsert=True
    )
    
    print(f"✅ Created podcast: {podcast['title']}")
    
    # 6. Summary
    print("\n" + "=" * 60)
    print("✅ FULL DEMO DATA CREATED!")
    print("=" * 60)
    
    users_count = await db.users.count_documents({})
    xp_txn_count = await db.xp_transactions.count_documents({})
    live_count = await db.live_sessions.count_documents({})
    hand_raise_count = await db.hand_raise_events.count_documents({})
    podcasts_count = await db.podcasts.count_documents({})
    
    print(f"\n📊 Database Stats:")
    print(f"   Users: {users_count}")
    print(f"   XP Transactions: {xp_txn_count}")
    print(f"   Live Sessions: {live_count}")
    print(f"   Hand Raise Events: {hand_raise_count}")
    print(f"   Podcasts: {podcasts_count}")
    
    print("\n🎉 Features Available:")
    print("  ✅ User Progress with XP Breakdown")
    print("  ✅ Active Live Session (live-session-001)")
    print("  ✅ Hand Raise Queue with pending requests")
    print("  ✅ Test Podcast for Library")
    print("  ✅ XP Transaction History")
    
    print("\n💡 Test Instructions:")
    print("  1. Toggle to 'Admin' mode to see Create button")
    print("  2. Visit /progress to see full XP breakdown")
    print("  3. Visit /live-room to join active session")
    print("  4. Try hand raise functionality in live room")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_full_demo_data())
