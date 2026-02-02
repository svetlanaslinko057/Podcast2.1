"""
Rating Service - Calculate author rating based on activity
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any


def calculate_author_rating(author_data: Dict[str, Any], podcasts_data: list) -> int:
    """
    Calculate author rating on 0-100 scale based on multiple factors:
    
    Weights:
    - Podcasts count: 20%
    - Activity frequency: 15%
    - Total listens: 25%
    - Total likes/reactions: 20%
    - Total saves: 15%
    - Average engagement: 5%
    
    Returns: int (0-100)
    """
    
    # Base metrics
    podcasts_count = len(podcasts_data)
    
    if podcasts_count == 0:
        return 0
    
    # Calculate total stats from podcasts
    total_listens = sum(p.get('listens_count', 0) for p in podcasts_data)
    total_reactions = sum(p.get('reactions_count', 0) for p in podcasts_data)
    total_saves = sum(p.get('saves_count', 0) for p in podcasts_data)
    total_likes = sum(len(p.get('likes', [])) for p in podcasts_data)
    
    # Calculate activity frequency (podcasts per month)
    now = datetime.now(timezone.utc)
    created_dates = []
    for p in podcasts_data:
        created_at = p.get('created_at')
        if isinstance(created_at, str):
            try:
                created_dates.append(datetime.fromisoformat(created_at.replace('Z', '+00:00')))
            except Exception:
                pass
    
    if created_dates:
        oldest_podcast = min(created_dates)
        months_active = max(1, (now - oldest_podcast).days / 30)
        podcasts_per_month = podcasts_count / months_active
    else:
        podcasts_per_month = 0
    
    # Average engagement per podcast
    avg_engagement = (total_reactions + total_saves + total_likes) / podcasts_count if podcasts_count > 0 else 0
    
    # --- SCORING (normalized to 0-100) ---
    
    # 1. Podcasts count score (20%) - max at 50 podcasts
    podcasts_score = min(podcasts_count / 50 * 100, 100) * 0.20
    
    # 2. Activity frequency score (15%) - max at 5 podcasts/month
    frequency_score = min(podcasts_per_month / 5 * 100, 100) * 0.15
    
    # 3. Total listens score (25%) - max at 100,000 listens
    listens_score = min(total_listens / 100000 * 100, 100) * 0.25
    
    # 4. Total reactions/likes score (20%) - max at 10,000
    reactions_score = min((total_reactions + total_likes) / 10000 * 100, 100) * 0.20
    
    # 5. Total saves score (15%) - max at 5,000
    saves_score = min(total_saves / 5000 * 100, 100) * 0.15
    
    # 6. Average engagement score (5%) - max at 200 per podcast
    engagement_score = min(avg_engagement / 200 * 100, 100) * 0.05
    
    # Total rating
    total_rating = (
        podcasts_score +
        frequency_score +
        listens_score +
        reactions_score +
        saves_score +
        engagement_score
    )
    
    return int(round(total_rating))


def get_author_statistics(podcasts_data: list) -> Dict[str, int]:
    """
    Calculate aggregated statistics for author
    
    Returns:
        {
            'total_listens': int,
            'total_likes': int,
            'total_saves': int,
            'total_reactions': int,
            'total_views': int
        }
    """
    total_listens = sum(p.get('listens_count', 0) for p in podcasts_data)
    total_likes = sum(len(p.get('likes', [])) for p in podcasts_data)
    total_saves = sum(p.get('saves_count', 0) for p in podcasts_data)
    total_reactions = sum(p.get('reactions_count', 0) for p in podcasts_data)
    total_views = sum(p.get('views_count', 0) for p in podcasts_data)
    
    return {
        'total_listens': total_listens,
        'total_likes': total_likes,
        'total_saves': total_saves,
        'total_reactions': total_reactions,
        'total_views': total_views
    }
