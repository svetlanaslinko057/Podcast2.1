"""
Update club settings with wallet addresses
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def update_club_settings():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Update club settings with wallet addresses
    result = await db.club_settings.update_one(
        {},
        {
            "$set": {
                "owner_wallet": "",  # Пустой - настраивается через админку
                "admin_wallets": []  # Массив кошельков админов
            }
        }
    )
    
    print("✅ Club settings updated with wallet fields")
    
    # Show current settings
    settings = await db.club_settings.find_one({})
    print(f"\n📋 Current settings:")
    print(f"   Owner wallet: {settings.get('owner_wallet', 'Not set')}")
    print(f"   Admin wallets: {settings.get('admin_wallets', [])}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_club_settings())
