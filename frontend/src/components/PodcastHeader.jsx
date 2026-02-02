import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Eye, Calendar, Radio, Bookmark, BookmarkCheck, 
  Share2, ListPlus, UserPlus, Lock, Download 
} from 'lucide-react';

/**
 * Podcast Header Component
 * Displays podcast cover, title, author info, and action buttons
 */
export const PodcastHeader = ({
  podcast,
  author,
  isFollowing,
  isSaved,
  onFollow,
  onSave,
  onShare,
  onAddToPlaylist,
  onDownload,
  showActions = true
}) => {
  const navigate = useNavigate();
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="bg-white rounded-3xl p-6 sm:p-8 mb-6">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Cover Image */}
        <div className="flex-shrink-0">
          <div className="relative w-full lg:w-64 aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 shadow-xl">
            {podcast.cover_image ? (
              <img 
                src={podcast.cover_image} 
                alt={podcast.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Radio className="w-20 h-20 text-white opacity-50" />
              </div>
            )}
            
            {/* Live Badge */}
            {podcast.is_live && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-red-500 text-white font-bold animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                  LIVE
                </Badge>
              </div>
            )}
            
            {/* Private Badge */}
            {podcast.visibility === 'private' && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-amber-500 text-white">
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Tags */}
          {podcast.tags && podcast.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {podcast.tags.map((tag, idx) => (
                <Badge 
                  key={idx}
                  variant="outline" 
                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {podcast.title}
          </h1>
          
          {/* Author */}
          {author && (
            <div 
              className="flex items-center gap-3 mb-4 cursor-pointer group"
              onClick={() => navigate(`/author/${author.id}`)}
            >
              <Avatar className="w-12 h-12 border-2 border-emerald-200">
                <AvatarImage src={author.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  {author.name?.[0] || 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  {author.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatNumber(author.followers_count)} followers
                </p>
              </div>
              {showActions && !isFollowing && onFollow && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => { e.stopPropagation(); onFollow(); }}
                  className="ml-2"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Follow
                </Button>
              )}
              {showActions && isFollowing && (
                <Badge className="ml-2 bg-emerald-100 text-emerald-700">
                  Following
                </Badge>
              )}
            </div>
          )}
          
          {/* Description */}
          {podcast.description && (
            <p className="text-gray-600 mb-4 line-clamp-3">
              {podcast.description}
            </p>
          )}
          
          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {formatNumber(podcast.views_count)} views
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(podcast.created_at)}
            </span>
          </div>
          
          {/* Action Buttons */}
          {showActions && (
            <div className="flex flex-wrap gap-3">
              {onSave && (
                <Button
                  variant={isSaved ? 'default' : 'outline'}
                  onClick={onSave}
                  className={isSaved ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-4 h-4 mr-2" />
                  ) : (
                    <Bookmark className="w-4 h-4 mr-2" />
                  )}
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              )}
              
              {onShare && (
                <Button variant="outline" onClick={onShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
              
              {onAddToPlaylist && (
                <Button variant="outline" onClick={onAddToPlaylist}>
                  <ListPlus className="w-4 h-4 mr-2" />
                  Playlist
                </Button>
              )}
              
              {onDownload && podcast.audio_url && (
                <Button variant="outline" onClick={onDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PodcastHeader;
