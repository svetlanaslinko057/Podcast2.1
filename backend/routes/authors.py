"""
Authors Routes - User/Author management endpoints
"""
from fastapi import APIRouter, Form, HTTPException
from typing import Optional
import uuid
from datetime import datetime, timezone

from models import Author, AuthorCreate, AuthorUpdate, Subscription, Notification
from rating_calculator import calculate_author_rating, update_author_metrics

router = APIRouter(prefix="/authors", tags=["authors"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


@router.post("", response_model=Author)
async def create_author(author: AuthorCreate):
    """Create or update author"""
    db = await get_db()
    
    author_dict = author.model_dump()
    
    # Use provided ID or generate new one
    author_id = author_dict.get('id') or str(uuid.uuid4())
    
    # Check if author already exists
    existing = await db.authors.find_one({"id": author_id})
    
    if existing:
        # Update existing author (only non-null values)
        update_data = {k: v for k, v in author_dict.items() if v is not None and k != 'id'}
        if update_data:
            update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            await db.authors.update_one(
                {"id": author_id},
                {"$set": update_data}
            )
        
        # Return updated author with recalculated rating
        updated = await db.authors.find_one({"id": author_id}, {"_id": 0})
        updated_with_rating = await update_author_metrics(updated, db)
        
        # Save updated rating
        await db.authors.update_one(
            {"id": author_id},
            {"$set": {
                "rating": updated_with_rating['rating'],
                "activity_score": updated_with_rating['activity_score']
            }}
        )
        
        return Author(**updated_with_rating)
    else:
        # Create new author with provided or generated ID
        author_dict['id'] = author_id
        
        # New users start with rating = 0 (black/dark-red border)
        author_dict['rating'] = 0
        author_dict['activity_score'] = 0
        
        # Set default values for new users
        if 'followers_count' not in author_dict:
            author_dict['followers_count'] = 0
        if 'following_count' not in author_dict:
            author_dict['following_count'] = 0
        if 'podcasts_count' not in author_dict:
            author_dict['podcasts_count'] = 0
        
        author_obj = Author(**author_dict)
        doc = author_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.authors.insert_one(doc)
        return author_obj


@router.get("")
async def get_authors(
    limit: int = 50, 
    skip: int = 0,
    sort_by: str = "popular"
):
    """
    Get all authors with sorting options:
    - popular: most engagement (total likes + comments on podcasts)
    - new: recently created authors
    - active: most frequently publishing (podcasts count + recent activity)
    - followers: most followers
    """
    db = await get_db()
    
    # Build aggregation pipeline for sorting
    pipeline = []
    
    if sort_by == "popular":
        # Popular = most engagement (likes, comments, views on their podcasts)
        pipeline = [
            {"$lookup": {
                "from": "podcasts",
                "localField": "id",
                "foreignField": "author_id",
                "as": "podcasts"
            }},
            {"$addFields": {
                "total_engagement": {
                    "$sum": [
                        {"$ifNull": ["$followers_count", 0]},
                        {"$multiply": [
                            {"$sum": "$podcasts.reactions_count"},
                            2
                        ]},
                        {"$sum": "$podcasts.comments_count"},
                        {"$divide": [{"$sum": "$podcasts.views_count"}, 10]}
                    ]
                }
            }},
            {"$sort": {"total_engagement": -1}},
            {"$project": {"podcasts": 0, "total_engagement": 0, "_id": 0}},
            {"$skip": skip},
            {"$limit": limit}
        ]
    elif sort_by == "new":
        # New = recently created
        pipeline = [
            {"$sort": {"created_at": -1}},
            {"$project": {"_id": 0}},
            {"$skip": skip},
            {"$limit": limit}
        ]
    elif sort_by == "active":
        # Active = most podcasts (simplified - sort by podcasts_count)
        pipeline = [
            {"$sort": {"podcasts_count": -1, "created_at": -1}},
            {"$project": {"_id": 0}},
            {"$skip": skip},
            {"$limit": limit}
        ]
    elif sort_by == "followers":
        # Top Followed = most followers
        pipeline = [
            {"$sort": {"followers_count": -1}},
            {"$project": {"_id": 0}},
            {"$skip": skip},
            {"$limit": limit}
        ]
    else:
        # Default: simple query
        authors = await db.authors.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        return authors
    
    authors = await db.authors.aggregate(pipeline).to_list(limit)
    return authors


@router.get("/{author_id}")
async def get_author(author_id: str, recalculate: bool = False):
    """
    Get author by ID
    
    Args:
        author_id: Author ID
        recalculate: If True, recalculate rating from current metrics
    """
    db = await get_db()
    author = await db.authors.find_one({"id": author_id}, {"_id": 0})
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Optionally recalculate rating on-demand
    if recalculate:
        author = await update_author_metrics(author, db)
        await db.authors.update_one(
            {"id": author_id},
            {"$set": {
                "rating": author['rating'],
                "activity_score": author['activity_score'],
                "podcasts_count": author['podcasts_count']
            }}
        )
    
    return author


@router.put("/{author_id}")
async def update_author(author_id: str, update: AuthorUpdate):
    """Update author and recalculate rating"""
    db = await get_db()
    
    existing = await db.authors.find_one({"id": author_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Author not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow().isoformat()
    
    await db.authors.update_one(
        {"id": author_id},
        {"$set": update_data}
    )
    
    # Get updated author and recalculate rating
    updated = await db.authors.find_one({"id": author_id}, {"_id": 0})
    updated_with_rating = await update_author_metrics(updated, db)
    
    # Save updated rating
    await db.authors.update_one(
        {"id": author_id},
        {"$set": {
            "rating": updated_with_rating['rating'],
            "activity_score": updated_with_rating['activity_score']
        }}
    )
    
    return updated_with_rating


@router.delete("/{author_id}")
async def delete_author(author_id: str):
    """Delete author"""
    db = await get_db()
    result = await db.authors.delete_one({"id": author_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Author not found")
    return {"message": "Author deleted"}


@router.post("/{author_id}/follow")
async def follow_author(author_id: str, user_id: str = Form(...)):
    """Follow an author"""
    db = await get_db()
    
    author = await db.authors.find_one({"id": author_id})
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    existing = await db.subscriptions.find_one({"author_id": author_id, "follower_id": user_id})
    if existing:
        return {"message": "Already following", "is_following": True}
    
    subscription = Subscription(follower_id=user_id, author_id=author_id)
    doc = subscription.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.subscriptions.insert_one(doc)
    
    # Update counts
    await db.authors.update_one({"id": author_id}, {"$inc": {"followers_count": 1}})
    await db.authors.update_one({"id": user_id}, {"$inc": {"following_count": 1}})
    
    # Create notification
    notification = Notification(
        user_id=author_id,
        type="new_follower",
        title="New Follower",
        message="Someone started following you!",
        link=f"/author/{user_id}"
    )
    notif_doc = notification.model_dump()
    notif_doc['created_at'] = notif_doc['created_at'].isoformat()
    await db.notifications.insert_one(notif_doc)
    
    # Trigger webhook
    from webhook_service import webhook_service
    follower = await db.authors.find_one({"id": user_id}, {"_id": 0})
    await webhook_service.trigger_webhooks('follower.new', {
        'author_id': author_id,
        'author_name': author.get('name'),
        'follower_id': user_id,
        'follower_name': follower.get('name') if follower else 'Unknown',
        'follower_username': follower.get('username') if follower else user_id
    })
    
    return {"message": "Successfully followed", "is_following": True}


@router.post("/{author_id}/unfollow")
async def unfollow_author(author_id: str, user_id: str = Form(...)):
    """Unfollow an author"""
    db = await get_db()
    
    result = await db.subscriptions.delete_one({"author_id": author_id, "follower_id": user_id})
    if result.deleted_count == 0:
        return {"message": "Not following", "is_following": False}
    
    # Update counts
    await db.authors.update_one({"id": author_id}, {"$inc": {"followers_count": -1}})
    await db.authors.update_one({"id": user_id}, {"$inc": {"following_count": -1}})
    
    return {"message": "Successfully unfollowed", "is_following": False}


@router.get("/{author_id}/followers")
async def get_followers(author_id: str):
    """Get author's followers"""
    db = await get_db()
    subscriptions = await db.subscriptions.find({"author_id": author_id}).to_list(1000)
    follower_ids = [s["follower_id"] for s in subscriptions]
    
    if not follower_ids:
        return []
    
    followers = await db.authors.find(
        {"id": {"$in": follower_ids}},
        {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar": 1}
    ).to_list(1000)
    
    return followers


@router.get("/{author_id}/following")
async def get_following(author_id: str):
    """Get authors that this author follows"""
    db = await get_db()
    subscriptions = await db.subscriptions.find({"follower_id": author_id}).to_list(1000)
    author_ids = [s["author_id"] for s in subscriptions]
    
    if not author_ids:
        return []
    
    following = await db.authors.find(
        {"id": {"$in": author_ids}},
        {"_id": 0, "id": 1, "name": 1, "username": 1, "avatar": 1}
    ).to_list(1000)
    
    return following



@router.get("/{author_id}/is-following")
async def check_is_following(author_id: str, user_id: str):
    """Check if user is following author"""
    db = await get_db()
    subscription = await db.subscriptions.find_one({
        "author_id": author_id,
        "follower_id": user_id
    })
    return {"is_following": subscription is not None}


@router.post("/{author_id}/recalculate-rating")
async def recalculate_author_rating(author_id: str):
    """Recalculate author rating based on podcasts statistics"""
    db = await get_db()
    
    # Get author
    author = await db.authors.find_one({"id": author_id})
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    
    # Get all author's podcasts
    podcasts = await db.podcasts.find({"author_id": author_id}, {"_id": 0}).to_list(1000)
    
    # Calculate rating and statistics
    from services.rating_service import calculate_author_rating, get_author_statistics
    
    new_rating = calculate_author_rating(author, podcasts)
    stats = get_author_statistics(podcasts)
    
    # Update author
    await db.authors.update_one(
        {"id": author_id},
        {"$set": {
            "rating": new_rating,
            "total_listens": stats['total_listens'],
            "total_likes": stats['total_likes'],
            "total_saves": stats['total_saves'],
            "total_reactions": stats['total_reactions'],
            "total_views": stats['total_views']
        }}
    )
    
    return {
        "author_id": author_id,
        "rating": new_rating,
        "statistics": stats
    }


@router.post("/recalculate-all-ratings")
async def recalculate_all_ratings():
    """Recalculate ratings for all authors"""
    db = await get_db()
    from services.rating_service import calculate_author_rating, get_author_statistics
    
    authors = await db.authors.find({}, {"_id": 0}).to_list(1000)
    updated_count = 0
    
    for author in authors:
        author_id = author['id']
        
        # Get author's podcasts
        podcasts = await db.podcasts.find({"author_id": author_id}, {"_id": 0}).to_list(1000)
        
        # Calculate rating
        new_rating = calculate_author_rating(author, podcasts)
        stats = get_author_statistics(podcasts)
        
        # Update
        await db.authors.update_one(
            {"id": author_id},
            {"$set": {
                "rating": new_rating,
                "total_listens": stats['total_listens'],
                "total_likes": stats['total_likes'],
                "total_saves": stats['total_saves'],
                "total_reactions": stats['total_reactions'],
                "total_views": stats['total_views']
            }}
        )
        updated_count += 1
    
    return {
        "message": f"Recalculated ratings for {updated_count} authors",
        "updated_count": updated_count
    }


@router.post("/recalculate-ratings")
async def recalculate_all_ratings():
    """
    Recalculate ratings for all authors based on their current metrics
    Useful for: initial setup, after algorithm changes, periodic maintenance
    """
    db = await get_db()
    
    authors = await db.authors.find({}, {"_id": 0}).to_list(None)
    updated_count = 0
    
    for author in authors:
        try:
            # Recalculate rating based on current metrics
            updated_author = await update_author_metrics(author, db)
            
            # Update in database
            await db.authors.update_one(
                {"id": author['id']},
                {"$set": {
                    "rating": updated_author['rating'],
                    "activity_score": updated_author['activity_score'],
                    "podcasts_count": updated_author['podcasts_count']
                }}
            )
            updated_count += 1
        except Exception as e:
            print(f"Error updating author {author.get('id')}: {e}")
            continue
    
    return {
        "message": f"Successfully recalculated ratings for {updated_count} authors",
        "total_processed": len(authors),
        "updated_count": updated_count
    }


    return {"is_following": subscription is not None}
