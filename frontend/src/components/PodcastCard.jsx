import React, { useState } from 'react';
import { Play, Pause, Heart, Eye, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { usePlayer } from './GlobalPlayer';

export const PodcastCard = ({ podcast, onClick }) => {
  const { currentPodcast, isPlaying, playPodcast, pausePodcast } = usePlayer();
  
  const [isLiked, setIsLiked] = useState(false);
  const likesCount = typeof podcast.likes === 'number' ? podcast.likes : (podcast.reactions_count || 0);
  
  const isThisPodcastPlaying = currentPodcast?.id === podcast.id && isPlaying;
  const isThisPodcastActive = currentPodcast?.id === podcast.id;
  const isLive = podcast.is_live || podcast.status === 'live';
  const isAwaitingRecording = podcast.status === 'awaiting_recording';

  const formatDuration = (dur) => {
    if (!dur) return '0:00';
    if (typeof dur === 'string' && dur.includes(':')) return dur;
    const seconds = parseInt(dur) || 0;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short'
    });
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isThisPodcastPlaying) {
      pausePodcast();
    } else {
      playPodcast(podcast);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  // Capitalize first letter of tag
  const formatTag = (tag) => {
    if (!tag) return '';
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  };
  
  return (
    <Card 
      className={`bg-white border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg h-full ${
        isThisPodcastActive ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
      data-testid={`podcast-card-${podcast.id}`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-emerald-500 to-teal-600 overflow-hidden">
        {podcast.cover_image ? (
          <img 
            src={podcast.cover_image} 
            alt={podcast.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-white/80" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <button
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all duration-200 group"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
            isThisPodcastPlaying 
              ? 'bg-emerald-500 scale-100' 
              : 'bg-white/95 scale-0 group-hover:scale-100'
          }`}>
            {isThisPodcastPlaying ? (
              <Pause className="w-5 h-5 text-white" fill="white" />
            ) : (
              <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
            )}
          </div>
        </button>

        {/* Status Badges */}
        {(isLive || isAwaitingRecording) && (
          <div className="absolute top-2 left-2">
            {isLive ? (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full shadow">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                LIVE
              </div>
            ) : isAwaitingRecording && (
              <div className="px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full shadow">
                Awaiting
              </div>
            )}
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs font-medium rounded backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDuration(podcast.duration)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 mb-1.5 min-h-[2.25rem]">
          {podcast.title}
        </h3>
        
        {/* Author */}
        {podcast.author_name && (
          <p className="text-xs text-gray-500 mb-2 truncate">
            {podcast.author_name}
          </p>
        )}

        {/* Description */}
        {podcast.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">
            {podcast.description}
          </p>
        )}

        {/* Tags */}
        {podcast.tags && podcast.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {podcast.tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0 rounded font-medium"
              >
                {formatTag(tag)}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{podcast.views_count || podcast.listens || 0}</span>
            </div>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${
                isLiked ? 'text-red-500' : 'hover:text-red-500'
              }`}
            >
              <Heart className="w-3.5 h-3.5" fill={isLiked ? 'currentColor' : 'none'} />
              <span>{likesCount}</span>
            </button>
          </div>
          <span className="text-xs">{formatDate(podcast.created_at)}</span>
        </div>
      </div>
    </Card>
  );
};
