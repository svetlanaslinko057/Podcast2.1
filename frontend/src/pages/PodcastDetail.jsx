import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { usePlayer } from '../components/GlobalPlayer';
import { useWallet } from '../context/WalletContext';
import { toast } from 'sonner';
import { 
  Play, Pause, Heart, Share2, Bookmark, BookmarkCheck, Loader2, Eye, Calendar,
  MessageCircle, UserPlus, Clock, Headphones, Sparkles, ChevronLeft, 
  SkipBack, SkipForward, Volume2, HelpCircle
} from 'lucide-react';

// Lazy load CommentsSection to avoid bundle issues
const CommentsSection = lazy(() => import('../components/CommentsSection').then(m => ({ default: m.CommentsSection })));

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Info Tooltip Component for Podcast tabs
const TabInfoTooltip = ({ title, description, formula, status }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="ml-1 text-gray-400 hover:text-gray-600 transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="bg-gray-900 text-white p-4 rounded-xl max-w-xs shadow-xl border-0"
      >
        <div className="space-y-2">
          <h4 className="font-semibold text-white text-sm">{title}</h4>
          <p className="text-gray-300 text-xs leading-relaxed">{description}</p>
          {formula && (
            <div className="bg-gray-800 rounded-lg p-2 mt-2">
              <p className="text-xs text-gray-400 font-mono">{formula}</p>
            </div>
          )}
          {status && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
              <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-emerald-500' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">{status.text}</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const PodcastDetail = () => {
  const { podcastId } = useParams();
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { playPodcast, currentPodcast, isPlaying, togglePlay, currentTime, duration, seekTo, skip } = usePlayer();
  
  const [podcast, setPodcast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  
  const currentUserId = walletAddress || 'demo-user-123';
  const isCurrentPodcast = currentPodcast?.id === podcast?.id;
  const isCurrentlyPlaying = isCurrentPodcast && isPlaying;

  useEffect(() => {
    fetchPodcastData();
  }, [podcastId]);

  const fetchPodcastData = async () => {
    try {
      setLoading(true);
      const podcastRes = await axios.get(`${API}/podcasts/${podcastId}`);
      
      setPodcast(podcastRes.data);
      
      // Fetch author
      if (podcastRes.data.author_id) {
        try {
          const authorRes = await axios.get(`${API}/authors/${podcastRes.data.author_id}`);
          setAuthor(authorRes.data);
        } catch (e) {
          console.warn('Author not found');
        }
      }
      
      // Track view
      try {
        const formData = new FormData();
        formData.append('user_id', currentUserId);
        await axios.post(`${API}/podcasts/${podcastId}/view`, formData);
      } catch (e) {}
      
    } catch (error) {
      console.error('Failed to fetch podcast:', error);
      toast.error('Failed to load podcast');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handlePlay = () => {
    if (!podcast) return;
    
    const audioUrl = podcast.audio_file_id 
      ? `${API}/podcasts/${podcastId}/audio`
      : podcast.audio_url;
    
    if (!audioUrl) {
      toast.error('No audio available');
      return;
    }
    
    if (isCurrentlyPlaying) {
      togglePlay();
    } else {
      playPodcast({ ...podcast, audio_url: audioUrl });
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      const response = await axios.post(`${API}/podcasts/${podcastId}/save`, formData);
      setIsSaved(response.data.saved);
      toast.success(response.data.saved ? 'Saved to library!' : 'Removed from library');
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleLike = async () => {
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      formData.append('reaction_type', 'heart');
      await axios.post(`${API}/podcasts/${podcastId}/reactions`, formData);
      setIsLiked(!isLiked);
      toast.success(isLiked ? 'Removed like' : 'Liked!');
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  const handleFollow = async () => {
    if (!author) return;
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      if (isFollowing) {
        await axios.delete(`${API}/authors/${author.id}/follow`, { data: formData });
      } else {
        await axios.post(`${API}/authors/${author.id}/follow`, formData);
      }
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    } catch (error) {
      console.error('Failed to follow:', error);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  const progress = isCurrentPodcast && duration > 0 ? (currentTime / duration) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Podcast not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
        </div>
      </div>
    );
  }

  const hasAudio = podcast.audio_file_id || podcast.audio_url;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-32">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Player Card */}
            <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {/* Cover & Play */}
              <div className="relative aspect-[21/9] bg-gradient-to-br from-emerald-500 to-teal-600">
                {podcast.cover_image && (
                  <img 
                    src={podcast.cover_image} 
                    alt={podcast.title}
                    className="w-full h-full object-cover opacity-50"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handlePlay}
                    disabled={!hasAudio}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 ${
                      hasAudio 
                        ? 'bg-white text-emerald-600' 
                        : 'bg-white/50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isCurrentlyPlaying ? (
                      <Pause className="w-10 h-10" fill="currentColor" />
                    ) : (
                      <Play className="w-10 h-10 ml-1" fill="currentColor" />
                    )}
                  </button>
                </div>
                
                {/* Duration Badge */}
                <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 text-white text-sm font-medium rounded-lg backdrop-blur-sm">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {formatDuration(podcast.duration)}
                </div>
                
                {/* Status Badge */}
                {podcast.status === 'awaiting_recording' && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-amber-500 text-white text-sm font-semibold rounded-lg">
                    Awaiting Recording
                  </div>
                )}
                {podcast.is_live && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-lg flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    LIVE
                  </div>
                )}
              </div>
              
              {/* Player Controls - Only when playing this podcast */}
              {isCurrentPodcast && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-100">
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div 
                      className="h-2 bg-emerald-100 rounded-full cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        seekTo(percent * duration);
                      }}
                    >
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{formatDuration(currentTime)}</span>
                      <span>{formatDuration(duration)}</span>
                    </div>
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={() => skip(-15)} className="p-2 hover:bg-emerald-100 rounded-full">
                      <SkipBack className="w-5 h-5 text-gray-700" />
                    </button>
                    <button 
                      onClick={handlePlay}
                      className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center"
                    >
                      {isCurrentlyPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                    </button>
                    <button onClick={() => skip(30)} className="p-2 hover:bg-emerald-100 rounded-full">
                      <SkipForward className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Podcast Info */}
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{podcast.title}</h1>
                
                {/* Author */}
                {author && (
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                      onClick={() => navigate(`/author/${author.id}`)}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={author.avatar} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {author.name?.[0] || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{author.name}</p>
                        <p className="text-sm text-gray-500">@{author.username}</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleFollow}
                      size="sm"
                      variant={isFollowing ? 'outline' : 'default'}
                      className="rounded-lg"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                )}
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {podcast.views_count || 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Headphones className="w-4 h-4" />
                    {podcast.listens_count || podcast.listens || 0} plays
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(podcast.created_at)}
                  </span>
                </div>
                
                {/* Tags */}
                {podcast.tags && podcast.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {podcast.tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="bg-gray-100 text-gray-700 rounded-full px-3 py-1"
                      >
                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <Button 
                    onClick={handleLike}
                    variant="ghost"
                    className={`flex-1 ${isLiked ? 'text-red-500' : 'text-gray-600'}`}
                  >
                    <Heart className="w-5 h-5 mr-2" fill={isLiked ? 'currentColor' : 'none'} />
                    Like
                  </Button>
                  <Button onClick={handleSave} variant="ghost" className="flex-1 text-gray-600">
                    {isSaved ? (
                      <BookmarkCheck className="w-5 h-5 mr-2 text-emerald-500" />
                    ) : (
                      <Bookmark className="w-5 h-5 mr-2" />
                    )}
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                  <Button onClick={handleShare} variant="ghost" className="flex-1 text-gray-600">
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>

            {/* Comments Section - Moved up */}
            <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading comments...</div>}>
                <CommentsSection podcastId={podcastId} />
              </Suspense>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Analytics Card */}
            <Card className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Analytics</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <Headphones className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{podcast.listens_count || 0}</p>
                  <p className="text-xs text-gray-500">Plays</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <Eye className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{podcast.views_count || 0}</p>
                  <p className="text-xs text-gray-500">Views</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <Heart className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{podcast.likes || 0}</p>
                  <p className="text-xs text-gray-500">Likes</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <MessageCircle className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{podcast.comments_count || 0}</p>
                  <p className="text-xs text-gray-500">Comments</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium text-gray-900">{formatDuration(podcast.duration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Published</span>
                  <span className="font-medium text-gray-900">{formatDate(podcast.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Saved</span>
                  <span className="font-medium text-gray-900">{podcast.saves_count || 0} times</span>
                </div>
              </div>
            </Card>

            {/* Description Block */}
            <Card className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Description</h3>
                <TabInfoTooltip 
                  title="Description"
                  description="Author's overview and summary of the podcast content, topics covered, and key takeaways."
                />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {podcast.description || 'No description available.'}
              </p>
            </Card>

            {/* Transcript Block */}
            <Card className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Transcript</h3>
                <TabInfoTooltip 
                  title="Transcript"
                  description="Full text transcription of the podcast audio, generated automatically or provided by the author."
                />
              </div>
              <p className="text-sm text-gray-500 italic">
                {podcast.transcript || 'Transcript not available yet.'}
              </p>
            </Card>

            {/* AI Summary Block */}
            <Card className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900">AI Summary</h3>
                <TabInfoTooltip 
                  title="AI Summary"
                  description="AI-generated summary highlighting the main points, key insights, and notable moments from the podcast."
                />
              </div>
              <p className="text-sm text-gray-500 italic">
                {podcast.ai_summary || 'AI summary not available yet.'}
              </p>
            </Card>

            {/* Author Card */}
            {author && (
              <Card className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">About Author</h3>
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                  onClick={() => navigate(`/author/${author.id}`)}
                >
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={author.avatar} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg">
                      {author.name?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{author.name}</p>
                    <p className="text-sm text-gray-500">@{author.username}</p>
                    <p className="text-xs text-emerald-600">{author.followers_count || 0} followers</p>
                  </div>
                </div>
                {author.bio && (
                  <p className="text-sm text-gray-600 mt-4 line-clamp-3">{author.bio}</p>
                )}
                <Button
                  onClick={handleFollow}
                  className={`w-full mt-4 ${isFollowing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
