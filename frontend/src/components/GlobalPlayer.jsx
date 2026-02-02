import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  X, Maximize2, Heart, ListMusic, Shuffle, Repeat
} from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Context for global player state
const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const [currentPodcast, setCurrentPodcast] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // none, one, all
  
  const audioRef = useRef(new Audio());
  
  // Setup audio events
  useEffect(() => {
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (queue.length > 0 && queueIndex < queue.length - 1) {
        playNext();
      } else if (repeatMode === 'all' && queue.length > 0) {
        setQueueIndex(0);
        playPodcast(queue[0]);
      } else {
        setIsPlaying(false);
      }
    };
    const handleError = (e) => {
      console.error('Audio error:', e);
      toast.error('Failed to play audio');
      setIsPlaying(false);
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [repeatMode, queue, queueIndex]);
  
  // Update volume
  useEffect(() => {
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);
  
  const playPodcast = (podcast) => {
    if (!podcast?.audio_file_id && !podcast?.audio_url) {
      toast.error('No audio available for this podcast');
      return;
    }
    
    const audioUrl = podcast.audio_url || `${API}/podcasts/${podcast.id}/audio`;
    
    if (currentPodcast?.id !== podcast.id) {
      audioRef.current.src = audioUrl;
      setCurrentPodcast(podcast);
      setCurrentTime(0);
      // Set initial duration from podcast data as fallback
      if (podcast.duration && podcast.duration > 0) {
        setDuration(podcast.duration);
      }
    }
    
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(err => {
        console.error('Play error:', err);
        toast.error('Failed to play');
      });
  };
  
  const pausePodcast = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };
  
  const togglePlay = () => {
    if (isPlaying) {
      pausePodcast();
    } else if (currentPodcast) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Play error:', err));
    }
  };
  
  const seekTo = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };
  
  const seekByPercent = (percent) => {
    const time = (percent / 100) * duration;
    seekTo(time);
  };
  
  const skip = (seconds) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    seekTo(newTime);
  };
  
  const playNext = () => {
    if (queue.length === 0) return;
    
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (queueIndex + 1) % queue.length;
    }
    
    setQueueIndex(nextIndex);
    playPodcast(queue[nextIndex]);
  };
  
  const playPrevious = () => {
    if (currentTime > 3) {
      seekTo(0);
      return;
    }
    
    if (queue.length === 0) return;
    
    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIndex);
    playPodcast(queue[prevIndex]);
  };
  
  const addToQueue = (podcast) => {
    setQueue(prev => [...prev, podcast]);
    toast.success('Added to queue');
  };
  
  const clearQueue = () => {
    setQueue([]);
    setQueueIndex(0);
  };
  
  const closePodcast = () => {
    audioRef.current.pause();
    audioRef.current.src = '';
    setCurrentPodcast(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };
  
  const value = {
    currentPodcast,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isMinimized,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    playPodcast,
    pausePodcast,
    togglePlay,
    seekTo,
    seekByPercent,
    skip,
    playNext,
    playPrevious,
    addToQueue,
    clearQueue,
    closePodcast,
    setVolume,
    setIsMuted,
    setIsMinimized,
    setIsShuffle,
    setRepeatMode,
  };
  
  return (
    <PlayerContext.Provider value={value}>
      {children}
      {currentPodcast && <GlobalMiniPlayer />}
    </PlayerContext.Provider>
  );
};

// Mini Player Component
const GlobalMiniPlayer = () => {
  const navigate = useNavigate();
  const {
    currentPodcast,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isMinimized,
    isShuffle,
    repeatMode,
    togglePlay,
    skip,
    playNext,
    playPrevious,
    seekByPercent,
    setVolume,
    setIsMuted,
    setIsMinimized,
    setIsShuffle,
    setRepeatMode,
    closePodcast,
  } = usePlayer();
  
  const formatTime = (time) => {
    if (!time || isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progressPercent = (duration > 0 && isFinite(duration)) ? (currentTime / duration) * 100 : 0;
  
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-gray-900 rounded-full p-2 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
        onClick={() => setIsMinimized(false)}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 shadow-2xl">
      {/* Progress Bar (clickable) */}
      <div 
        className="h-1 bg-gray-700 cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = ((e.clientX - rect.left) / rect.width) * 100;
          seekByPercent(percent);
        }}
      >
        <div 
          className="h-full bg-emerald-500 relative group-hover:bg-emerald-400 transition-colors"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Podcast Info */}
        <div 
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/podcast/${currentPodcast.id}`)}
        >
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 flex-shrink-0">
            {currentPodcast.cover_image ? (
              <img 
                src={currentPodcast.cover_image} 
                alt={currentPodcast.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ListMusic className="w-7 h-7 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate hover:underline">
              {currentPodcast.title}
            </p>
            <p className="text-sm text-gray-400 truncate">
              {currentPodcast.author_name || 'Unknown Artist'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-emerald-500 flex-shrink-0"
          >
            <Heart className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Center: Controls */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShuffle(!isShuffle)}
              className={`h-8 w-8 ${isShuffle ? 'text-emerald-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={playPrevious}
              className="text-gray-400 hover:text-white h-8 w-8"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            
            <Button
              size="icon"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white hover:bg-gray-200 text-gray-900"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={playNext}
              className="text-gray-400 hover:text-white h-8 w-8"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const modes = ['none', 'all', 'one'];
                const currentIndex = modes.indexOf(repeatMode);
                setRepeatMode(modes[(currentIndex + 1) % modes.length]);
              }}
              className={`h-8 w-8 relative ${repeatMode !== 'none' ? 'text-emerald-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-[10px] font-bold">1</span>
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Right: Volume & Actions */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="text-gray-400 hover:text-white h-8 w-8"
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
              onValueChange={([v]) => {
                setVolume(v);
                setIsMuted(v === 0);
              }}
              className="flex-1"
            />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white h-8 w-8"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={closePodcast}
            className="text-gray-400 hover:text-red-500 h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlayerProvider;
