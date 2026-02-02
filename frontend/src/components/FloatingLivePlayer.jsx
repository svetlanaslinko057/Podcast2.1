import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLive } from '../context/LiveContext';
import { Radio, X, Maximize2, Users, Clock, Volume2, VolumeX } from 'lucide-react';

export const FloatingLivePlayer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeLive, isMinimized, leaveLive, maximizeLive } = useLive();
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // Calculate elapsed time
  useEffect(() => {
    if (!activeLive?.joinedAt) return;
    
    const interval = setInterval(() => {
      const start = new Date(activeLive.joinedAt);
      const now = new Date();
      setElapsedTime(Math.floor((now - start) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeLive?.joinedAt]);
  
  // Don't show if no active live or not minimized
  if (!activeLive || !isMinimized) return null;
  
  // Don't show on the live room page itself
  if (location.pathname.includes('/live/')) return null;
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleReturn = () => {
    maximizeLive();
    navigate(`/live/${activeLive.id}`);
  };
  
  const handleClose = () => {
    if (confirm('Leave this live broadcast?')) {
      leaveLive();
    }
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
      {/* Main floating card */}
      <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden w-80 border border-gray-700">
        {/* Live indicator bar */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 h-1"></div>
        
        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Radio className="w-5 h-5 text-red-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="text-xs text-red-400 font-medium">LIVE NOW</p>
                <p className="text-white font-semibold text-sm truncate max-w-[180px]">
                  {activeLive.title}
                </p>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {activeLive.participants || 1}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(elapsedTime)}
            </span>
          </div>
          
          {/* Waveform animation */}
          <div className="flex items-center gap-1 h-6 mb-4">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-red-500 to-orange-400 rounded-full"
                style={{
                  height: `${Math.random() * 100}%`,
                  minHeight: '4px',
                  animation: `pulse ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Mute toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-xl transition-colors ${
                isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            
            {/* Return to live button */}
            <button
              onClick={handleReturn}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              Return to Live
            </button>
          </div>
        </div>
      </div>
      
      {/* Styles for waveform animation */}
      <style>{`
        @keyframes pulse {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};
