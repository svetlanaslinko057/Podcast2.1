"""
Social Features Router
Timestamped reactions, Q&A, Polls, Clips, Smart Links
"""
from fastapi import APIRouter, Form, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/social", tags=["social"])

# Shared database reference
db = None

def set_db(database):
    global db
    db = database


# ============ TIMESTAMPED REACTIONS ============

@router.post("/podcasts/{podcast_id}/reactions")
async def add_timestamped_reaction(
    podcast_id: str,
    user_id: str = Form(...),
    timestamp: int = Form(...),  # seconds
    reaction_type: str = Form(...)  # fire, heart, mind_blown, clap, laugh, sad
):
    """Add a reaction at specific timestamp"""
    try:
        reaction = {
            "id": str(uuid.uuid4()),
            "podcast_id": podcast_id,
            "user_id": user_id,
            "timestamp": timestamp,
            "reaction_type": reaction_type,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db['timestamped_reactions'].insert_one(reaction)
        
        # Also update podcast reaction count
        await db['podcasts'].update_one(
            {"id": podcast_id},
            {"$inc": {f"reactions.{reaction_type}": 1}}
        )
        
        # Remove MongoDB ObjectId from response
        reaction.pop('_id', None)
        
        logger.info(f"🔥 Reaction {reaction_type} at {timestamp}s for podcast {podcast_id}")
        return JSONResponse({"message": "Reaction added", "reaction": reaction}, status_code=201)
        
    except Exception as e:
        logger.error(f"Failed to add reaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/reactions")
async def get_timestamped_reactions(podcast_id: str):
    """Get all timestamped reactions for a podcast, grouped by timestamp"""
    try:
        reactions = await db['timestamped_reactions'].find(
            {"podcast_id": podcast_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Group by timestamp (bucket by 5 seconds)
        grouped = {}
        for r in reactions:
            bucket = (r['timestamp'] // 5) * 5  # 5-second buckets
            if bucket not in grouped:
                grouped[bucket] = {"timestamp": bucket, "reactions": {}}
            rtype = r['reaction_type']
            grouped[bucket]['reactions'][rtype] = grouped[bucket]['reactions'].get(rtype, 0) + 1
        
        return list(grouped.values())
        
    except Exception as e:
        logger.error(f"Failed to get reactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Q&A QUESTIONS ============

@router.post("/podcasts/{podcast_id}/questions")
async def add_question(
    podcast_id: str,
    user_id: str = Form(...),
    username: str = Form(...),
    text: str = Form(...),
    timestamp: Optional[int] = Form(None)  # optional timestamp reference
):
    """Add a question from listener"""
    try:
        question = {
            "id": str(uuid.uuid4()),
            "podcast_id": podcast_id,
            "user_id": user_id,
            "username": username,
            "text": text,
            "timestamp": timestamp,
            "answer": None,
            "answered_by": None,
            "answered_at": None,
            "upvotes": 0,
            "upvoted_by": [],
            "is_featured": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db['questions'].insert_one(question)
        
        # Remove MongoDB ObjectId from response
        question.pop('_id', None)
        
        logger.info(f"❓ Question added for podcast {podcast_id}")
        return JSONResponse({"message": "Question added", "question": question}, status_code=201)
        
    except Exception as e:
        logger.error(f"Failed to add question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/questions")
async def get_questions(podcast_id: str, featured_only: bool = False):
    """Get questions for podcast"""
    try:
        query = {"podcast_id": podcast_id}
        if featured_only:
            query["is_featured"] = True
            
        questions = await db['questions'].find(
            query,
            {"_id": 0}
        ).sort("upvotes", -1).to_list(100)
        
        return questions
        
    except Exception as e:
        logger.error(f"Failed to get questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/questions/{question_id}/answer")
async def answer_question(
    question_id: str,
    answer: str = Form(...),
    answered_by: str = Form(...)
):
    """Answer a question (by podcast creator)"""
    try:
        result = await db['questions'].update_one(
            {"id": question_id},
            {"$set": {
                "answer": answer,
                "answered_by": answered_by,
                "answered_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Question not found")
            
        return {"message": "Question answered"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to answer question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/questions/{question_id}/upvote")
async def upvote_question(question_id: str, user_id: str = Form(...)):
    """Upvote a question"""
    try:
        question = await db['questions'].find_one({"id": question_id})
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        upvoted_by = question.get('upvoted_by', [])
        if user_id in upvoted_by:
            # Remove upvote
            await db['questions'].update_one(
                {"id": question_id},
                {"$pull": {"upvoted_by": user_id}, "$inc": {"upvotes": -1}}
            )
            return {"message": "Upvote removed", "upvoted": False}
        else:
            # Add upvote
            await db['questions'].update_one(
                {"id": question_id},
                {"$push": {"upvoted_by": user_id}, "$inc": {"upvotes": 1}}
            )
            return {"message": "Upvoted", "upvoted": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upvote question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ POLLS ============

@router.post("/podcasts/{podcast_id}/polls")
async def create_poll(
    podcast_id: str,
    creator_id: str = Form(...),
    question: str = Form(...),
    options: str = Form(...),  # comma-separated
    timestamp: Optional[int] = Form(None)
):
    """Create a poll"""
    try:
        options_list = [opt.strip() for opt in options.split(',') if opt.strip()]
        if len(options_list) < 2:
            raise HTTPException(status_code=400, detail="At least 2 options required")
        
        poll = {
            "id": str(uuid.uuid4()),
            "podcast_id": podcast_id,
            "creator_id": creator_id,
            "question": question,
            "options": [{"text": opt, "votes": 0} for opt in options_list],
            "voters": {},  # user_id -> option_index
            "total_votes": 0,
            "timestamp": timestamp,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db['polls'].insert_one(poll)
        
        # Remove MongoDB ObjectId from response
        poll.pop('_id', None)
        
        logger.info(f"📊 Poll created for podcast {podcast_id}")
        return JSONResponse({"message": "Poll created", "poll": poll}, status_code=201)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create poll: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/polls")
async def get_polls(podcast_id: str):
    """Get polls for podcast"""
    try:
        polls = await db['polls'].find(
            {"podcast_id": podcast_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        
        return polls
        
    except Exception as e:
        logger.error(f"Failed to get polls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/polls/{poll_id}/vote")
async def vote_poll(
    poll_id: str,
    user_id: str = Form(...),
    option_index: int = Form(...)
):
    """Vote on a poll"""
    try:
        poll = await db['polls'].find_one({"id": poll_id})
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        if not poll.get('is_active', True):
            raise HTTPException(status_code=400, detail="Poll is closed")
        
        if option_index < 0 or option_index >= len(poll['options']):
            raise HTTPException(status_code=400, detail="Invalid option")
        
        voters = poll.get('voters', {})
        prev_vote = voters.get(user_id)
        
        if prev_vote is not None:
            # Change vote
            await db['polls'].update_one(
                {"id": poll_id},
                {
                    "$inc": {f"options.{prev_vote}.votes": -1, f"options.{option_index}.votes": 1},
                    "$set": {f"voters.{user_id}": option_index}
                }
            )
        else:
            # New vote
            await db['polls'].update_one(
                {"id": poll_id},
                {
                    "$inc": {f"options.{option_index}.votes": 1, "total_votes": 1},
                    "$set": {f"voters.{user_id}": option_index}
                }
            )
        
        return {"message": "Vote recorded", "option": option_index}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to vote: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ CLIPS ============

@router.post("/podcasts/{podcast_id}/clips")
async def create_clip(
    podcast_id: str,
    user_id: str = Form(...),
    username: str = Form(...),
    title: str = Form(...),
    start_time: int = Form(...),  # seconds
    end_time: int = Form(...)  # seconds
):
    """Create a clip (15-90 seconds)"""
    try:
        duration = end_time - start_time
        if duration < 15 or duration > 90:
            raise HTTPException(status_code=400, detail="Clip must be 15-90 seconds")
        
        clip = {
            "id": str(uuid.uuid4()),
            "podcast_id": podcast_id,
            "user_id": user_id,
            "username": username,
            "title": title,
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration,
            "plays": 0,
            "shares": 0,
            "likes": 0,
            "liked_by": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db['clips'].insert_one(clip)
        
        # Remove MongoDB ObjectId from response
        clip.pop('_id', None)
        
        logger.info(f"✂️ Clip created: {start_time}s-{end_time}s for podcast {podcast_id}")
        return JSONResponse({"message": "Clip created", "clip": clip}, status_code=201)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create clip: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/clips")
async def get_clips(podcast_id: str):
    """Get clips for podcast"""
    try:
        clips = await db['clips'].find(
            {"podcast_id": podcast_id},
            {"_id": 0}
        ).sort("likes", -1).to_list(100)
        
        return clips
        
    except Exception as e:
        logger.error(f"Failed to get clips: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clips/{clip_id}/like")
async def like_clip(clip_id: str, user_id: str = Form(...)):
    """Like/unlike a clip"""
    try:
        clip = await db['clips'].find_one({"id": clip_id})
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")
        
        liked_by = clip.get('liked_by', [])
        if user_id in liked_by:
            await db['clips'].update_one(
                {"id": clip_id},
                {"$pull": {"liked_by": user_id}, "$inc": {"likes": -1}}
            )
            return {"liked": False}
        else:
            await db['clips'].update_one(
                {"id": clip_id},
                {"$push": {"liked_by": user_id}, "$inc": {"likes": 1}}
            )
            return {"liked": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to like clip: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ FEATURED COMMENTS ============

@router.post("/comments/{comment_id}/feature")
async def feature_comment(comment_id: str, featured: bool = Form(True)):
    """Feature/unfeature a comment (by podcast creator)"""
    try:
        result = await db['comments'].update_one(
            {"id": comment_id},
            {"$set": {"is_featured": featured}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Comment not found")
            
        return {"message": f"Comment {'featured' if featured else 'unfeatured'}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to feature comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/podcasts/{podcast_id}/featured-comments")
async def get_featured_comments(podcast_id: str):
    """Get featured comments for podcast"""
    try:
        comments = await db['comments'].find(
            {"podcast_id": podcast_id, "is_featured": True},
            {"_id": 0}
        ).to_list(10)
        
        return comments
        
    except Exception as e:
        logger.error(f"Failed to get featured comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ SMART LINKS ============

@router.get("/podcasts/{podcast_id}/smart-link")
async def generate_smart_link(
    podcast_id: str,
    timestamp: int = Query(None),
    clip_id: str = Query(None)
):
    """Generate a smart link with optional timestamp or clip"""
    try:
        base_url = f"/podcast/{podcast_id}"
        
        if clip_id:
            return {"url": f"{base_url}?clip={clip_id}", "type": "clip"}
        elif timestamp:
            return {"url": f"{base_url}?t={timestamp}", "type": "timestamp"}
        else:
            return {"url": base_url, "type": "podcast"}
        
    except Exception as e:
        logger.error(f"Failed to generate smart link: {e}")
        raise HTTPException(status_code=500, detail=str(e))
