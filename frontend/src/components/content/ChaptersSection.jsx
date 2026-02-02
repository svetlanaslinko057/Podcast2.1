import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { List, Clock, Play, ChevronRight, Plus } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const CHAPTER_ICONS = {
  intro: '🎬',
  security: '🔐',
  market: '📊',
  nft: '🖼️',
  defi: '🏦',
  news: '📰',
  interview: '🎤',
  tutorial: '📚',
  analysis: '🔬',
  conclusion: '🎯',
  default: '📍'
};

export const ChaptersSection = ({ 
  podcastId, 
  duration,
  onSeek,
  isAuthor = false 
}) => {
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);

  const fetchChapters = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/content/podcasts/${podcastId}/chapters`);
      setChapters(res.data);
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getIcon = (title) => {
    const lowerTitle = title.toLowerCase();
    for (const [key, icon] of Object.entries(CHAPTER_ICONS)) {
      if (lowerTitle.includes(key)) return icon;
    }
    return CHAPTER_ICONS.default;
  };

  if (chapters.length === 0) return null;

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <List className="w-5 h-5 text-indigo-500" />
          Chapters ({chapters.length})
        </h3>
      </div>

      <div className="space-y-2">
        {chapters.map((chapter, idx) => (
          <button
            key={chapter.id}
            onClick={() => {
              onSeek && onSeek(chapter.start_time);
              setActiveChapter(chapter.id);
              toast.success(`Jumping to: ${chapter.title}`);
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
              activeChapter === chapter.id
                ? 'bg-indigo-100 border-2 border-indigo-300'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <span className="text-2xl">{chapter.icon || getIcon(chapter.title)}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{chapter.title}</div>
              {chapter.description && (
                <p className="text-sm text-gray-500 truncate">{chapter.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="flex-shrink-0 font-mono">
              {formatTime(chapter.start_time)}
            </Badge>
            <Play className="w-4 h-4 text-gray-400" />
          </button>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex">
          {chapters.map((chapter, idx) => {
            const nextChapter = chapters[idx + 1];
            const width = nextChapter 
              ? ((nextChapter.start_time - chapter.start_time) / duration) * 100
              : ((duration - chapter.start_time) / duration) * 100;
            return (
              <div
                key={chapter.id}
                className={`h-full ${idx % 2 === 0 ? 'bg-indigo-500' : 'bg-purple-500'}`}
                style={{ width: `${width}%` }}
                title={chapter.title}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default ChaptersSection;
