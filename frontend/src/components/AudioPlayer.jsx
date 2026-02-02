import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, 
  Download, Share2, RotateCcw, Settings, Clock, Gauge, Timer, Bookmark,
  Sparkles, MessageSquareQuote, Zap, FileText, X, Copy, Check, Minimize2
} from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import WaveSurfer from 'wavesurfer.js';
import { FloatingPlayer } from './FloatingPlayer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const playbackSpeeds = [0.5, 0.7, 0.75, 1, 1.25, 1.5, 1.75, 2.0];
const sleepTimerOptions = [5, 10, 15, 30, 45, 60]; // minutes

export const AudioPlayer = ({ audioUrl, podcast }) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sleepTimer, setSleepTimer] = useState(null); // minutes
  const [sleepTimerEnd, setSleepTimerEnd] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumePosition, setResumePosition] = useState(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiQuotes, setAiQuotes] = useState([]);
  const [aiHighlights, setAiHighlights] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(null);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  
  const userId = 'demo-user-123'; // Replace with actual user ID
  const sleepTimerRef = useRef(null);
  
  // Track listening progress every 10 seconds
  useEffect(() => {
    if (!podcast?.id || !isPlaying) return;
    
    const trackProgress = async () => {
      if (wavesurfer.current) {
        const current = Math.floor(wavesurfer.current.getCurrentTime());
        const total = Math.floor(wavesurfer.current.getDuration());
        
        if (current > 0 && total > 0) {
          try {
            const formData = new FormData();
            formData.append('user_id', userId);
            formData.append('current_position', current);
            formData.append('duration', total);
            
            await fetch(`${API}/analytics/podcasts/${podcast.id}/progress`, {
              method: 'POST',
              body: formData
            });
            
            console.log(`📊 Tracked: ${current}s / ${total}s`);
          } catch (error) {
            console.error('Failed to track progress:', error);
          }
        }
      }
    };
    
    // Track immediately
    trackProgress();
    
    // Then every 10 seconds
    const interval = setInterval(trackProgress, 10000);
    
    return () => clearInterval(interval);
  }, [isPlaying, podcast?.id]);
  
  useEffect(() => {
    let ws = null;
    let mounted = true;
    const abortController = new AbortController();
    
    const initWaveSurfer = async () => {
      if (!waveformRef.current || !audioUrl) return;
      
      try {
        ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: 'rgba(16, 185, 129, 0.4)',
          progressColor: '#10b981',
          cursorColor: '#10b981',
          barWidth: 3,
          barRadius: 3,
          cursorWidth: 2,
          height: 80,
          barGap: 2,
          responsive: true,
          normalize: true,
          backend: 'MediaElement',
          fetchParams: { signal: abortController.signal }
        });
        
        wavesurfer.current = ws;
        
        ws.on('ready', () => {
          if (mounted) {
            setDuration(ws.getDuration());
            setIsLoading(false);
            
            // Load bookmarks
            loadBookmarks();
            
            // Check for resume position
            checkResumePosition();
          }
        });
        
        ws.on('audioprocess', () => {
          if (mounted && ws) {
            try {
              setCurrentTime(ws.getCurrentTime());
            } catch (e) {
              // Ignore
            }
          }
        });
        
        ws.on('finish', () => {
          if (mounted) {
            setIsPlaying(false);
            trackListen();
          }
        });
        
        ws.on('error', (err) => {
          if (mounted && err?.name !== 'AbortError') {
            console.error('WaveSurfer error:', err);
            setError('Failed to load audio');
            setIsLoading(false);
          }
        });
        
        // Load audio
        ws.load(audioUrl);
        
      } catch (err) {
        if (mounted && err?.name !== 'AbortError') {
          console.error('WaveSurfer init error:', err);
          setError('Failed to initialize player');
          setIsLoading(false);
        }
      }
    };
    
    initWaveSurfer();
    
    return () => {
      mounted = false;
      abortController.abort();
      
      if (ws) {
        try {
          ws.pause();
        } catch (e) { /* ignore */ }
        
        try {
          ws.unAll();
        } catch (e) { /* ignore */ }
        
        // Delay destroy to let abort settle
        setTimeout(() => {
          try {
            ws.destroy();
          } catch (e) { /* ignore */ }
        }, 0);
        
        wavesurfer.current = null;
      }
    };
  }, [audioUrl]);
  
  const trackListen = async () => {
    try {
      const formData = new FormData();
      formData.append('duration', Math.floor(currentTime));
      await fetch(`${API}/podcasts/${podcast.id}/listen`, {
        method: 'POST',
        body: formData
      });
    } catch (e) {
      console.error('Failed to track listen:', e);
    }
  };
  
  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(newVolume);
    }
  };
  
  const toggleMute = () => {
    if (wavesurfer.current) {
      if (isMuted) {
        wavesurfer.current.setVolume(volume || 1);
        setIsMuted(false);
      } else {
        wavesurfer.current.setVolume(0);
        setIsMuted(true);
      }
    }
  };
  
  const skip = (seconds) => {
    if (wavesurfer.current && duration > 0) {
      const current = wavesurfer.current.getCurrentTime();
      const newTime = Math.max(0, Math.min(duration, current + seconds));
      wavesurfer.current.seekTo(newTime / duration);
    }
  };
  
  // Specific skip functions
  const skipBackward15 = () => {
    skip(-15);
    toast.success('⏪ Replayed 15 seconds');
  };
  
  const skipForward30 = () => {
    skip(30);
    toast.success('⏩ Skipped 30 seconds');
  };
  
  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (wavesurfer.current) {
      wavesurfer.current.setPlaybackRate(speed);
    }
    toast.success(`Playback speed: ${speed}x`);
  };
  
  // Sleep Timer functions
  const setSleepTimerDuration = (minutes) => {
    // Clear existing timer
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
    }
    
    if (minutes === 0) {
      setSleepTimer(null);
      setSleepTimerEnd(null);
      toast.info('Sleep timer cancelled');
      return;
    }
    
    const endTime = Date.now() + minutes * 60000;
    setSleepTimer(minutes);
    setSleepTimerEnd(endTime);
    
    sleepTimerRef.current = setTimeout(() => {
      if (wavesurfer.current && isPlaying) {
        wavesurfer.current.pause();
        setIsPlaying(false);
      }
      setSleepTimer(null);
      setSleepTimerEnd(null);
      toast.info('😴 Sleep timer ended - playback paused');
    }, minutes * 60000);
    
    toast.success(`⏰ Sleep timer set for ${minutes} minutes`);
  };
  
  // Calculate remaining sleep time
  const getRemainingMinutes = () => {
    if (!sleepTimerEnd) return 0;
    const remaining = Math.max(0, sleepTimerEnd - Date.now());
    return Math.ceil(remaining / 60000);
  };
  
  // Update timer display every minute
  useEffect(() => {
    if (!sleepTimerEnd) return;
    
    const interval = setInterval(() => {
      const remaining = getRemainingMinutes();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepTimerEnd]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);
  
  // ============= BOOKMARKS =============
  
  const loadBookmarks = async () => {
    if (!podcast?.id) return;
    try {
      const response = await fetch(`${API}/podcasts/${podcast.id}/bookmarks?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setBookmarks(data);
        console.log(`📌 Loaded ${data.length} bookmarks`);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };
  
  const addBookmark = async () => {
    if (!podcast?.id || !wavesurfer.current) return;
    
    const timestamp = Math.floor(wavesurfer.current.getCurrentTime());
    const note = prompt('Add a note for this bookmark (optional):');
    
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('timestamp', timestamp);
      if (note) formData.append('note', note);
      
      const response = await fetch(`${API}/podcasts/${podcast.id}/bookmarks`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const bookmark = await response.json();
        setBookmarks([...bookmarks, bookmark]);
        toast.success(`📌 Bookmark added at ${formatTime(timestamp)}`);
      }
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      toast.error('Failed to add bookmark');
    }
  };
  
  const deleteBookmark = async (bookmarkId) => {
    try {
      const response = await fetch(`${API}/bookmarks/${bookmarkId}?user_id=${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
        toast.success('Bookmark deleted');
      }
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      toast.error('Failed to delete bookmark');
    }
  };
  
  const jumpToBookmark = (timestamp) => {
    if (wavesurfer.current && duration > 0) {
      wavesurfer.current.seekTo(timestamp / duration);
      toast.success(`Jumped to ${formatTime(timestamp)}`);
    }
  };
  
  // ============= SMART RESUME =============
  
  const checkResumePosition = async () => {
    if (!podcast?.id) return;
    try {
      const response = await fetch(`${API}/podcasts/${podcast.id}/resume?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.position > 10) { // Only resume if more than 10 seconds in
          setResumePosition(data.position);
          setShowResumeDialog(true);
        }
      }
    } catch (error) {
      console.error('Failed to check resume position:', error);
    }
  };
  
  const resumePlayback = () => {
    if (resumePosition && wavesurfer.current && duration > 0) {
      wavesurfer.current.seekTo(resumePosition / duration);
      toast.success(`Resumed from ${formatTime(resumePosition)}`);
    }
    setShowResumeDialog(false);
    setResumePosition(null);
  };
  
  const startFromBeginning = () => {
    setShowResumeDialog(false);
    setResumePosition(null);
  };
  
  // ============= AI FEATURES =============
  
  const generateAISummary = async () => {
    if (!podcast?.id) return;
    setLoadingAI(true);
    try {
      toast.loading('Generating AI summary...', { id: 'ai-summary' });
      const formData = new FormData();
      formData.append('force_regenerate', 'false');
      
      const response = await fetch(`${API}/ai/podcast/${podcast.id}/summary`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
        toast.success('Summary generated!', { id: 'ai-summary' });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to generate summary', { id: 'ai-summary' });
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      toast.error('Failed to generate summary', { id: 'ai-summary' });
    } finally {
      setLoadingAI(false);
    }
  };
  
  const extractQuotes = async () => {
    if (!podcast?.id) return;
    setLoadingAI(true);
    try {
      toast.loading('Extracting quotes...', { id: 'ai-quotes' });
      const formData = new FormData();
      formData.append('count', '5');
      formData.append('force_regenerate', 'false');
      
      const response = await fetch(`${API}/ai/podcast/${podcast.id}/quotes`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiQuotes(data.quotes);
        toast.success(`Extracted ${data.quotes.length} quotes!`, { id: 'ai-quotes' });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to extract quotes', { id: 'ai-quotes' });
      }
    } catch (error) {
      console.error('Failed to extract quotes:', error);
      toast.error('Failed to extract quotes', { id: 'ai-quotes' });
    } finally {
      setLoadingAI(false);
    }
  };
  
  const detectHighlights = async () => {
    if (!podcast?.id) return;
    setLoadingAI(true);
    try {
      toast.loading('Detecting highlights...', { id: 'ai-highlights' });
      const formData = new FormData();
      formData.append('count', '3');
      formData.append('force_regenerate', 'false');
      
      const response = await fetch(`${API}/ai/podcast/${podcast.id}/highlights`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiHighlights(data.highlights);
        toast.success(`Found ${data.highlights.length} highlights!`, { id: 'ai-highlights' });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to detect highlights', { id: 'ai-highlights' });
      }
    } catch (error) {
      console.error('Failed to detect highlights:', error);
      toast.error('Failed to detect highlights', { id: 'ai-highlights' });
    } finally {
      setLoadingAI(false);
    }
  };
  
  const copyQuote = async (quote, index) => {
    const text = `"${quote}"\n\n— ${podcast.author?.name || 'Unknown'} on "${podcast.title}"`;
    await navigator.clipboard.writeText(text);
    setCopiedQuote(index);
    toast.success('Quote copied!');
    setTimeout(() => setCopiedQuote(null), 2000);
  };
  
  const shareQuote = async (quote) => {
    const text = `"${quote}"\n\n— ${podcast.author?.name || 'Unknown'} on "${podcast.title}"`;
    const url = `${window.location.origin}/podcast/${podcast.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyQuote(quote);
        }
      }
    } else {
      copyQuote(quote);
    }
  };
  
  const jumpToHighlight = (startTime) => {
    if (wavesurfer.current && duration > 0) {
      wavesurfer.current.seekTo(startTime / duration);
      toast.success('Jumped to highlight!');
    }
  };
  
  const handleDownload = async () => {
    try {
      toast.loading('Preparing download...', { id: 'download' });
      const downloadUrl = `${audioUrl}?download=true`;
      
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${podcast?.title || 'podcast'}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started!', { id: 'download' });
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed', { id: 'download' });
    }
  };
  
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/podcast/${podcast?.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: podcast?.title,
          text: podcast?.description,
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };
  
  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatRemainingTime = () => {
    const remaining = duration - currentTime;
    return `-${formatTime(remaining)}`;
  };
  
  if (error) {
    return (
      <Card className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6 mb-8" data-testid="audio-player">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{podcast?.title}</h3>
          {podcast?.chapters?.length > 0 && (
            <p className="text-sm text-gray-500">{podcast.chapters.length} chapters</p>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Picture-in-Picture Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFloatingPlayer(true)}
            className="rounded-xl border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200"
            title="Picture-in-Picture mode"
            data-testid="pip-button"
          >
            <Minimize2 className="w-4 h-4 mr-1" />
            PiP
          </Button>
          
          {/* AI Features Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`rounded-xl border-gray-200 ${showAIPanel ? 'bg-purple-50 border-purple-200 text-purple-600' : 'text-gray-600'} hover:text-purple-600 hover:border-purple-200`}
            data-testid="ai-features-button"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            AI
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="rounded-xl border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200"
            data-testid="download-button"
          >
            <Download className="w-4 h-4 mr-1" />
            MP3
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="rounded-xl border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200"
            data-testid="share-player-button"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* AI Panel */}
      {showAIPanel && (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-purple-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI-Powered Features
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIPanel(false)}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* AI Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button
              onClick={generateAISummary}
              disabled={loadingAI}
              className="bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl justify-start"
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Auto Summary
            </Button>
            
            <Button
              onClick={extractQuotes}
              disabled={loadingAI}
              className="bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl justify-start"
              size="sm"
            >
              <MessageSquareQuote className="w-4 h-4 mr-2" />
              Extract Quotes
            </Button>
            
            <Button
              onClick={detectHighlights}
              disabled={loadingAI}
              className="bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-xl justify-start col-span-2"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              Detect Best Moments
            </Button>
          </div>
          
          {/* AI Results */}
          {aiSummary && (
            <div className="bg-white rounded-xl p-4 mb-3">
              <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                AI Summary
              </h5>
              <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
            </div>
          )}
          
          {aiQuotes.length > 0 && (
            <div className="bg-white rounded-xl p-4 mb-3">
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-purple-600" />
                Shareable Quotes ({aiQuotes.length})
              </h5>
              <div className="space-y-2">
                {aiQuotes.map((quote, index) => (
                  <div
                    key={index}
                    className="bg-purple-50 border border-purple-100 rounded-lg p-3 group"
                  >
                    <p className="text-sm text-gray-700 italic mb-2">"{quote}"</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyQuote(quote, index)}
                        className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                      >
                        {copiedQuote === index ? (
                          <><Check className="w-3 h-3 mr-1" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3 mr-1" /> Copy</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => shareQuote(quote)}
                        className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {aiHighlights.length > 0 && (
            <div className="bg-white rounded-xl p-4">
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                Best Moments ({aiHighlights.length})
              </h5>
              <div className="space-y-2">
                {aiHighlights.map((highlight, index) => (
                  <button
                    key={index}
                    onClick={() => jumpToHighlight(highlight.start_time)}
                    className="w-full bg-purple-50 border border-purple-100 rounded-lg p-3 text-left hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h6 className="font-medium text-purple-900 text-sm mb-1">
                          {highlight.title}
                        </h6>
                        <p className="text-xs text-gray-600">{highlight.description || highlight.reason}</p>
                      </div>
                      <span className="text-xs text-purple-600 font-semibold ml-2">
                        {formatTime(highlight.start_time)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {loadingAI && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </Card>
      )}
      
      {/* Waveform */}
      <div 
        className={`bg-gray-50 rounded-xl p-4 mb-4 transition-opacity ${isLoading ? 'opacity-50' : ''}`}
        ref={waveformRef}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {/* Time Display */}
      <div className="flex justify-between text-sm mb-4">
        <span className="text-gray-900 font-medium">{formatTime(currentTime)}</span>
        <span className="text-gray-500">{formatRemainingTime()}</span>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {/* Replay 15 seconds */}
        <Button
          size="icon"
          variant="ghost"
          onClick={skipBackward15}
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl relative h-11 w-11"
          data-testid="replay-15-button"
          title="Replay 15 seconds"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="absolute -bottom-0.5 text-[10px] font-bold">15</span>
        </Button>
        
        {/* Skip Back 10 */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => skip(-10)}
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
          data-testid="skip-backward-button"
        >
          <SkipBack className="w-5 h-5" />
        </Button>
        
        {/* Play/Pause */}
        <Button
          size="icon"
          className="w-16 h-16 rounded-full bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all"
          onClick={togglePlay}
          disabled={isLoading}
          data-testid="play-pause-button"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7" />
          ) : (
            <Play className="w-7 h-7 ml-1" />
          )}
        </Button>
        
        {/* Skip Next */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => skip(10)}
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl relative"
          data-testid="skip-forward-button"
        >
          <RotateCcw className="w-5 h-5 scale-x-[-1]" />
          <span className="absolute -bottom-1 text-[10px] font-bold">10</span>
        </Button>
        
        {/* Skip 30 seconds */}
        <Button
          size="icon"
          variant="ghost"
          onClick={skipForward30}
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl relative h-11 w-11"
          data-testid="skip-30-button"
          title="Skip 30 seconds"
        >
          <SkipForward className="w-5 h-5" />
          <span className="absolute -bottom-0.5 text-[10px] font-bold">30</span>
        </Button>
      </div>
      
      {/* Bottom Controls: Volume & Speed */}
      <div className="flex items-center justify-between">
        {/* Volume */}
        <div className="flex items-center gap-3 w-40">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            className="text-gray-500 hover:text-gray-900 h-8 w-8"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>
        
        {/* Speed Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-200 text-gray-600 hover:text-emerald-600"
            >
              <Gauge className="w-4 h-4 mr-1" />
              {playbackSpeed}x
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-gray-200 rounded-xl shadow-lg">
            <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {playbackSpeeds.map((speed) => (
              <DropdownMenuItem
                key={speed}
                onClick={() => changeSpeed(speed)}
                className={`cursor-pointer ${playbackSpeed === speed ? 'bg-emerald-50 text-emerald-600 font-semibold' : ''}`}
              >
                {speed}x {speed === 1 && '(Normal)'}
                {playbackSpeed === speed && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Sleep Timer */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              size="sm" 
              className={`rounded-xl border-gray-200 ${sleepTimer ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-gray-600'} hover:text-emerald-600 relative`}
            >
              <Timer className="w-4 h-4 mr-1" />
              {sleepTimer ? `${getRemainingMinutes()}m` : 'Sleep'}
              {sleepTimer && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-gray-200 rounded-xl shadow-lg w-40">
            <DropdownMenuLabel>Sleep Timer</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sleepTimerOptions.map((minutes) => (
              <DropdownMenuItem
                key={minutes}
                onClick={() => setSleepTimerDuration(minutes)}
                className={`cursor-pointer ${sleepTimer === minutes ? 'bg-emerald-50 text-emerald-600 font-semibold' : ''}`}
              >
                <Clock className="w-3.5 h-3.5 mr-2" />
                <span>{minutes} min</span>
              </DropdownMenuItem>
            ))}
            {sleepTimer && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSleepTimerDuration(0)}
                  className="text-red-600 cursor-pointer"
                >
                  <span>✕ Cancel</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      {/* Chapters (if available) */}
      {podcast?.chapters?.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Chapters ({podcast.chapters.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {podcast.chapters.map((chapter, index) => {
              const isActive = currentTime >= chapter.start_time && 
                             (index === podcast.chapters.length - 1 || currentTime < podcast.chapters[index + 1]?.start_time);
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (wavesurfer.current && duration > 0) {
                      wavesurfer.current.seekTo(chapter.start_time / duration);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                    isActive 
                      ? 'bg-emerald-50 border border-emerald-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex-1">
                    <span className={`block font-medium ${isActive ? 'text-emerald-900' : 'text-gray-900'}`}>
                      {chapter.title}
                    </span>
                    {chapter.description && (
                      <span className="block text-xs text-gray-500 mt-0.5">{chapter.description}</span>
                    )}
                  </div>
                  <span className={`text-sm ml-4 ${isActive ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>
                    {formatTime(chapter.start_time)}
                  </span>
                  {isActive && (
                    <span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Bookmarks */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-600" />
            Bookmarks ({bookmarks.length})
          </h4>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={addBookmark}
              className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            >
              <Bookmark className="w-3.5 h-3.5 mr-1.5" />
              Add
            </Button>
            {bookmarks.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowBookmarks(!showBookmarks)}
                className="rounded-xl"
              >
                {showBookmarks ? 'Hide' : 'Show'}
              </Button>
            )}
          </div>
        </div>
        
        {showBookmarks && bookmarks.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl transition-colors group"
              >
                <button
                  onClick={() => jumpToBookmark(bookmark.timestamp)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-600">
                      {formatTime(bookmark.timestamp)}
                    </span>
                    {bookmark.note && (
                      <span className="text-sm text-gray-600">- {bookmark.note}</span>
                    )}
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteBookmark(bookmark.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <span className="text-xs">✕</span>
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {bookmarks.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No bookmarks yet. Click "Add" to save important moments.
          </p>
        )}
      </div>
      
      {/* Smart Resume Dialog */}
      {showResumeDialog && resumePosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Continue Listening?</h3>
            <p className="text-gray-600 mb-4">
              You were at <span className="font-semibold text-emerald-600">{formatTime(resumePosition)}</span>
            </p>
            <div className="flex gap-3">
              <Button
                onClick={resumePlayback}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                Resume
              </Button>
              <Button
                onClick={startFromBeginning}
                variant="outline"
                className="flex-1 rounded-xl border-gray-200"
              >
                Start Over
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Player (Picture-in-Picture mode) */}
      {showFloatingPlayer && (
        <FloatingPlayer
          podcast={podcast}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          onPlayPause={togglePlay}
          onSkip={skip}
          onVolumeChange={(v) => {
            setVolume(v);
            setIsMuted(v === 0);
            if (wavesurfer.current) {
              wavesurfer.current.setVolume(v);
            }
          }}
          onClose={() => setShowFloatingPlayer(false)}
          onMaximize={() => {
            setShowFloatingPlayer(false);
            toast.success('Back to full player');
          }}
        />
      )}
    </Card>
  );
};
