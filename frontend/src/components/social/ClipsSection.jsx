import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Scissors, Play, Heart, Share2, Clock, Plus, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const API = process.env.REACT_APP_BACKEND_URL;

export const ClipsSection = ({ 
  podcastId, 
  userId,
  username,
  duration,
  currentTime,
  onPlayClip,
  onSeek
}) => {
  const [clips, setClips] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newClip, setNewClip] = useState({
    title: '',
    start: Math.max(0, Math.floor(currentTime) - 15),
    end: Math.min(duration, Math.floor(currentTime) + 15)
  });

  const fetchClips = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/social/podcasts/${podcastId}/clips`);
      setClips(res.data);
    } catch (error) {
      console.error('Failed to fetch clips:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const createClip = async () => {
    if (!newClip.title.trim()) {
      toast.error('Please enter a title for your clip');
      return;
    }
    
    const clipDuration = newClip.end - newClip.start;
    if (clipDuration < 15 || clipDuration > 90) {
      toast.error('Clip must be 15-90 seconds long');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('username', username || 'Anonymous');
      formData.append('title', newClip.title);
      formData.append('start_time', newClip.start);
      formData.append('end_time', newClip.end);
      
      await axios.post(`${API}/api/social/podcasts/${podcastId}/clips`, formData);
      toast.success('Clip created!');
      setShowCreate(false);
      fetchClips();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create clip');
    }
  };

  const likeClip = async (clipId) => {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      
      const res = await axios.post(`${API}/api/social/clips/${clipId}/like`, formData);
      toast.success(res.data.liked ? 'Liked!' : 'Like removed');
      fetchClips();
    } catch (error) {
      toast.error('Failed to like clip');
    }
  };

  const shareClip = (clip) => {
    const url = `${window.location.origin}/podcast/${podcastId}?clip=${clip.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Clip link copied!');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const clipDuration = newClip.end - newClip.start;

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-pink-500" />
          Clips ({clips.length})
        </h3>
        
        <Button 
          size="sm" 
          onClick={() => setShowCreate(true)}
          className="bg-pink-500 hover:bg-pink-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Clip
        </Button>
      </div>

      {/* Create clip dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-pink-500" />
              Create Clip
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Clip Title</label>
              <Input
                placeholder="Best moment of the episode!"
                value={newClip.title}
                onChange={(e) => setNewClip({ ...newClip, title: e.target.value })}
                className="bg-gray-50"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Time Range</label>
                <Badge variant={clipDuration >= 15 && clipDuration <= 90 ? 'default' : 'destructive'}>
                  {clipDuration}s {clipDuration < 15 ? '(min 15s)' : clipDuration > 90 ? '(max 90s)' : ''}
                </Badge>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="font-mono text-pink-600">{formatTime(newClip.start)}</span>
                  <span className="text-gray-400">to</span>
                  <span className="font-mono text-pink-600">{formatTime(newClip.end)}</span>
                </div>
                
                <Slider
                  value={[newClip.start, newClip.end]}
                  min={0}
                  max={duration || 300}
                  step={1}
                  onValueChange={([start, end]) => setNewClip({ ...newClip, start, end })}
                  className="mb-2"
                />
                
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSeek && onSeek(newClip.start)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Preview Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewClip({
                        ...newClip,
                        start: Math.max(0, Math.floor(currentTime)),
                        end: Math.min(duration || 300, Math.floor(currentTime) + 30)
                      });
                    }}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    From Current
                  </Button>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={createClip} 
              className="w-full bg-pink-500 hover:bg-pink-600"
              disabled={clipDuration < 15 || clipDuration > 90}
            >
              <Scissors className="w-4 h-4 mr-2" />
              Create Clip
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clips list */}
      <div className="space-y-3">
        {clips.map((clip) => (
          <div 
            key={clip.id} 
            className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{clip.title}</h4>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
                  </span>
                  <span>{clip.duration}s</span>
                  <span>by {clip.username}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onPlayClip && onPlayClip(clip.start_time, clip.end_time)}
                  className="text-pink-500 hover:text-pink-600 hover:bg-pink-100"
                >
                  <Play className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => likeClip(clip.id)}
                  className={clip.liked_by?.includes(userId) ? 'text-red-500' : 'text-gray-400'}
                >
                  <Heart className={`w-4 h-4 ${clip.liked_by?.includes(userId) ? 'fill-current' : ''}`} />
                  <span className="ml-1 text-xs">{clip.likes || 0}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => shareClip(clip)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {clips.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Scissors className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No clips yet</p>
            <p className="text-sm">Create a clip to share your favorite moment!</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ClipsSection;
