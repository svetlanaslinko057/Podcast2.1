"""
Migration Script: Multi-Creator Platform → Private Voice Club
Transforms 'authors' collection to 'users' collection
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
import sys

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()


async def migrate_authors_to_users():
    """
    Transform authors → users with new Private Voice Club structure
    """
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("=" * 60)
    print("MIGRATION: Authors → Users (Private Voice Club)")
    print("=" * 60)
    
    # 1. Check if migration already done
    users_count = await db.users.count_documents({})
    if users_count > 0:
        print(f"\n⚠️  WARNING: 'users' collection already has {users_count} documents")
        response = input("Continue migration anyway? This will update existing users. (y/n): ")
        if response.lower() != 'y':
            print("Migration cancelled.")
            return
    
    # 2. Get all authors
    authors = await db.authors.find({}).to_list(length=None)
    
    if not authors:
        print("\n❌ No authors found in database!")
        print("Please create at least one author/user first.")
        return
    
    print(f"\nFound {len(authors)} authors to migrate\n")
    
    migrated_count = 0
    
    for author in authors:
        # 3. Create user with new structure
        user_data = {
            # Copy existing fields
            "id": author.get('id'),
            "fomo_id": author.get('fomo_id'),
            "name": author.get('name', 'Unknown'),
            "username": author.get('username', 'user'),
            "avatar": author.get('avatar'),
            "bio": author.get('bio'),
            "short_bio": author.get('short_bio'),
            "wallet_address": author.get('wallet_address'),
            
            # New Club fields
            "role": "listener",  # Default role for all
            "level": 1,          # Start at level 1
            "joined_at": author.get('created_at', datetime.now(timezone.utc)),
            "days_in_club": 0,
            
            # XP System (start from scratch)
            "xp_total": 0,
            "xp_breakdown": {
                "listening_time": 0,
                "podcasts_listened": 0,
                "live_attendance": 0,
                "hand_raises": 0,
                "speeches_given": 0,
                "support_received": 0
            },
            
            # Badges (empty to start)
            "badges": [],
            
            # Voice Stats (empty to start)
            "voice_stats": {
                "total_speeches": 0,
                "total_speech_time_minutes": 0,
                "hand_raise_count": 0,
                "hand_raise_success_rate": 0.0,
                "topics_participated": [],
                "support_received": 0,
                "last_speech_at": None
            },
            
            # Engagement scores
            "engagement_score": 0.0,
            "priority_score": 50.0,
            
            # Keep telegram integration
            "telegram_connected": author.get('telegram_connected', False),
            "telegram_chat_id": author.get('telegram_chat_id'),
            "telegram_username": author.get('telegram_username'),
            
            # Keep social links
            "social_links": author.get('social_links', {
                'twitter': None,
                'discord': None,
                'telegram': None,
                'youtube': None,
                'tiktok': None,
                'website': None
            }),
            
            # Keep referral system
            "referral_code": author.get('referral_code'),
            "referred_by": author.get('referred_by'),
            "referral_count": author.get('referral_count', 0),
            
            "created_at": author.get('created_at', datetime.now(timezone.utc))
        }
        
        # 4. Upsert into users collection
        await db.users.update_one(
            {"id": user_data['id']},
            {"$set": user_data},
            upsert=True
        )
        
        migrated_count += 1
        print(f"✅ Migrated: {user_data['name']} ({user_data['id']})")
    
    print(f"\n{'=' * 60}")
    print(f"✅ Migration complete! {migrated_count} users created/updated")
    print(f"{'=' * 60}\n")


async def create_club_settings():
    """
    Create club settings if not exists
    """
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("\n" + "=" * 60)
    print("CREATING CLUB SETTINGS")
    print("=" * 60)
    
    # Check if already exists
    existing = await db.club_settings.find_one({})
    if existing:
        print("\n⚠️  Club settings already exist:")
        print(f"   Club Name: {existing.get('club_name')}")
        print(f"   Owner: {existing.get('club_owner_wallet')}")
        print("\nSkipping club creation.")
        return
    
    # Get first user to make them Owner
    first_user = await db.users.find_one({})
    
    if not first_user:
        print("\n❌ No users found! Please run migration first.")
        return
    
    print(f"\nFound user: {first_user['name']}")
    print(f"Wallet: {first_user.get('wallet_address', 'N/A')}")
    
    # Ask for confirmation
    response = input(f"\nMake '{first_user['name']}' the Club Owner? (y/n): ")
    if response.lower() != 'y':
        print("Club creation cancelled.")
        return
    
    # Create club settings
    club_data = {
        "club_name": "FOMO Voice Club",
        "club_description": "Private podcast club with reputation economy",
        "club_owner_wallet": first_user.get('wallet_address', f"wallet_{first_user['id']}"),
        "club_admin_wallets": [],
        "max_members": 1000,
        "registration_mode": "open",
        "enable_hand_raise": True,
        "hand_raise_queue_limit": 10,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.club_settings.insert_one(club_data)
    
    # Update user role to owner
    await db.users.update_one(
        {"id": first_user['id']},
        {"$set": {"role": "owner"}}
    )
    
    print(f"\n✅ Club created successfully!")
    print(f"   Owner: {first_user['name']} ({first_user.get('wallet_address')})")
    print(f"   Role: owner")


async def create_collections_indexes():
    """
    Create indexes for new collections
    """
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("\n" + "=" * 60)
    print("CREATING INDEXES")
    print("=" * 60)
    
    # Users indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("wallet_address")
    await db.users.create_index("role")
    await db.users.create_index("level")
    await db.users.create_index("xp_total")
    await db.users.create_index("engagement_score")
    print("✅ Created indexes for 'users' collection")
    
    # XP transactions indexes
    await db.xp_transactions.create_index("user_id")
    await db.xp_transactions.create_index("timestamp")
    await db.xp_transactions.create_index([("user_id", 1), ("timestamp", -1)])
    print("✅ Created indexes for 'xp_transactions' collection")
    
    # Hand raise events indexes
    await db.hand_raise_events.create_index("user_id")
    await db.hand_raise_events.create_index("live_session_id")
    await db.hand_raise_events.create_index("status")
    await db.hand_raise_events.create_index([("live_session_id", 1), ("status", 1)])
    print("✅ Created indexes for 'hand_raise_events' collection")
    
    # Speech support indexes
    await db.speech_support.create_index("speech_id")
    await db.speech_support.create_index("speaker_id")
    await db.speech_support.create_index("supporter_id")
    print("✅ Created indexes for 'speech_support' collection")
    
    print("\n✅ All indexes created successfully!")


async def backup_authors_collection():
    """
    Backup authors collection before migration
    """
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("\n" + "=" * 60)
    print("BACKING UP AUTHORS COLLECTION")
    print("=" * 60)
    
    # Check if backup already exists
    existing_backup = await db.authors_backup.find_one({})
    if existing_backup:
        print("\n⚠️  Backup already exists (authors_backup)")
        response = input("Overwrite existing backup? (y/n): ")
        if response.lower() != 'y':
            print("Backup skipped.")
            return
        # Drop existing backup
        await db.authors_backup.drop()
    
    # Copy all authors to backup
    authors = await db.authors.find({}).to_list(length=None)
    if authors:
        await db.authors_backup.insert_many(authors)
        print(f"\n✅ Backed up {len(authors)} authors to 'authors_backup' collection")
    else:
        print("\n⚠️  No authors to backup")


async def show_migration_summary():
    """
    Show summary of migration
    """
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    
    # Count documents
    users_count = await db.users.count_documents({})
    authors_count = await db.authors.count_documents({})
    club_exists = await db.club_settings.find_one({}) is not None
    
    print(f"\n📊 Collections:")
    print(f"   Users: {users_count}")
    print(f"   Authors (old): {authors_count}")
    print(f"   Club Settings: {'✅ Created' if club_exists else '❌ Not created'}")
    
    # Get owner if exists
    owner = await db.users.find_one({"role": "owner"})
    if owner:
        print(f"\n👑 Club Owner:")
        print(f"   Name: {owner['name']}")
        print(f"   ID: {owner['id']}")
        print(f"   Wallet: {owner.get('wallet_address', 'N/A')}")
    
    # Role distribution
    print(f"\n📈 Role Distribution:")
    roles = await db.users.aggregate([
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]).to_list(length=None)
    
    for role_data in roles:
        role = role_data['_id'] or 'undefined'
        count = role_data['count']
        print(f"   {role}: {count}")
    
    print(f"\n{'=' * 60}")
    print("✅ MIGRATION COMPLETE!")
    print(f"{'=' * 60}\n")


async def main():
    """
    Main migration workflow
    """
    print("\n" + "🚀" * 30)
    print("PRIVATE VOICE CLUB MIGRATION")
    print("Multi-Creator Platform → Private Voice Club")
    print("🚀" * 30 + "\n")
    
    try:
        # Step 1: Backup
        await backup_authors_collection()
        
        # Step 2: Migrate authors → users
        await migrate_authors_to_users()
        
        # Step 3: Create club settings
        await create_club_settings()
        
        # Step 4: Create indexes
        await create_collections_indexes()
        
        # Step 5: Show summary
        await show_migration_summary()
        
        print("\n🎉 All done! Your Private Voice Club is ready!")
        print("\nNext steps:")
        print("  1. Restart backend: sudo supervisorctl restart backend")
        print("  2. Test club endpoints: curl http://localhost:8001/api/club/settings")
        print("  3. Check users: curl http://localhost:8001/api/users")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
