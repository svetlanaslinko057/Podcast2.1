import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Edit, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export const LibraryPlaylistCard = ({ 
  playlist, 
  onShare, 
  onEdit, 
  onDelete 
}) => {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-emerald-200">
      <div className="flex items-start justify-between mb-4">
        <div 
          onClick={() => navigate(`/playlist/${playlist.id}`)}
          className="flex-1"
        >
          <h3 className="font-bold text-lg text-gray-900 mb-1 hover:text-emerald-600 transition-colors">
            {playlist.name}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {playlist.description || 'No description'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare(playlist)}
            className="text-gray-400 hover:text-emerald-600"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(playlist)}
            className="text-gray-400 hover:text-blue-600"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(playlist.id)}
            className="text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>{playlist.podcast_ids?.length || 0} podcasts</span>
        {playlist.is_public && (
          <Badge variant="outline" className="text-xs">Public</Badge>
        )}
      </div>
    </Card>
  );
};

export default LibraryPlaylistCard;
