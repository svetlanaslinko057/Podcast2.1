import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, X, Maximize2, Minimize2, 
  SkipBack, SkipForward, Volume2, VolumeX 
} from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

export const FloatingPlayer = ({ 
  podcast, 
  isPlaying, 
  currentTime, 
  duration,
  onPlayPause, 
  onClose,
  onMaximize,
  onSkip,
  volume = 1,
  onVolumeChange
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: window.innerHeight - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localVolume, setLocalVolume] = useState(volume);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.volume-slider')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 380, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 180, e.clientY - dragOffset.y))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setLocalVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (onVolumeChange) onVolumeChange(localVolume || 1);
    } else {
      setIsMuted(true);
      if (onVolumeChange) onVolumeChange(0);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Minimized state - just a floating button
  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
        }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full p-4 shadow-2xl cursor-pointer hover:scale-110 transition-all group"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2 relative">
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
          {/* Pulsing indicator when playing */}
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
          )}
        </div>
        {/* Tooltip on hover */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {podcast?.title?.substring(0, 30)}...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        width: '380px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Podcast thumbnail or icon */}
          {podcast?.cover_image ? (
            <img 
              src={podcast.cover_image} 
              alt="" 
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-sm truncate">
              {podcast?.title || 'Playing...'}
            </h4>
            <p className="text-white/80 text-xs truncate">
              {podcast?.author?.name || 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="h-7 w-7 p-0 hover:bg-white/20 text-white"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
            className="h-7 w-7 p-0 hover:bg-white/20 text-white"
            title="Back to full player"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-7 w-7 p-0 hover:bg-white/20 text-white"
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Player Controls */}
      <div className="p-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer group">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all group-hover:from-emerald-400 group-hover:to-teal-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1.5">
            <span className="font-medium">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          {/* Volume Control */}
          <div 
            className="relative volume-slider"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
            >
              {isMuted || localVolume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
            {/* Volume Slider Popup */}
            {showVolumeSlider && (
              <div 
                className="absolute bottom-full left-0 mb-2 p-3 bg-white rounded-xl shadow-xl border border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <Slider
                  orientation="vertical"
                  value={[isMuted ? 0 : localVolume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="h-20"
                />
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            {/* Skip Back */}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (onSkip) onSkip(-15);
              }}
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
              title="Replay 15 seconds"
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            {/* Play/Pause */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </Button>

            {/* Skip Forward */}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (onSkip) onSkip(30);
              }}
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
              title="Skip 30 seconds"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Time Display */}
          <div className="text-xs text-gray-500 font-medium min-w-[45px] text-right">
            -{formatTime(duration - currentTime)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingPlayer;
