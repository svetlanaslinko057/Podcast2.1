import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Heart, ThumbsUp, Flame, Brain, Sparkles, Loader2 } from 'lucide-react';

// Default reactions
const DEFAULT_REACTIONS = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500', bgColor: 'bg-blue-50', activeColor: 'bg-blue-500' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-orange-500', bgColor: 'bg-orange-50', activeColor: 'bg-orange-500' },
  { type: 'heart', icon: Heart, label: 'Love', color: 'text-red-500', bgColor: 'bg-red-50', activeColor: 'bg-red-500' },
  { type: 'mind_blown', icon: Brain, label: 'Mind Blown', color: 'text-purple-500', bgColor: 'bg-purple-50', activeColor: 'bg-purple-500' },
  { type: 'clap', icon: Sparkles, label: 'Amazing', color: 'text-yellow-500', bgColor: 'bg-yellow-50', activeColor: 'bg-yellow-500' },
];

/**
 * Podcast Reactions Component
 * Displays reaction buttons with counts
 */
export const PodcastReactions = ({
  reactions = {}, // { type: count }
  userReactions = [], // array of types user has reacted with
  onReact,
  loading = false,
  reactionTypes = DEFAULT_REACTIONS,
  variant = 'default' // 'default' | 'compact' | 'minimal'
}) => {
  const handleReact = (type) => {
    if (!onReact) return;
    onReact(type);
  };

  const totalReactions = Object.values(reactions).reduce((a, b) => a + (b || 0), 0);

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {reactionTypes.map((reaction) => {
          const Icon = reaction.icon;
          const count = reactions[reaction.type] || 0;
          const isActive = userReactions.includes(reaction.type);
          
          return (
            <Button
              key={reaction.type}
              variant="ghost"
              size="sm"
              onClick={() => handleReact(reaction.type)}
              disabled={loading}
              className={`h-8 px-2 ${isActive ? reaction.color : 'text-gray-500'}`}
            >
              <Icon className="w-4 h-4" fill={isActive ? 'currentColor' : 'none'} />
              {count > 0 && <span className="ml-1 text-xs">{count}</span>}
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {reactionTypes.map((reaction) => {
              const Icon = reaction.icon;
              const count = reactions[reaction.type] || 0;
              const isActive = userReactions.includes(reaction.type);
              
              return (
                <button
                  key={reaction.type}
                  onClick={() => handleReact(reaction.type)}
                  disabled={loading}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                    isActive 
                      ? `${reaction.activeColor} text-white` 
                      : `${reaction.bgColor} ${reaction.color} hover:opacity-80`
                  }`}
                  title={reaction.label}
                >
                  <Icon className="w-4 h-4" fill={isActive ? 'currentColor' : 'none'} />
                  {count > 0 && <span className="text-xs font-medium">{count}</span>}
                </button>
              );
            })}
          </div>
          {totalReactions > 0 && (
            <span className="text-sm text-gray-500">
              {totalReactions} reactions
            </span>
          )}
        </div>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className="bg-white rounded-3xl p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Reactions {totalReactions > 0 && `(${totalReactions})`}
      </h3>
      
      <div className="flex flex-wrap gap-3">
        {reactionTypes.map((reaction) => {
          const Icon = reaction.icon;
          const count = reactions[reaction.type] || 0;
          const isActive = userReactions.includes(reaction.type);
          
          return (
            <button
              key={reaction.type}
              onClick={() => handleReact(reaction.type)}
              disabled={loading}
              className={`group flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-200 ${
                isActive 
                  ? `${reaction.activeColor} text-white shadow-lg scale-105` 
                  : `${reaction.bgColor} ${reaction.color} hover:shadow-md hover:scale-105`
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Icon 
                  className="w-5 h-5 transition-transform group-hover:scale-110" 
                  fill={isActive ? 'currentColor' : 'none'} 
                />
              )}
              <span className="font-medium">{reaction.label}</span>
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-white/20' : 'bg-black/5'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default PodcastReactions;
