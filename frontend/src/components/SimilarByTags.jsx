import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Tag, Play, Clock, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const API = process.env.REACT_APP_BACKEND_URL;

export const SimilarByTags = ({ 
  podcastId, 
  tags = [],
  limit = 4,
  showHeader = true 
}) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchType, setMatchType] = useState('tags');

  const fetchRecommendations = useCallback(async () => {
    if (!podcastId) return;
    
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/api/recommendations/similar-by-tags/${podcastId}`,
        { params: { limit } }
      );
      setRecommendations(res.data.recommendations || []);
      setMatchType(res.data.match_type);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [podcastId, limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins} мин`;
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {matchType === 'tags' ? 'Похожие по тегам' : 'Популярное'}
          </h3>
          {tags.length > 0 && (
            <div className="flex gap-1">
              {tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recommendations.map((podcast) => (
          <div
            key={podcast.id}
            onClick={() => navigate(`/podcast/${podcast.id}`)}
            className="group flex gap-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl hover:shadow-md transition-all cursor-pointer"
          >
            {/* Cover image */}
            <div className="relative flex-shrink-0">
              <img
                src={podcast.cover_image || 'https://via.placeholder.com/80'}
                alt={podcast.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                {podcast.title}
              </h4>
              
              {podcast.author && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={podcast.author.avatar_url} />
                    <AvatarFallback className="text-[8px] bg-amber-200">
                      {podcast.author.name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{podcast.author.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                {podcast.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(podcast.duration)}
                  </span>
                )}
                {podcast.matching_tags?.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    <Tag className="w-2.5 h-2.5 mr-0.5" />
                    {podcast.matching_tags.length} совпад.
                  </Badge>
                )}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 flex-shrink-0 self-center" />
          </div>
        ))}
      </div>

      {recommendations.length >= limit && (
        <Button 
          variant="ghost" 
          className="w-full mt-4 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          onClick={() => navigate(`/search?tags=${tags.join(',')}`)}
        >
          Показать больше
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </Card>
  );
};

export default SimilarByTags;
