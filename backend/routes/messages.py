"""
Messages Routes - Direct messaging functionality
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
import uuid
import base64

from models import Message, Notification

router = APIRouter(prefix="/messages", tags=["messages"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


@router.get("/{user1_id}/{user2_id}")
async def get_messages(user1_id: str, user2_id: str):
    """Get messages between two users"""
    db = await get_db()
    
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user1_id, "recipient_id": user2_id},
            {"sender_id": user2_id, "recipient_id": user1_id}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": user2_id, "recipient_id": user1_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    # Format time for display
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            try:
                dt = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
                msg['time'] = dt.strftime("%H:%M")
            except Exception:
                msg['time'] = ""
    
    return messages


@router.post("")
async def send_message(message: Message):
    """Send a message"""
    db = await get_db()
    
    msg_dict = message.model_dump()
    msg_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    msg_dict['is_read'] = False
    
    if not msg_dict.get('id'):
        msg_dict['id'] = str(uuid.uuid4())
    
    await db.messages.insert_one(msg_dict)
    
    # Create notification for recipient
    notification = Notification(
        user_id=message.recipient_id,
        type="message",
        title="New Message",
        message=f"You have a new message",
        link=f"/social?tab=messages"
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return {"message": "Message sent", "id": msg_dict['id']}


@router.post("/with-file")
async def send_message_with_file(
    sender_id: str = Form(...),
    recipient_id: str = Form(...),
    content: str = Form(""),
    file: Optional[UploadFile] = File(None)
):
    """Send a message with optional file attachment"""
    db = await get_db()
    
    attachment_url = None
    attachment_type = None
    attachment_name = None
    
    if file:
        # Read file content
        file_content = await file.read()
        
        # Determine file type
        content_type = file.content_type or ""
        if content_type.startswith("image/"):
            attachment_type = "image"
        elif content_type.startswith("audio/"):
            attachment_type = "audio"
        else:
            attachment_type = "file"
        
        # Convert to base64 for storage (for small files)
        # In production, you'd upload to S3/GCS
        if len(file_content) <= 5 * 1024 * 1024:  # 5MB limit
            attachment_url = f"data:{content_type};base64,{base64.b64encode(file_content).decode()}"
            attachment_name = file.filename
        else:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    
    msg_dict = {
        "id": str(uuid.uuid4()),
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "content": content,
        "attachment_url": attachment_url,
        "attachment_type": attachment_type,
        "attachment_name": attachment_name,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(msg_dict)
    
    # Create notification for recipient
    notif_dict = {
        "id": str(uuid.uuid4()),
        "user_id": recipient_id,
        "type": "message",
        "title": "New Message",
        "message": "You have a new message" + (" with attachment" if attachment_url else ""),
        "link": "/social?tab=messages",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif_dict)
    
    return {
        "message": "Message sent",
        "id": msg_dict['id'],
        "attachment_type": attachment_type,
        "attachment_name": attachment_name
    }


@router.delete("/{user1_id}/{user2_id}")
async def delete_conversation(user1_id: str, user2_id: str):
    """Delete all messages between two users"""
    db = await get_db()
    
    result = await db.messages.delete_many({
        "$or": [
            {"sender_id": user1_id, "recipient_id": user2_id},
            {"sender_id": user2_id, "recipient_id": user1_id}
        ]
    })
    
    return {"message": "Conversation deleted", "deleted_count": result.deleted_count}


# User conversations endpoint (under /users prefix)
from fastapi import APIRouter as ConvRouter

users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("/{user_id}/conversations")
async def get_conversations(user_id: str):
    """Get all conversations for user"""
    db = await get_db()
    
    # Get all messages involving this user
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"sender_id": user_id},
                    {"recipient_id": user_id}
                ]
            }
        },
        {
            "$sort": {"created_at": -1}
        },
        {
            "$group": {
                "_id": {
                    "$cond": [
                        {"$eq": ["$sender_id", user_id]},
                        "$recipient_id",
                        "$sender_id"
                    ]
                },
                "last_message": {"$first": "$content"},
                "last_time": {"$first": "$created_at"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$recipient_id", user_id]},
                                {"$eq": ["$is_read", False]}
                            ]},
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]
    
    conversations = await db.messages.aggregate(pipeline).to_list(100)
    
    if not conversations:
        return []
    
    # Get user details for each conversation
    user_ids = [conv["_id"] for conv in conversations]
    users = await db.authors.find(
        {"id": {"$in": user_ids}},
        {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar": 1}
    ).to_list(100)
    
    users_map = {u["id"]: u for u in users}
    
    # Format conversations
    result = []
    for conv in conversations:
        other_user = users_map.get(conv["_id"], {})
        
        # Format time
        time_str = ""
        if isinstance(conv.get('last_time'), str):
            try:
                dt = datetime.fromisoformat(conv['last_time'].replace('Z', '+00:00'))
                time_str = dt.strftime("%H:%M")
            except Exception:
                pass
        
        result.append({
            "user_id": conv["_id"],
            "user_name": other_user.get("name", "Unknown"),
            "username": other_user.get("username", ""),
            "avatar": other_user.get("avatar", ""),
            "last_message": conv["last_message"],
            "time": time_str,
            "unread_count": conv["unread_count"]
        })
    
    return result


@users_router.get("/{user_id}/playlists")
async def get_user_playlists_alt(user_id: str):
    """Get all playlists for a specific user (alternative route)"""
    db = await get_db()
    
    playlists = await db.playlists.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    # Enrich with podcast data
    for playlist in playlists:
        if playlist.get("podcast_ids"):
            podcasts = await db.podcasts.find(
                {"id": {"$in": playlist["podcast_ids"]}},
                {"_id": 0, "id": 1, "title": 1, "cover_image": 1, "duration": 1, "author_id": 1}
            ).to_list(length=100)
            playlist["podcasts"] = podcasts
    
    return playlists

