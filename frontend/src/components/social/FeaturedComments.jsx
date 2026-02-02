import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Star, MessageCircle, ThumbsUp, Pin } from 'lucide-react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

const API = process.env.REACT_APP_BACKEND_URL;

export const FeaturedComments = ({ podcastId }) => {
  const [featuredComments, setFeaturedComments] = useState([]);

  const fetchFeaturedComments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/social/podcasts/${podcastId}/featured-comments`);
      setFeaturedComments(res.data);
    } catch (error) {
      console.error('Failed to fetch featured comments:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchFeaturedComments();
  }, [fetchFeaturedComments]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (featuredComments.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
        Featured Comments
      </h3>

      <div className="space-y-4">
        {featuredComments.map((comment) => (
          <div key={comment.id} className="bg-white/80 rounded-xl p-4">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={comment.user_avatar} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-yellow-500 text-white">
                  {comment.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{comment.username}</span>
                  <Badge className="bg-amber-100 text-amber-700 text-xs">
                    <Pin className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                  <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-gray-700">{comment.text}</p>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {comment.likes_count || 0}
                  </span>
                  {comment.replies?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {comment.replies.length} replies
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default FeaturedComments;
