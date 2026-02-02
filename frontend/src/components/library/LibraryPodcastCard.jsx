import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, X, Lock } from 'lucide-react';
import { Button } from '../ui/button';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const LibraryPodcastCard = ({ podcast, onRemove, showRemoveButton = true }) => {
  const navigate = useNavigate();
  
  return (
    <div className="group bg-white rounded-2xl p-4 hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-emerald-200">
      <div className="flex gap-4">
        <div 
          onClick={() => navigate(`/podcast/${podcast.id}`)}
          className="flex-shrink-0"
        >
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500">
            {podcast.cover_image ? (
              <img 
                src={podcast.cover_image} 
                alt={podcast.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        </div>
        
        <div 
          onClick={() => navigate(`/podcast/${podcast.id}`)}
          className="flex-1 min-w-0"
        >
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
              {podcast.title}
            </h3>
            {podcast.visibility === 'private' && (
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {podcast.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {podcast.duration > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(podcast.duration)}
              </div>
            )}
            <span>{podcast.listens_count || 0} plays</span>
          </div>
        </div>
        
        {showRemoveButton && (
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(podcast.id);
              }}
              className="text-gray-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPodcastCard;
