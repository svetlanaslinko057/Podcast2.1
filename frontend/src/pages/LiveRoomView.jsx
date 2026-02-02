import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Radio, Users, MessageCircle, Hand, Crown, 
  Mic, MicOff, Volume2, VolumeX, Send, ArrowLeft,
  Loader2, AlertCircle, Phone, PhoneOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

// LiveKit imports
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  useParticipants,
  useLocalParticipant,
  AudioTrack,
  TrackToggle,
  ConnectionState,
  useConnectionState
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';

const API = process.env.REACT_APP_BACKEND_URL;

// Sound notification for new messages
const playMessageSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('Audio notification not available');
  }
};

// Generate avatar color from username
const getAvatarColor = (name) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-cyan-500',
    'bg-orange-500', 'bg-teal-500'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

// Avatar component
const UserAvatar = ({ name, size = 'md', className = '' }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const colorClass = getAvatarColor(name || 'default');
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg'
  };
  
  return (
    <div className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold ${className}`}>
      {initial}
    </div>
  );
};

// Generate or retrieve persistent user ID
const getUserId = () => {
  let userId = localStorage.getItem('live_user_id');
  if (!userId) {
    userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('live_user_id', userId);
  }
  return userId;
};

const getUsername = () => {
  return localStorage.getItem('live_username') || 'Anonymous';
};

// LiveKit Audio Room Component
const AudioRoom = ({ sessionId, userId, username, role, onRoleChange }) => {
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const audioTracks = useTracks([Track.Source.Microphone]);
  
  const isSpeaker = role === 'speaker';
  const isConnected = connectionState === ConnectionState.Connected;
  
  useEffect(() => {
    if (isConnected) {
      toast.success('Connected to audio room');
    }
  }, [isConnected]);
  
  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
        <span className="text-gray-300">
          {connectionState === ConnectionState.Connecting && 'Connecting to audio...'}
          {connectionState === ConnectionState.Connected && `${participants.length} in audio room`}
          {connectionState === ConnectionState.Disconnected && 'Disconnected'}
          {connectionState === ConnectionState.Reconnecting && 'Reconnecting...'}
        </span>
      </div>
      
      {/* Audio Participants */}
      <div className="flex flex-wrap justify-center gap-4">
        {participants.map((participant) => {
          const isSpeaking = participant.isSpeaking;
          const isMuted = !participant.isMicrophoneEnabled;
          const isLocal = participant.isLocal;
          
          return (
            <div key={participant.identity} className="text-center">
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center mb-2
                ${isSpeaking ? 'ring-4 ring-green-500 animate-pulse' : ''}
                ${isLocal ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'}
              `}>
                {isMuted ? (
                  <MicOff className="w-8 h-8 text-white/50" />
                ) : (
                  <Mic className={`w-8 h-8 text-white ${isSpeaking ? 'animate-bounce' : ''}`} />
                )}
              </div>
              <p className="text-white text-sm font-medium">
                {participant.name || participant.identity}
                {isLocal && ' (You)'}
              </p>
              <p className="text-gray-400 text-xs">
                {participant.permissions?.canPublish ? 'Speaker' : 'Listener'}
              </p>
            </div>
          );
        })}
      </div>
      
      {/* Audio Tracks (invisible, just for playback) */}
      {audioTracks.map((trackRef) => (
        <AudioTrack
          key={trackRef.participant.identity + trackRef.source}
          trackRef={trackRef}
        />
      ))}
      
      {/* Speaker Controls */}
      {isSpeaker && isConnected && (
        <div className="flex justify-center gap-4 pt-4">
          <TrackToggle
            source={Track.Source.Microphone}
            className="px-6 py-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2"
          >
            {({ enabled }) => (
              <>
                {enabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                {enabled ? 'Mute' : 'Unmute'}
              </>
            )}
          </TrackToggle>
        </div>
      )}
    </div>
  );
};

export const LiveRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // User state
  const [userId] = useState(getUserId);
  const [username, setUsername] = useState(getUsername);
  const [myRole, setMyRole] = useState('listener');
  
  // Session state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // LiveKit state
  const [liveKitToken, setLiveKitToken] = useState(null);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isJoiningAudio, setIsJoiningAudio] = useState(false);
  
  // Room state from WebSocket
  const [participants, setParticipants] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [listeners, setListeners] = useState([]);
  const [handRaised, setHandRaised] = useState([]);
  const [stats, setStats] = useState({ total_participants: 0, speakers_count: 0, listeners_count: 0, hand_raised_count: 0 });
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Reactions state
  const [reactions, setReactions] = useState([]);
  
  // WebSocket
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  
  // Audio state
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  // Load session data
  const loadSession = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/live-sessions/sessions/${sessionId}`);
      setSession(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Session not found');
      setLoading(false);
    }
  }, [sessionId]);
  
  // Get LiveKit token
  const joinAudioRoom = useCallback(async () => {
    if (isJoiningAudio) return;
    setIsJoiningAudio(true);
    
    try {
      const response = await axios.post(`${API}/api/live-sessions/livekit/token`, {
        session_id: sessionId,
        user_id: userId,
        username: username,
        role: myRole
      });
      
      if (response.data.mock_mode) {
        toast.error('Audio not available: LiveKit not configured on server');
        setIsJoiningAudio(false);
        return;
      }
      
      setLiveKitToken(response.data.token);
      setLiveKitUrl(response.data.url);
      setAudioEnabled(true);
      toast.success('Joining audio room...');
    } catch (err) {
      console.error('Failed to get LiveKit token:', err);
      toast.error('Failed to join audio room');
    }
    setIsJoiningAudio(false);
  }, [sessionId, userId, username, myRole, isJoiningAudio]);
  
  const leaveAudioRoom = useCallback(() => {
    setAudioEnabled(false);
    setLiveKitToken(null);
    setLiveKitUrl(null);
    toast.info('Left audio room');
  }, []);
  
  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = API.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(
      `${wsUrl}/api/live-sessions/ws/${sessionId}?user_id=${userId}&username=${encodeURIComponent(username)}&role=${myRole}`
    );
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      // Don't show toast on reconnect to avoid spam
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWsMessage(data);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };
    
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed');
      setWsConnected(false);
      
      // Reconnect after delay if session is still active
      if (session?.status === 'live' || session?.status === 'active') {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };
    
    wsRef.current = ws;
  }, [sessionId, userId, username, myRole, session?.status]);
  
  // Handle WebSocket messages
  const handleWsMessage = (data) => {
    switch (data.type) {
      case 'room_state':
        setParticipants(data.participants || []);
        setSpeakers(data.speakers || []);
        setListeners(data.listeners || []);
        setHandRaised(data.hand_raised || []);
        setMessages(data.chat_messages || []);
        setStats(data.stats || {});
        break;
        
      case 'user_joined':
        // Only show toast for other users, not self
        if (data.user_id !== userId) {
          toast.info(`${data.username || 'User'} joined`);
        }
        setStats(data.stats || stats);
        break;
        
      case 'user_left':
        setStats(data.stats || stats);
        break;
        
      case 'chat_message':
        setMessages(prev => [...prev, data.message]);
        // Play sound for new messages from others
        if (data.message.user_id !== userId) {
          playMessageSound();
        }
        break;
        
      case 'reaction':
        setReactions(prev => [...prev, { 
          id: Date.now(), 
          emoji: data.emoji,
          username: data.username 
        }]);
        setTimeout(() => {
          setReactions(prev => prev.slice(1));
        }, 2000);
        break;
        
      case 'hand_raised_update':
        setHandRaised(data.hand_raised || []);
        setStats(data.stats || stats);
        if (data.user_id !== userId) {
          if (data.action === 'raise') {
            toast.info(`Someone raised their hand`);
          }
        }
        break;
        
      case 'user_promoted':
        if (data.user_id === userId) {
          setMyRole('speaker');
          toast.success('You are now a speaker! Rejoin audio to speak.');
          // Need to rejoin audio with speaker role
          if (audioEnabled) {
            leaveAudioRoom();
          }
        }
        setStats(data.stats || stats);
        break;
        
      case 'user_demoted':
        if (data.user_id === userId) {
          setMyRole('listener');
          toast.info('You are now a listener');
          if (audioEnabled) {
            leaveAudioRoom();
          }
        }
        setStats(data.stats || stats);
        break;
        
      case 'pong':
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };
  
  // Send WebSocket message
  const sendWsMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };
  
  // Effects
  useEffect(() => {
    loadSession();
  }, [loadSession]);
  
  useEffect(() => {
    if (session?.status === 'live' || session?.status === 'scheduled' || session?.status === 'active') {
      connectWebSocket();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [session?.status, connectWebSocket]);
  
  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      sendWsMessage({ type: 'ping' });
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Handlers
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendWsMessage({ type: 'chat', message: newMessage.trim() });
    setNewMessage('');
  };
  
  const handleReaction = (emoji) => {
    sendWsMessage({ type: 'reaction', emoji });
  };
  
  const handleRaiseHand = () => {
    const action = isHandRaised ? 'lower' : 'raise';
    sendWsMessage({ type: 'hand_raise', action });
    setIsHandRaised(!isHandRaised);
    toast.success(isHandRaised ? 'Hand lowered' : 'Hand raised!');
  };
  
  const handlePromote = (targetUserId) => {
    sendWsMessage({ type: 'promote', target_user_id: targetUserId });
  };
  
  const handleDemote = (targetUserId) => {
    sendWsMessage({ type: 'demote', target_user_id: targetUserId });
  };
  
  const handleSetUsername = () => {
    const name = prompt('Enter your display name:', username);
    if (name && name.trim()) {
      setUsername(name.trim());
      localStorage.setItem('live_username', name.trim());
      toast.success('Username updated. Reconnecting...');
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioEnabled) {
        leaveAudioRoom();
      }
      setTimeout(connectWebSocket, 500);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading session...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-4">This live session doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/live')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }
  
  const isLive = session.status === 'live';
  const isScheduled = session.status === 'scheduled';
  const isEnded = session.status === 'ended' || session.status === 'recorded';
  const isSpeaker = myRole === 'speaker';
  
  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Floating Reactions */}
      <div className="fixed bottom-20 right-4 pointer-events-none z-50">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="text-4xl animate-bounce-up opacity-0"
            style={{
              animation: 'floatUp 2s ease-out forwards'
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-100px) scale(1.5); }
        }
      `}</style>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/live')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{session.title}</h1>
                {isLive && (
                  <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium flex items-center gap-2 animate-pulse">
                    <Radio className="w-4 h-4" />
                    LIVE
                  </span>
                )}
                {isScheduled && (
                  <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-medium">
                    SCHEDULED
                  </span>
                )}
                {isEnded && (
                  <span className="px-3 py-1 bg-gray-500 text-white rounded-full text-sm font-medium">
                    ENDED
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">{session.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-400 text-sm">{wsConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
        
        {/* TELEGRAM LISTEN BANNER */}
        {isLive && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">🎧 Listen in Telegram Voice Chat</h3>
                    <p className="text-white/80 text-sm">Join @P_FOMO to listen to this live stream</p>
                  </div>
                </div>
                <a
                  href="https://t.me/P_FOMO?voicechat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  Open Telegram
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stage / Audio Room */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="min-h-[250px] flex flex-col items-center justify-center">
                  {isLive ? (
                    <>
                      {audioEnabled && liveKitToken && liveKitUrl ? (
                        <LiveKitRoom
                          token={liveKitToken}
                          serverUrl={liveKitUrl}
                          connect={true}
                          audio={isSpeaker}
                          video={false}
                          onDisconnected={() => {
                            setAudioEnabled(false);
                            toast.info('Disconnected from audio');
                          }}
                          onError={(error) => {
                            console.error('LiveKit error:', error);
                            toast.error('Audio error: ' + error.message);
                          }}
                        >
                          <AudioRoom 
                            sessionId={sessionId}
                            userId={userId}
                            username={username}
                            role={myRole}
                            onRoleChange={setMyRole}
                          />
                        </LiveKitRoom>
                      ) : (
                        <div className="text-center">
                          <div className="flex items-center gap-2 mb-4 justify-center">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-white font-medium">Live Stream</span>
                          </div>
                          
                          <p className="text-gray-400 mb-6">
                            {isSpeaker ? 'You can speak in this room' : 'Listening mode'}
                          </p>
                          
                          <Button
                            onClick={joinAudioRoom}
                            disabled={isJoiningAudio}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                            data-testid="join-audio-btn"
                          >
                            {isJoiningAudio ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Joining...
                              </>
                            ) : (
                              <>
                                <Phone className="w-5 h-5 mr-2" />
                                Join Audio Room
                              </>
                            )}
                          </Button>
                          
                          <p className="text-gray-500 text-xs mt-4">
                            Click to join the live audio conversation
                          </p>
                        </div>
                      )}
                      
                      {/* Leave audio button */}
                      {audioEnabled && (
                        <div className="mt-4">
                          <Button
                            onClick={leaveAudioRoom}
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <PhoneOff className="w-4 h-4 mr-2" />
                            Leave Audio
                          </Button>
                        </div>
                      )}
                    </>
                  ) : isScheduled ? (
                    <div className="text-center">
                      <Radio className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Session Scheduled</h3>
                      <p className="text-gray-400">Waiting for host to start...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Radio className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Session Ended</h3>
                      <p className="text-gray-400">This session has ended</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Reactions */}
            {isLive && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">React:</span>
                    <div className="flex gap-2">
                      {['👍', '❤️', '🔥', '👏', '🎉', '😂', '🤔'].map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(emoji)}
                          className="text-2xl hover:scale-125 transition-transform hover:bg-gray-700"
                          data-testid={`reaction-${emoji}`}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Chat */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 overflow-y-auto mb-4 space-y-2 p-2 bg-gray-900 rounded-lg" data-testid="chat-messages">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No messages yet. Say hi!</p>
                  ) : (
                    messages.map((msg, idx) => (
                      <div 
                        key={msg.id || idx} 
                        className={`p-2 rounded-lg flex gap-2 ${msg.user_id === userId ? 'bg-blue-900/50 ml-8' : 'bg-gray-800 mr-8'}`}
                      >
                        <UserAvatar name={msg.username} size="sm" className="flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-white truncate">{msg.username}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 break-words">{msg.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {(isLive || isScheduled) && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="bg-gray-900 border-gray-700 text-white"
                      data-testid="chat-input"
                    />
                    <Button onClick={handleSendMessage} data-testid="chat-send">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-4">
            {/* User Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Your name</p>
                    <p className="text-white font-medium">{username}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSetUsername} className="text-gray-400">
                    Edit
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${isSpeaker ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-700 text-gray-300'}`}>
                    {isSpeaker ? 'Speaker' : 'Listener'}
                  </span>
                  {audioEnabled && (
                    <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-300">
                      In Audio
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Raise Hand */}
            {isLive && !isSpeaker && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white">Want to Speak?</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleRaiseHand}
                    className={`w-full ${isHandRaised ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                    data-testid="raise-hand-btn"
                  >
                    <Hand className={`w-4 h-4 mr-2 ${isHandRaised ? 'animate-bounce' : ''}`} />
                    {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Host will see your request
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Hand Raised Queue (for speakers/hosts) */}
            {isSpeaker && handRaised.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Hand className="w-5 h-5 text-yellow-500" />
                    Hands Raised ({handRaised.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {handRaised.map((uid) => {
                      const user = participants.find(p => p.user_id === uid);
                      const displayName = user?.username || uid;
                      return (
                        <div key={uid} className="flex items-center justify-between p-2 bg-gray-900 rounded">
                          <div className="flex items-center gap-2">
                            <UserAvatar name={displayName} size="sm" />
                            <span className="text-white text-sm">{displayName}</span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handlePromote(uid)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Promote
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Participants */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants ({stats.total_participants})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-64 overflow-y-auto" data-testid="participants-list">
                  {/* Speakers */}
                  {participants.filter(p => speakers.includes(p.user_id)).map((p) => (
                    <div key={p.user_id} className="flex items-center gap-2 p-2 bg-purple-500/10 rounded">
                      <UserAvatar name={p.username} size="sm" />
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span className="text-white text-sm flex-1">{p.username}</span>
                      {isSpeaker && p.user_id !== userId && (
                        <Button size="sm" variant="ghost" onClick={() => handleDemote(p.user_id)} className="text-gray-400 h-6 px-2">
                          Demote
                        </Button>
                      )}
                    </div>
                  ))}
                  {/* Listeners */}
                  {participants.filter(p => listeners.includes(p.user_id)).map((p) => (
                    <div key={p.user_id} className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded">
                      <UserAvatar name={p.username} size="sm" />
                      <span className="text-gray-300 text-sm flex-1">{p.username}</span>
                      {handRaised.includes(p.user_id) && (
                        <Hand className="w-4 h-4 text-yellow-500 animate-bounce" />
                      )}
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No participants yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Session Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Session Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-white font-medium capitalize">{session.status}</span>
                </div>
                {session.started_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Started</span>
                    <span className="text-white">{new Date(session.started_at).toLocaleTimeString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Speakers</span>
                  <span className="text-white">{stats.speakers_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Listeners</span>
                  <span className="text-white">{stats.listeners_count}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveRoom;
