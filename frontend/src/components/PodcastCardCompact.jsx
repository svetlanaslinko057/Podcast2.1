import React, { useState } from 'react';
import { Play, Pause, Heart, Eye, Clock, Radio } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { usePlayer } from './GlobalPlayer';

export const PodcastCardCompact = ({ podcast, onClick }) => {
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
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
  
  return (
    <Card 
      className={`bg-white border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg group ${
        isThisPodcastActive ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
      data-testid={`podcast-card-${podcast.id}`}
    >
      {/* Cover Image */}
      <div className="relative aspect-square bg-gradient-to-br from-emerald-500 to-teal-600">
        {podcast.cover_image ? (
          <img 
            src={podcast.cover_image} 
            alt={podcast.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-white/80" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <button
          onClick={handlePlayClick}
          className={`absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isThisPodcastPlaying 
              ? 'bg-emerald-500 scale-100' 
              : 'bg-white/90 scale-0 group-hover:scale-100'
          }`}>
            {isThisPodcastPlaying ? (
              <Pause className="w-5 h-5 text-white" fill="white" />
            ) : (
              <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
            )}
          </div>
        </button>

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isLive && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE
            </div>
          )}
          {isAwaitingRecording && (
            <div className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
              Ожидает запись
            </div>
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
          {formatDuration(podcast.duration)}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
          {podcast.title}
        </h3>
        
        {podcast.author_name && (
          <p className="text-xs text-gray-500 mb-2 truncate">
            {podcast.author_name}
          </p>
        )}

        {/* Tags */}
        {podcast.tags && podcast.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {podcast.tags.slice(0, 2).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{podcast.views_count || podcast.listens || 0}</span>
            </div>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${
                isLiked ? 'text-red-500' : 'hover:text-red-500'
              }`}
            >
              <Heart className="w-3 h-3" fill={isLiked ? 'currentColor' : 'none'} />
              <span>{likesCount}</span>
            </button>
          </div>
          <span>{formatDate(podcast.created_at)}</span>
        </div>
      </div>
    </Card>
  );
};
