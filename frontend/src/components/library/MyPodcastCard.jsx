import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Heart, Clock, Lock, Users, Headphones } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MyPodcastCard = ({ 
  podcast, 
  onEdit, 
  onDelete, 
  onManageAccess 
}) => {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-white rounded-2xl p-4 hover:shadow-lg transition-all border border-gray-100 hover:border-emerald-200">
      <div className="flex gap-4">
        {/* Cover */}
        <div 
          onClick={() => navigate(`/podcast/${podcast.id}`)}
          className="flex-shrink-0 cursor-pointer"
        >
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500">
            {podcast.cover_image ? (
              <img 
                src={podcast.cover_image} 
                alt={podcast.title}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Headphones className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 
              onClick={() => navigate(`/podcast/${podcast.id}`)}
              className="font-bold text-gray-900 truncate hover:text-emerald-600 transition-colors cursor-pointer"
            >
              {podcast.title}
            </h3>
            {podcast.visibility === 'private' && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 flex-shrink-0">
                <Lock className="w-3 h-3 mr-1" />
                Private
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {podcast.description}
          </p>
          
          {/* Tags */}
          {podcast.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {podcast.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {podcast.views_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {podcast.reactions_count || podcast.likes_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(podcast.duration)}
            </span>
            <Badge variant={podcast.visibility === 'public' ? 'default' : 'secondary'} className="text-xs">
              {podcast.visibility || 'public'}
            </Badge>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {podcast.visibility === 'private' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onManageAccess(podcast)}
              className="bg-amber-50 border-amber-200 hover:bg-amber-100"
              title="Manage Access"
            >
              <Users className="w-4 h-4" />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate(`/podcast/${podcast.id}`)}
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onEdit(podcast)}
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => onDelete(podcast.id)}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MyPodcastCard;
