import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Flame, Heart, Brain, ThumbsUp, Laugh, Frown } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const REACTION_TYPES = [
  { type: 'fire', icon: Flame, emoji: '🔥', color: 'text-orange-500' },
  { type: 'heart', icon: Heart, emoji: '❤️', color: 'text-red-500' },
  { type: 'mind_blown', icon: Brain, emoji: '🤯', color: 'text-purple-500' },
  { type: 'clap', icon: ThumbsUp, emoji: '👏', color: 'text-yellow-500' },
  { type: 'laugh', icon: Laugh, emoji: '😂', color: 'text-amber-500' },
  { type: 'sad', icon: Frown, emoji: '😢', color: 'text-blue-500' },
];

export const TimestampedReactions = ({ 
  podcastId, 
  currentTime, 
  duration,
  userId,
  onReactionAdded 
}) => {
  const [reactions, setReactions] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  const fetchReactions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/social/podcasts/${podcastId}/reactions`);
      setReactions(res.data);
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const addReaction = async (reactionType) => {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('timestamp', Math.floor(currentTime));
      formData.append('reaction_type', reactionType);
      
      await axios.post(`${API}/api/social/podcasts/${podcastId}/reactions`, formData);
      toast.success(`${REACTION_TYPES.find(r => r.type === reactionType)?.emoji} Reaction added at ${formatTime(currentTime)}`);
      setShowPicker(false);
      fetchReactions();
      if (onReactionAdded) onReactionAdded();
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get reactions for current timestamp (5-second bucket)
  const currentBucket = Math.floor(currentTime / 5) * 5;
  const nearbyReactions = reactions.filter(r => 
    Math.abs(r.timestamp - currentBucket) <= 10
  );

  return (
    <div className="relative">
      {/* Reaction markers on timeline */}
      <div className="absolute inset-x-0 bottom-full mb-1 h-8 pointer-events-none">
        {reactions.map((r, idx) => {
          const position = (r.timestamp / duration) * 100;
          const totalReactions = Object.values(r.reactions).reduce((a, b) => a + b, 0);
          const topReaction = Object.entries(r.reactions).sort((a, b) => b[1] - a[1])[0];
          
          return (
            <div
              key={idx}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${position}%` }}
            >
              <div className="flex flex-col items-center">
                <span className="text-xs">
                  {REACTION_TYPES.find(rt => rt.type === topReaction?.[0])?.emoji || '🔥'}
                </span>
                {totalReactions > 1 && (
                  <span className="text-[10px] text-gray-400">{totalReactions}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reaction picker button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPicker(!showPicker)}
          className="rounded-full px-3 py-1 text-sm"
        >
          🔥 React at {formatTime(currentTime)}
        </Button>

        {/* Picker popup */}
        {showPicker && (
          <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-xl border border-gray-200 p-2 flex gap-1 z-50">
            {REACTION_TYPES.map(({ type, emoji, color }) => (
              <button
                key={type}
                onClick={() => addReaction(type)}
                className={`w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-all hover:scale-110 ${color}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Nearby reactions display */}
        {nearbyReactions.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            {nearbyReactions.slice(0, 3).map((r, idx) => (
              <span key={idx}>
                {Object.entries(r.reactions).map(([type, count]) => (
                  <span key={type} className="mr-1">
                    {REACTION_TYPES.find(rt => rt.type === type)?.emoji}{count > 1 && count}
                  </span>
                ))}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimestampedReactions;
