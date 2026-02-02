"""
Rating Calculator for FOMO Podcasts Platform

Система расчета рейтинга авторов (0-100):
- 85-100: Зеленый (Отлично)
- 70-84:  Желтый (Хорошо)
- 50-69:  Оранжевый (Средне)
- 30-49:  Красный (Плохо)
- 0-29:   Темно-красный/Черный (Опасно/Новый)
"""

def calculate_author_rating(author_data: dict) -> int:
    """
    Calculate author rating (0-100) based on multiple metrics
    
    Weighted components:
    - Activity Score (30%): Based on activity_score
    - Content Quality (25%): Podcasts count and quality
    - Community (25%): Followers and engagement
    - Achievements (20%): Badges and special achievements
    
    Args:
        author_data: Dictionary with author metrics
        
    Returns:
        int: Rating score (0-100)
    """
    # Default values for new users
    activity_score = author_data.get('activity_score', 0)
    podcasts_count = author_data.get('podcasts_count', 0)
    followers_count = author_data.get('followers_count', 0)
    following_count = author_data.get('following_count', 0)
    
    # Engagement metrics
    total_views = author_data.get('total_views', 0)
    total_listens = author_data.get('total_listens', 0)
    total_comments = author_data.get('total_comments', 0)
    total_reactions = author_data.get('total_reactions', 0)
    
    # Badges and achievements
    badges_count = len(author_data.get('badges', []))
    
    # Component 1: Activity Score (30%)
    # Normalize activity_score to 0-100 (assuming max 1000)
    activity_component = min(activity_score / 1000 * 100, 100) * 0.30
    
    # Component 2: Content Quality (25%)
    # Based on podcasts count (more podcasts = higher score)
    # Logarithmic scale to prevent extreme values
    if podcasts_count > 0:
        import math
        # Max score at 50 podcasts
        content_component = min(math.log(podcasts_count + 1) / math.log(51) * 100, 100) * 0.25
    else:
        content_component = 0
    
    # Component 3: Community (25%)
    # Based on followers and engagement
    if followers_count > 0:
        # Followers score (logarithmic)
        followers_score = min(math.log(followers_count + 1) / math.log(1001) * 100, 100)
        
        # Engagement rate (views, listens per podcast)
        if podcasts_count > 0:
            avg_engagement = (total_views + total_listens) / podcasts_count
            engagement_score = min(avg_engagement / 1000 * 100, 100)
        else:
            engagement_score = 0
        
        # Community component (70% followers, 30% engagement)
        community_component = (followers_score * 0.7 + engagement_score * 0.3) * 0.25
    else:
        community_component = 0
    
    # Component 4: Achievements (20%)
    # Based on badges, comments, reactions
    achievements_score = 0
    
    # Badges (max 10 badges = 40 points)
    badges_score = min(badges_count * 4, 40)
    achievements_score += badges_score
    
    # Comments given (max 100 comments = 30 points)
    comments_score = min(total_comments / 100 * 30, 30)
    achievements_score += comments_score
    
    # Reactions given (max 200 reactions = 30 points)
    reactions_score = min(total_reactions / 200 * 30, 30)
    achievements_score += reactions_score
    
    achievements_component = achievements_score * 0.20
    
    # Calculate final rating
    final_rating = (
        activity_component +
        content_component +
        community_component +
        achievements_component
    )
    
    # Ensure rating is between 0 and 100
    final_rating = max(0, min(100, int(final_rating)))
    
    return final_rating


def get_rating_tier(rating: int) -> dict:
    """
    Get rating tier information
    
    Args:
        rating: Rating score (0-100)
        
    Returns:
        dict: Tier information with color, label, description
    """
    if rating >= 85:
        return {
            'tier': 'excellent',
            'label': 'Отлично',
            'color': 'green',
            'description': 'Выдающийся автор с высокой активностью'
        }
    elif rating >= 70:
        return {
            'tier': 'good',
            'label': 'Хорошо',
            'color': 'yellow',
            'description': 'Активный автор с качественным контентом'
        }
    elif rating >= 50:
        return {
            'tier': 'average',
            'label': 'Средне',
            'color': 'orange',
            'description': 'Развивающийся автор'
        }
    elif rating >= 30:
        return {
            'tier': 'poor',
            'label': 'Плохо',
            'color': 'red',
            'description': 'Низкая активность'
        }
    else:
        return {
            'tier': 'danger',
            'label': 'Новичок',
            'color': 'dark-red',
            'description': 'Новый пользователь или неактивный'
        }


def calculate_activity_score(author_data: dict) -> int:
    """
    Calculate raw activity score based on user actions
    
    Returns score in range 0-1000+
    """
    score = 0
    
    # Content creation
    score += author_data.get('podcasts_count', 0) * 50  # 50 points per podcast
    
    # Social engagement
    score += author_data.get('followers_count', 0) * 2   # 2 points per follower
    score += author_data.get('following_count', 0) * 1   # 1 point per following
    
    # Content engagement
    score += author_data.get('total_views', 0) * 0.1      # 0.1 point per view
    score += author_data.get('total_listens', 0) * 0.5    # 0.5 point per listen
    score += author_data.get('total_comments', 0) * 5     # 5 points per comment
    score += author_data.get('total_reactions', 0) * 2    # 2 points per reaction
    
    # Badges and achievements
    score += len(author_data.get('badges', [])) * 100     # 100 points per badge
    
    return int(score)


async def update_author_metrics(author: dict, db) -> dict:
    """
    Update author metrics from database and recalculate rating
    
    Args:
        author: Author document
        db: MongoDB database instance
        
    Returns:
        dict: Updated author with new rating
    """
    import math
    
    author_id = author.get('id')
    
    # Get podcasts count
    podcasts = await db.podcasts.find({'author_id': author_id}).to_list(None)
    podcasts_count = len(podcasts)
    
    # Calculate total views, listens from podcasts
    total_views = sum(p.get('views_count', 0) for p in podcasts)
    total_listens = sum(p.get('listens_count', 0) for p in podcasts)
    
    # Get comments count (comments made by author)
    total_comments = await db.comments.count_documents({'user_id': author_id})
    
    # Get reactions count
    total_reactions = await db.reactions.count_documents({'user_id': author_id})
    
    # Update metrics
    metrics = {
        'podcasts_count': podcasts_count,
        'total_views': total_views,
        'total_listens': total_listens,
        'total_comments': total_comments,
        'total_reactions': total_reactions,
        'followers_count': author.get('followers_count', 0),
        'following_count': author.get('following_count', 0),
        'badges': author.get('badges', [])
    }
    
    # Calculate activity_score
    activity_score = calculate_activity_score(metrics)
    
    # Calculate rating
    metrics['activity_score'] = activity_score
    rating = calculate_author_rating(metrics)
    
    # Update author document
    author['activity_score'] = activity_score
    author['rating'] = rating
    author['podcasts_count'] = podcasts_count
    
    return author
