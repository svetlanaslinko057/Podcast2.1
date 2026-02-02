"""
RSS & Webhooks Routes
"""
from fastapi import APIRouter, HTTPException, Query, Response
from typing import List
from datetime import datetime, timezone

from models import Webhook, WebhookCreate, WebhookUpdate
from rss_generator import generate_author_rss_feed, generate_podcast_rss_feed, get_base_url_from_env
from webhook_service import WEBHOOK_EVENTS

router = APIRouter(tags=["rss-webhooks"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


async def get_webhook_service():
    """Get webhook service instance"""
    from webhook_service import webhook_service
    return webhook_service


# ========== RSS Routes ==========

@router.get("/rss/author/{author_id}")
async def get_author_rss_feed(author_id: str):
    """Get RSS feed for all podcasts by an author"""
    db = await get_db()
    
    # Get author
    author = await db.authors.find_one({"id": author_id}, {"_id": 0})
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Get all public podcasts by author
    podcasts = await db.podcasts.find(
        {
            "author_id": author_id,
            "visibility": "public",
            "audio_file_id": {"$exists": True, "$ne": None}
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Generate RSS feed
    base_url = get_base_url_from_env()
    rss_xml = generate_author_rss_feed(author, podcasts, base_url)
    
    return Response(content=rss_xml, media_type="application/rss+xml")


@router.get("/rss/podcast/{podcast_id}")
async def get_podcast_rss_feed(podcast_id: str):
    """Get RSS feed for a single podcast"""
    db = await get_db()
    
    # Get podcast
    podcast = await db.podcasts.find_one({"id": podcast_id}, {"_id": 0})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    if podcast.get('visibility') != 'public':
        raise HTTPException(status_code=403, detail="Podcast is not public")
    
    # Get author
    author = await db.authors.find_one({"id": podcast['author_id']}, {"_id": 0})
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Generate RSS feed
    base_url = get_base_url_from_env()
    rss_xml = generate_podcast_rss_feed(podcast, author, base_url)
    
    return Response(content=rss_xml, media_type="application/rss+xml")


# ========== Webhooks Routes ==========

@router.post("/webhooks", response_model=Webhook)
async def create_webhook(webhook: WebhookCreate):
    """Create a new webhook subscription"""
    db = await get_db()
    
    # Validate events
    invalid_events = [e for e in webhook.events if e not in WEBHOOK_EVENTS]
    if invalid_events:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid events: {invalid_events}. Valid events: {WEBHOOK_EVENTS}"
        )
    
    webhook_dict = webhook.model_dump()
    webhook_obj = Webhook(**webhook_dict)
    
    doc = webhook_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('last_triggered_at'):
        doc['last_triggered_at'] = doc['last_triggered_at'].isoformat()
    
    await db.webhooks.insert_one(doc)
    return webhook_obj


@router.get("/webhooks/user/{user_id}", response_model=List[Webhook])
async def get_user_webhooks(user_id: str):
    """Get all webhooks for a user"""
    db = await get_db()
    
    webhooks = await db.webhooks.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Convert datetime strings
    for webhook in webhooks:
        if isinstance(webhook.get('created_at'), str):
            webhook['created_at'] = datetime.fromisoformat(webhook['created_at'])
        if isinstance(webhook.get('updated_at'), str):
            webhook['updated_at'] = datetime.fromisoformat(webhook['updated_at'])
        if webhook.get('last_triggered_at') and isinstance(webhook['last_triggered_at'], str):
            webhook['last_triggered_at'] = datetime.fromisoformat(webhook['last_triggered_at'])
    
    return webhooks


@router.get("/webhooks/{webhook_id}", response_model=Webhook)
async def get_webhook(webhook_id: str):
    """Get a specific webhook by ID"""
    db = await get_db()
    
    webhook = await db.webhooks.find_one({"id": webhook_id}, {"_id": 0})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Convert datetime strings
    if isinstance(webhook.get('created_at'), str):
        webhook['created_at'] = datetime.fromisoformat(webhook['created_at'])
    if isinstance(webhook.get('updated_at'), str):
        webhook['updated_at'] = datetime.fromisoformat(webhook['updated_at'])
    if webhook.get('last_triggered_at') and isinstance(webhook['last_triggered_at'], str):
        webhook['last_triggered_at'] = datetime.fromisoformat(webhook['last_triggered_at'])
    
    return webhook


@router.put("/webhooks/{webhook_id}", response_model=Webhook)
async def update_webhook(webhook_id: str, update: WebhookUpdate):
    """Update webhook configuration"""
    db = await get_db()
    
    webhook = await db.webhooks.find_one({"id": webhook_id})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Validate events if provided
    if 'events' in update_data:
        invalid_events = [e for e in update_data['events'] if e not in WEBHOOK_EVENTS]
        if invalid_events:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid events: {invalid_events}"
            )
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.webhooks.update_one(
        {"id": webhook_id},
        {"$set": update_data}
    )
    
    # Return updated webhook
    updated_webhook = await db.webhooks.find_one({"id": webhook_id}, {"_id": 0})
    
    # Convert datetime strings
    if isinstance(updated_webhook.get('created_at'), str):
        updated_webhook['created_at'] = datetime.fromisoformat(updated_webhook['created_at'])
    if isinstance(updated_webhook.get('updated_at'), str):
        updated_webhook['updated_at'] = datetime.fromisoformat(updated_webhook['updated_at'])
    if updated_webhook.get('last_triggered_at') and isinstance(updated_webhook['last_triggered_at'], str):
        updated_webhook['last_triggered_at'] = datetime.fromisoformat(updated_webhook['last_triggered_at'])
    
    return updated_webhook


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str):
    """Delete a webhook"""
    db = await get_db()
    
    result = await db.webhooks.delete_one({"id": webhook_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Also delete webhook logs
    await db.webhook_logs.delete_many({"webhook_id": webhook_id})
    
    return {"success": True, "message": "Webhook deleted"}


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(webhook_id: str):
    """Test a webhook by sending a test payload"""
    db = await get_db()
    webhook_service = await get_webhook_service()
    
    webhook = await db.webhooks.find_one({"id": webhook_id}, {"_id": 0})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Test the webhook
    result = await webhook_service.test_webhook(
        url=webhook['url'],
        secret=webhook.get('secret')
    )
    
    return result


@router.get("/webhooks/{webhook_id}/logs")
async def get_webhook_logs(
    webhook_id: str,
    limit: int = Query(50, ge=1, le=100)
):
    """Get recent webhook call logs"""
    db = await get_db()
    
    logs = await db.webhook_logs.find(
        {"webhook_id": webhook_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs


@router.get("/webhooks/events/list")
async def list_webhook_events():
    """Get list of available webhook events"""
    return {
        "events": WEBHOOK_EVENTS,
        "descriptions": {
            "podcast.created": "Triggered when a new podcast is created",
            "podcast.updated": "Triggered when a podcast is updated",
            "podcast.deleted": "Triggered when a podcast is deleted",
            "comment.created": "Triggered when a new comment is posted",
            "reaction.added": "Triggered when a reaction is added",
            "follower.new": "Triggered when someone follows an author",
            "live.started": "Triggered when a live broadcast starts",
            "live.ended": "Triggered when a live broadcast ends"
        }
    }
