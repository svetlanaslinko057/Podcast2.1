import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LiveContext = createContext(null);

export const useLive = () => {
  const context = useContext(LiveContext);
  if (!context) {
    throw new Error('useLive must be used within LiveProvider');
  }
  return context;
};

export const LiveProvider = ({ children }) => {
  // Current active live session
  const [activeLive, setActiveLive] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Persistent user ID for this browser session
  const [userId] = useState(() => {
    const stored = sessionStorage.getItem('fomo_live_user_id');
    if (stored) return stored;
    const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('fomo_live_user_id', newId);
    return newId;
  });
  
  // Username
  const [username] = useState(() => {
    const stored = sessionStorage.getItem('fomo_live_username');
    if (stored) return stored;
    const newName = `Guest${Math.floor(Math.random() * 10000)}`;
    sessionStorage.setItem('fomo_live_username', newName);
    return newName;
  });
  
  // Join a live room
  const joinLive = useCallback((liveData) => {
    setActiveLive({
      ...liveData,
      joinedAt: new Date().toISOString()
    });
    setIsMinimized(false);
    
    // Store in sessionStorage for persistence
    sessionStorage.setItem('fomo_active_live', JSON.stringify(liveData));
  }, []);
  
  // Leave a live room
  const leaveLive = useCallback(() => {
    setActiveLive(null);
    setIsMinimized(false);
    sessionStorage.removeItem('fomo_active_live');
  }, []);
  
  // Minimize the live player (when navigating away)
  const minimizeLive = useCallback(() => {
    if (activeLive) {
      setIsMinimized(true);
    }
  }, [activeLive]);
  
  // Maximize (return to live room)
  const maximizeLive = useCallback(() => {
    setIsMinimized(false);
  }, []);
  
  // Restore active live on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('fomo_active_live');
    if (stored) {
      try {
        const liveData = JSON.parse(stored);
        setActiveLive(liveData);
        setIsMinimized(true); // Start minimized if restored
      } catch (e) {
        console.error('Failed to restore live session:', e);
      }
    }
  }, []);
  
  const value = {
    activeLive,
    isMinimized,
    userId,
    username,
    joinLive,
    leaveLive,
    minimizeLive,
    maximizeLive,
    isInLive: !!activeLive
  };
  
  return (
    <LiveContext.Provider value={value}>
      {children}
    </LiveContext.Provider>
  );
};
