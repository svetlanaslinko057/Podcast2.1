"""
RSS Feed Generator for FOMO Podcasts Platform
Generates standard RSS 2.0 feeds with iTunes tags for podcast compatibility
"""

from feedgen.feed import FeedGenerator
from datetime import datetime, timezone
from typing import List, Optional
import os


def generate_author_rss_feed(author: dict, podcasts: List[dict], base_url: str) -> str:
    """
    Generate RSS feed for all podcasts by an author
    
    Args:
        author: Author document from MongoDB
        podcasts: List of podcast documents
        base_url: Base URL of the platform (e.g., https://fomo-podcasts.com)
    
    Returns:
        RSS feed XML as string
    """
    fg = FeedGenerator()
    fg.load_extension('podcast')
    
    # Feed metadata
    fg.title(f"{author['name']} - FOMO Podcasts")
    fg.id(f"{base_url}/author/{author['id']}")
    fg.link(href=f"{base_url}/author/{author['id']}", rel='alternate')
    fg.link(href=f"{base_url}/api/rss/author/{author['id']}", rel='self')
    fg.description(author.get('bio', f"Podcasts by {author['name']}"))
    fg.language('ru')  # Russian as primary language
    
    # Author info
    fg.author({
        'name': author['name'],
        'email': f"{author['username']}@fomo-podcasts.local"
    })
    
    # iTunes-specific tags
    fg.podcast.itunes_author(author['name'])
    fg.podcast.itunes_category('Technology')
    fg.podcast.itunes_explicit('no')
    
    if author.get('avatar'):
        avatar_url = author['avatar']
        if not any(avatar_url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']):
            avatar_url = f"{avatar_url}?format=jpg"
        try:
            fg.podcast.itunes_image(avatar_url)
            fg.image(avatar_url, title=author['name'], link=f"{base_url}/author/{author['id']}")
        except ValueError:
            pass
    
    # Add podcasts as episodes
    for podcast in podcasts:
        add_podcast_entry(fg, podcast, author, base_url)
    
    return fg.rss_str(pretty=True).decode('utf-8')


def generate_podcast_rss_feed(podcast: dict, author: dict, base_url: str) -> str:
    """
    Generate RSS feed for a single podcast
    
    Args:
        podcast: Podcast document from MongoDB
        author: Author document
        base_url: Base URL of the platform
    
    Returns:
        RSS feed XML as string
    """
    fg = FeedGenerator()
    fg.load_extension('podcast')
    
    # Feed metadata
    fg.title(podcast['title'])
    fg.id(f"{base_url}/podcast/{podcast['id']}")
    fg.link(href=f"{base_url}/podcast/{podcast['id']}", rel='alternate')
    fg.link(href=f"{base_url}/api/rss/podcast/{podcast['id']}", rel='self')
    fg.description(podcast.get('description', ''))
    fg.language('ru')
    
    # Author info
    fg.author({
        'name': author['name'],
        'email': f"{author['username']}@fomo-podcasts.local"
    })
    
    # iTunes-specific tags
    fg.podcast.itunes_author(author['name'])
    fg.podcast.itunes_category('Technology')
    fg.podcast.itunes_explicit('no')
    
    if podcast.get('cover_image'):
        cover_url = podcast['cover_image']
        if not any(cover_url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']):
            cover_url = f"{cover_url}?format=jpg"
        try:
            fg.podcast.itunes_image(cover_url)
            fg.image(cover_url, title=podcast['title'], link=f"{base_url}/podcast/{podcast['id']}")
        except ValueError:
            pass
    
    # Add single podcast entry
    add_podcast_entry(fg, podcast, author, base_url)
    
    return fg.rss_str(pretty=True).decode('utf-8')


def add_podcast_entry(fg: FeedGenerator, podcast: dict, author: dict, base_url: str):
    """
    Add a podcast as an entry/episode to the RSS feed
    
    Args:
        fg: FeedGenerator instance
        podcast: Podcast document
        author: Author document
        base_url: Base URL
    """
    fe = fg.add_entry()
    
    # Basic metadata
    fe.id(f"{base_url}/podcast/{podcast['id']}")
    fe.title(podcast['title'])
    fe.description(podcast.get('description', ''))
    fe.link(href=f"{base_url}/podcast/{podcast['id']}")
    
    # Publication date
    pub_date = podcast.get('published_at') or podcast.get('created_at')
    if isinstance(pub_date, str):
        pub_date = datetime.fromisoformat(pub_date)
    elif pub_date is None:
        pub_date = datetime.now(timezone.utc)
    
    fe.pubDate(pub_date)
    
    # Audio enclosure
    if podcast.get('audio_file_id'):
        audio_url = f"{base_url}/api/podcasts/{podcast['id']}/audio"
        
        # File size and type
        file_size = podcast.get('file_size', 0)
        audio_format = podcast.get('audio_format', 'mp3')
        mime_type = f"audio/{audio_format}"
        
        fe.enclosure(audio_url, str(file_size), mime_type)
        
        # iTunes-specific audio tags
        fe.podcast.itunes_duration(podcast.get('duration', 0))
    
    # iTunes author
    fe.podcast.itunes_author(author['name'])
    
    # Cover image
    if podcast.get('cover_image'):
        # feedgen requires explicit extension, add ?format=jpg if missing
        cover_url = podcast['cover_image']
        if not any(cover_url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']):
            cover_url = f"{cover_url}?format=jpg"
        try:
            fe.podcast.itunes_image(cover_url)
        except ValueError:
            # Skip if image URL is invalid
            pass
    
    # Tags as categories
    for tag in podcast.get('tags', [])[:5]:  # Limit to 5 tags
        fe.category(term=tag)
    
    # iTunes summary (AI summary if available)
    if podcast.get('ai_summary'):
        fe.podcast.itunes_summary(podcast['ai_summary'])


def get_base_url_from_env() -> str:
    """
    Get base URL from environment or use default
    """
    # Try to get from REACT_APP_BACKEND_URL or construct default
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    # Remove /api suffix if present
    if backend_url.endswith('/api'):
        backend_url = backend_url[:-4]
    return backend_url
