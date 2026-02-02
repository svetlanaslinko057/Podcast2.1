import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Radio, Users, MessageCircle, Hand, Mic, MicOff, 
  Volume2, VolumeX, Settings, X, UserPlus, ArrowLeft,
  TrendingUp, Clock, Eye, Send, Crown, Shield, Square, Power,
  ExternalLink, Sparkles, Brain, Copy, Check, Link2, Monitor,
  UserX, Ban, MoreVertical, ChevronDown, Waveform
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { CoStreamPanel } from '../components/CoStreamPanel';
import { HandRaiseQueue } from '../components/HandRaiseQueue';
import { SpeechSupportPanel } from '../components/SpeechSupportPanel';
import { CurrentSpeaker } from '../components/CurrentSpeaker';
import { useWallet } from '../context/WalletContext';
import { useLive } from '../context/LiveContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Determine WebSocket URL based on backend URL
const getWsUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  // Replace http with ws, https with wss
  // Also add /api prefix for proper routing through ingress
  return backendUrl.replace(/^http/, 'ws') + '/api';
};

const WS_URL = getWsUrl();
const USE_HTTP_FALLBACK = true; // Use HTTP polling as fallback when WebSocket fails

export const LiveRoom = () => {
  const { podcastId } = useParams();
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  
  // Get persistent userId and username from LiveContext
  const { userId, username, joinLive, leaveLive, minimizeLive, maximizeLive } = useLive();
  
  // State
  const [podcast, setPodcast] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [listeners, setListeners] = useState([]);
  const [handRaised, setHandRaised] = useState(new Set());
  const [chatMessages, setChatMessages] = useState([]);
  const [stats, setStats] = useState({
    total_participants: 0,
    speakers_count: 0,
    listeners_count: 0,
    hand_raised_count: 0
  });
  
  // User state (userId and username come from LiveContext now - persistent across page refreshes)
  const [userRole, setUserRole] = useState('listener');
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Check if user is the host (creator of the podcast)
  const isHost = podcast && (
    walletAddress && podcast.author_id === walletAddress ||
    podcast.author_id === 'demo-author-123' // For demo purposes
  );
  
  // Host controls state
  const [showHostControls, setShowHostControls] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showMicSettings, setShowMicSettings] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [micMode, setMicMode] = useState('standard'); // 'auto', 'standard', 'voice_isolation', 'wide_spectrum'
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  
  // Co-streaming state
  const [isCostreaming, setIsCostreaming] = useState(false);
  
  // Speech support state
  const [showSpeechSupport, setShowSpeechSupport] = useState(false);
  const [lastSpeaker, setLastSpeaker] = useState(null);
  
  // Check if user is moderator/admin
  const isModerator = isHost || userRole === 'moderator' || userRole === 'admin';
  
  // Timing
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Refs
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Get invite link
  const inviteLink = `${window.location.origin}/live/${podcastId}`;
  
  // Copy invite link
  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  // End live broadcast
  const handleEndLive = async () => {
    if (!confirm('Are you sure you want to end this live broadcast?')) return;
    
    try {
      await axios.post(`${API}/podcasts/${podcastId}/end-live`);
      toast.success('Live broadcast ended');
      leaveLive(); // Clear from LiveContext
      navigate('/workspace');
    } catch (error) {
      console.error('Failed to end live:', error);
      leaveLive();
      navigate('/workspace');
    }
  };
  
  // Kick participant
  const handleKickParticipant = (participantId) => {
    toast.success('Participant removed');
    setSelectedParticipant(null);
    // In real implementation, send WebSocket message to kick
  };
  
  // Mute participant
  const handleMuteParticipant = (participantId) => {
    toast.success('Participant muted');
    // In real implementation, send WebSocket message to mute
  };
  
  // Toggle screen share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      setIsScreenSharing(false);
      toast.success('Screen sharing stopped');
    } else {
      try {
        // In real implementation, use navigator.mediaDevices.getDisplayMedia
        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      } catch (error) {
        toast.error('Failed to start screen sharing');
      }
    }
  };
  
  // Load podcast data
  useEffect(() => {
    const loadPodcast = async () => {
      try {
        setLoadError(null);
        
        // First try to load as a live session (for Telegram streams)
        try {
          const liveSessionResponse = await axios.get(`${API}/live/session/${podcastId}`);
          const session = liveSessionResponse.data;
          
          // Transform live session to podcast format for UI
          setPodcast({
            id: session.id,
            title: session.title,
            description: session.description || 'Live from Telegram Voice Chat',
            author_id: session.author_id,
            is_live: session.is_live,
            live_started_at: session.started_at,
            platform: session.platform,
            telegram_source: session.telegram_source,
            cover_image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500'
          });
          
          if (!session.is_live) {
            setLoadError('This live session has ended');
          }
          return;
        } catch (liveError) {
          // Not a live session, try podcast
          if (liveError.response?.status !== 404) {
            console.log('Live session check failed:', liveError);
          }
        }
        
        // Fall back to regular podcast
        const response = await axios.get(`${API}/podcasts/${podcastId}`);
        setPodcast(response.data);
        
        // Check if podcast is actually live
        if (!response.data.is_live) {
          setLoadError('This podcast is not currently live');
        }
      } catch (error) {
        console.error('Failed to load podcast:', error);
        if (error.response?.status === 404) {
          setLoadError('Live room not found');
        } else {
          setLoadError('Failed to load live room. Please try again.');
        }
        toast.error('Failed to load live room');
      }
    };
    
    loadPodcast();
  }, [podcastId]);
  
  // Register with LiveContext when joining - only once when podcast loads
  useEffect(() => {
    if (podcast && !loadError) {
      joinLive({
        id: podcastId,
        title: podcast.title,
        participants: stats.total_participants
      });
      
      // Maximize on return to live page
      maximizeLive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcast?.id, loadError]); // Only trigger on podcast id change
  
  // Handle page navigation - minimize player
  useEffect(() => {
    const handleBeforeUnload = () => {
      minimizeLive();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // When navigating away, minimize the player
      if (podcast) {
        minimizeLive();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Timer for elapsed time
  useEffect(() => {
    if (!podcast?.live_started_at) return;
    
    const updateTimer = () => {
      const start = new Date(podcast.live_started_at);
      const now = new Date();
      const diff = Math.floor((now - start) / 1000);
      setElapsedTime(diff);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [podcast]);
  
  // HTTP polling fallback when WebSocket is disconnected
  useEffect(() => {
    if (isConnected || !podcast) return;
    
    const pollRoomData = async () => {
      try {
        const res = await axios.get(`${API}/live/room/${podcastId}/data`);
        const data = res.data;
        
        setParticipants(data.participants || []);
        setSpeakers(data.speakers || []);
        setListeners(data.listeners || []);
        setHandRaised(new Set(data.hand_raised || []));
        
        // Only update chat messages if there are new ones
        if (data.chat_messages && data.chat_messages.length > chatMessages.length) {
          setChatMessages(data.chat_messages);
        }
        
        if (data.stats) {
          setStats(data.stats);
        }
      } catch (error) {
        console.log('Polling error:', error.message);
      }
    };
    
    // Initial poll
    pollRoomData();
    
    // Poll every 3 seconds when disconnected
    const interval = setInterval(pollRoomData, 3000);
    
    return () => clearInterval(interval);
  }, [isConnected, podcast, podcastId, chatMessages.length]);
  
  // Connect to WebSocket
  useEffect(() => {
    if (!podcast) return;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(
        `${WS_URL}/live/ws/${podcastId}?user_id=${userId}&username=${encodeURIComponent(username)}&role=${userRole}`
      );
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        toast.success('Connected to live room');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
        
        // Try to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connectWebSocket();
        }, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [podcast, podcastId, userId, username, userRole]);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    const { type } = data;
    
    switch (type) {
      case 'room_data':
        console.log('🏠 Room data received:', data.data);
        setParticipants(data.data.participants || []);
        setSpeakers(data.data.speakers || []);
        setListeners(data.data.listeners || []);
        setHandRaised(new Set(data.data.hand_raised || []));
        setChatMessages(data.data.chat_messages || []);
        setStats(data.data.stats || stats);
        break;
      
      case 'user_joined':
        console.log('👋 User joined:', data.user_id);
        setStats(data.stats);
        toast.success(`${data.user_id} joined`, { duration: 2000 });
        break;
      
      case 'user_left':
        console.log('👋 User left');
        setStats(data.stats);
        break;
      
      case 'chat_message':
        console.log('💬 Chat message:', data.message);
        setChatMessages(prev => [...prev, data.message]);
        break;
      
      case 'hand_raised_update':
        console.log('✋ Hand raised update:', data);
        setHandRaised(new Set(data.hand_raised));
        setStats(data.stats);
        if (data.user_id === userId) {
          setIsHandRaised(data.action === 'raise');
        }
        break;
      
      case 'user_promoted':
        console.log('⬆️ User promoted:', data.user_id);
        if (data.user_id === userId) {
          setUserRole('speaker');
          setIsHandRaised(false);
          toast.success('You are now a speaker!');
        }
        setStats(data.stats);
        break;
      
      case 'user_demoted':
        console.log('⬇️ User demoted:', data.user_id);
        if (data.user_id === userId) {
          setUserRole('listener');
          toast.info('You are now a listener');
        }
        setStats(data.stats);
        break;
      
      case 'speaking_status':
        setParticipants(prev => 
          prev.map(p => 
            p.user_id === data.user_id 
              ? { ...p, is_speaking: data.is_speaking }
              : p
          )
        );
        break;
      
      default:
        console.log('❓ Unknown message type:', type);
        break;
    }
  };
  
  // Send WebSocket message
  const sendWSMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('📤 Sending WebSocket message:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.error('❌ WebSocket not connected');
      toast.error('Not connected to live room');
      return false;
    }
  };
  
  // Forward message to co-stream if active
  const forwardToCostream = async (username, message) => {
    if (!isCostreaming) return;
    
    try {
      await axios.post(`${API}/costream/forward/${podcastId}`, {
        username,
        message
      });
    } catch (error) {
      console.log('Co-stream forward error:', error.message);
    }
  };
  
  // Chat functions
  const sendChatMessage = async (e) => {
    e?.preventDefault();
    
    if (!chatMessage.trim()) return;
    
    const messageToSend = chatMessage.trim();
    
    // Try WebSocket first
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const success = sendWSMessage({
        type: 'chat_message',
        message: messageToSend
      });
      
      if (success) {
        // Forward to co-stream
        forwardToCostream(username, messageToSend);
        setChatMessage('');
        return;
      }
    }
    
    // HTTP fallback
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('username', username);
      formData.append('message', messageToSend);
      
      const res = await axios.post(`${API}/live/room/${podcastId}/chat`, formData);
      
      if (res.data.success) {
        // Add message locally since WebSocket might not be connected
        setChatMessages(prev => [...prev, res.data.message]);
        // Forward to co-stream
        forwardToCostream(username, messageToSend);
        setChatMessage('');
        toast.success('Message sent!');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };
  
  // Hand raise/lower
  const toggleHandRaise = async () => {
    const action = isHandRaised ? 'lower' : 'raise';
    
    // Try WebSocket first
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const success = sendWSMessage({
        type: 'hand_raise',
        action: action
      });
      
      if (success) {
        setIsHandRaised(!isHandRaised);
        return;
      }
    }
    
    // HTTP fallback
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('action', action);
      
      const res = await axios.post(`${API}/live/room/${podcastId}/hand`, formData);
      
      if (res.data.success) {
        setIsHandRaised(!isHandRaised);
        toast.success(action === 'raise' ? 'Hand raised!' : 'Hand lowered');
      }
    } catch (error) {
      console.error('Failed to toggle hand:', error);
      toast.error('Failed to ' + action + ' hand');
    }
  };
  
  // End Stream function (host only)
  const handleEndStream = async () => {
    if (!isHost) {
      toast.error('Only the host can end the stream');
      return;
    }
    
    if (!window.confirm('Вы уверены, что хотите завершить стрим? Все участники будут отключены.')) {
      return;
    }
    
    try {
      // End the stream via API
      await axios.post(`${API}/podcasts/${podcastId}/end-stream`);
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      toast.success('Стрим завершён');
      navigate('/library');
    } catch (error) {
      console.error('Failed to end stream:', error);
      toast.error('Не удалось завершить стрим');
    }
  };
  
  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  
  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Show error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Radio className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Join</h2>
          <p className="text-gray-600 mb-6">{loadError}</p>
          <Button onClick={() => navigate('/')} className="bg-emerald-500 hover:bg-emerald-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back Home
          </Button>
        </Card>
      </div>
    );
  }
  
  // Show loading state
  if (!podcast) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-pulse" />
          <div className="text-gray-900 font-medium">Loading live room...</div>
          <p className="text-sm text-gray-500 mt-2">Connecting to the broadcast</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {/* TELEGRAM LISTEN BANNER - Prominent CTA */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white mb-6 shadow-lg">
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
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                {podcast.cover_image ? (
                  <img 
                    src={podcast.cover_image} 
                    alt={podcast.title}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <Radio className="w-12 h-12 text-white" />
                )}
              </div>
              
              {/* Pulsating LIVE indicator */}
              <div className="absolute -top-2 -right-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <Badge className="relative bg-red-500 text-white px-3 py-1 font-bold">
                    LIVE
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {podcast.title}
              </h1>
              <p className="text-gray-600 mb-4">
                {podcast.description}
              </p>
              
              {/* Stats Bar */}
              <div className="flex items-center gap-6 text-gray-700 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold">{stats.total_participants}</span>
                  <span className="text-sm">participants</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-teal-500" />
                  <span className="font-semibold">{stats.speakers_count}</span>
                  <span className="text-sm">speakers</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Hand className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold">{stats.hand_raised_count}</span>
                  <span className="text-sm">hands raised</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">{formatDuration(elapsedTime)}</span>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              
              {/* Telegram Listen Button - Prominent CTA */}
              <div className="flex items-center gap-4">
                <a
                  href="https://t.me/P_FOMO?voicechat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z"/>
                  </svg>
                  🎧 Listen in Telegram Voice Chat
                  <ExternalLink className="w-5 h-5" />
                </a>
                
                {/* End Stream Button - Host Only */}
                {isHost && (
                  <Button
                    onClick={handleEndLive}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    End Stream
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* HOST CONTROLS PANEL */}
        {isHost && (
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900">Host Controls</h3>
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-0">You're the host</Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Invite Link */}
                <button
                  onClick={() => setShowInvitePanel(!showInvitePanel)}
                  className="flex items-center gap-2 p-3 bg-white rounded-xl border border-purple-200 hover:border-purple-400 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">Invite</p>
                    <p className="text-xs text-gray-500">Share link</p>
                  </div>
                </button>
                
                {/* Mic Settings */}
                <button
                  onClick={() => setShowMicSettings(!showMicSettings)}
                  className="flex items-center gap-2 p-3 bg-white rounded-xl border border-purple-200 hover:border-purple-400 transition-colors"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Mic className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">Mic Mode</p>
                    <p className="text-xs text-gray-500 capitalize">{micMode.replace('_', ' ')}</p>
                  </div>
                </button>
                
                {/* Screen Share */}
                <button
                  onClick={toggleScreenShare}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                    isScreenSharing 
                      ? 'bg-red-50 border-red-300' 
                      : 'bg-white border-purple-200 hover:border-purple-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isScreenSharing ? 'bg-red-100' : 'bg-orange-100'
                  }`}>
                    <Monitor className={`w-5 h-5 ${isScreenSharing ? 'text-red-600' : 'text-orange-600'}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">
                      {isScreenSharing ? 'Stop Share' : 'Share Screen'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isScreenSharing ? 'Broadcasting...' : 'Present'}
                    </p>
                  </div>
                </button>
                
                {/* Participants */}
                <button
                  onClick={() => setShowHostControls(!showHostControls)}
                  className="flex items-center gap-2 p-3 bg-white rounded-xl border border-purple-200 hover:border-purple-400 transition-colors"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 text-sm">Manage</p>
                    <p className="text-xs text-gray-500">{stats.total_participants} users</p>
                  </div>
                </button>
              </div>
              
              {/* Invite Panel */}
              {showInvitePanel && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-purple-200">
                  <p className="text-sm text-gray-600 mb-3">Share this link to invite participants:</p>
                  <div className="flex gap-2">
                    <Input 
                      value={inviteLink} 
                      readOnly 
                      className="flex-1 bg-gray-50"
                    />
                    <Button
                      onClick={copyInviteLink}
                      className={linkCopied ? 'bg-emerald-500' : 'bg-blue-500 hover:bg-blue-600'}
                    >
                      {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Mic Settings Panel */}
              {showMicSettings && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-purple-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">Microphone Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'auto', label: 'Automatic', desc: 'Adapts to environment' },
                      { id: 'standard', label: 'Standard', desc: 'Default mode' },
                      { id: 'voice_isolation', label: 'Voice Isolation', desc: 'Reduces background noise' },
                      { id: 'wide_spectrum', label: 'Wide Spectrum', desc: 'Captures full range' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setMicMode(mode.id);
                          toast.success(`Mic mode: ${mode.label}`);
                        }}
                        className={`p-3 rounded-lg text-left transition-all ${
                          micMode === mode.id
                            ? 'bg-emerald-50 border-2 border-emerald-500'
                            : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                        }`}
                      >
                        <p className={`font-medium text-sm ${micMode === mode.id ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {mode.label}
                        </p>
                        <p className="text-xs text-gray-500">{mode.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Participants Management */}
              {showHostControls && participants.length > 0 && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-purple-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">Manage Participants</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {participants.map(p => (
                      <div 
                        key={p.user_id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-purple-100 text-purple-700">
                              {p.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{p.username}</p>
                            <p className="text-xs text-gray-500 capitalize">{p.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMuteParticipant(p.user_id)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title="Mute"
                          >
                            <MicOff className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleKickParticipant(p.user_id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            title="Remove"
                          >
                            <UserX className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
        
        {/* Telegram Channel Info (for Telegram-originated streams) */}
        {podcast.platform === 'telegram' && podcast.telegram_source && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-4">
                {/* Channel Icon */}
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Send className="w-7 h-7" />
                </div>
                
                {/* Channel Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 text-sm">Streaming from</span>
                    <div className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                      Telegram
                    </div>
                  </div>
                  <a 
                    href={`https://t.me/${podcast.telegram_source.channel_username?.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-bold hover:underline flex items-center gap-2"
                  >
                    @{podcast.telegram_source.channel_username?.replace('@', '')}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                
                {/* Live indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="font-medium">Voice Chat Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* TELEGRAM LISTEN BANNER - Always Visible */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">🎧 Listen Live in Telegram</h3>
                  <p className="text-white/80">Join the Voice Chat in @P_FOMO to listen to this stream</p>
                </div>
              </div>
              <a
                href="https://t.me/P_FOMO?voicechat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-lg"
              >
                Open Telegram
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Co-Streaming Panel (show only for non-Telegram streams) */}
        {podcast.platform !== 'telegram' && (
          <div className="mb-6">
            <CoStreamPanel
              podcastId={podcastId}
              authorId={podcast.author_id}
              title={podcast.title}
              platformUrl={window.location.href}
              onStatusChange={setIsCostreaming}
            />
          </div>
        )}
        
        {/* Current Speaker & Hand Raise Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <CurrentSpeaker 
            sessionId={podcastId}
            currentUserId={userId}
            isModerator={isModerator}
            onSpeechEnd={(speaker) => {
              setLastSpeaker(speaker);
              setShowSpeechSupport(true);
            }}
          />
          <HandRaiseQueue 
            sessionId={podcastId}
            currentUserId={userId}
            isModerator={isModerator}
            onSpeakerApproved={() => {}}
          />
        </div>
        
        {/* Speech Support Modal */}
        {showSpeechSupport && lastSpeaker && (
          <div className="mb-6">
            <SpeechSupportPanel 
              speechId={lastSpeaker.hand_raise_id}
              speakerName={lastSpeaker.name}
              currentUserId={userId}
              speakerId={lastSpeaker.user_id}
              onClose={() => {
                setShowSpeechSupport(false);
                setLastSpeaker(null);
              }}
            />
          </div>
        )}
        
        {/* TELEGRAM BANNER FOR LISTENERS */}
        {!isHost && (
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
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content - Participants */}
          <div className="lg:col-span-2">
            <Card className="bg-white border border-gray-200 rounded-3xl p-6">
              
              {/* Speakers Section */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-teal-500" />
                  Speakers ({stats.speakers_count})
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {participants
                    .filter(p => speakers.includes(p.user_id))
                    .map((participant) => (
                      <div 
                        key={participant.user_id}
                        className="relative"
                      >
                        <div className={`
                          relative rounded-2xl p-4 text-center transition-all duration-300
                          ${participant.is_speaking 
                            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 ring-4 ring-emerald-400 scale-105' 
                            : 'bg-gray-50 hover:bg-gray-100'
                          }
                        `}>
                          <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-bold text-xl relative">
                            {participant.user_id.slice(0, 2).toUpperCase()}
                            
                            {/* Speaking indicator */}
                            {participant.is_speaking && (
                              <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-pulse"></div>
                            )}
                          </div>
                          
                          <p className="text-gray-900 font-medium text-sm truncate">
                            {participant.user_id === userId ? 'You' : participant.user_id}
                          </p>
                          
                          {participant.is_muted && (
                            <MicOff className="w-4 h-4 text-red-500 mx-auto mt-1" />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                
                {stats.speakers_count === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No speakers yet
                  </div>
                )}
              </div>
              
              {/* Listeners Section */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  Listeners ({stats.listeners_count})
                </h2>
                
                <div className="flex flex-wrap gap-2">
                  {participants
                    .filter(p => listeners.includes(p.user_id))
                    .slice(0, 50)
                    .map((participant) => (
                      <div 
                        key={participant.user_id}
                        className="relative group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-bold text-xs ring-2 ring-gray-200 hover:ring-emerald-400 transition-all cursor-pointer">
                          {participant.user_id.slice(0, 2).toUpperCase()}
                        </div>
                        
                        {/* Hand raised indicator */}
                        {handRaised.has(participant.user_id) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center animate-bounce">
                            <Hand className="w-3 h-3 text-gray-900" />
                          </div>
                        )}
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {participant.user_id === userId ? 'You' : participant.user_id}
                        </div>
                      </div>
                    ))}
                  
                  {stats.listeners_count > 50 && (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-medium">
                      +{stats.listeners_count - 50}
                    </div>
                  )}
                </div>
                
                {stats.listeners_count === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No listeners yet
                  </div>
                )}
              </div>
              
              {/* User Controls */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-4">
                  {userRole === 'listener' && (
                    <Button
                      onClick={toggleHandRaise}
                      disabled={!isConnected}
                      className={`
                        rounded-full px-8 py-6 font-semibold text-lg transition-all
                        ${isHandRaised 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        }
                      `}
                    >
                      <Hand className="w-6 h-6 mr-2" />
                      {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                    </Button>
                  )}
                  
                  {userRole === 'speaker' && (
                    <>
                      <Button
                        onClick={() => setIsMuted(!isMuted)}
                        disabled={!isConnected}
                        className={`
                          rounded-full p-6 transition-all
                          ${isMuted 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-emerald-500 hover:bg-emerald-600'
                          }
                        `}
                      >
                        {isMuted ? (
                          <MicOff className="w-6 h-6 text-white" />
                        ) : (
                          <Mic className="w-6 h-6 text-white" />
                        )}
                      </Button>
                      
                      <span className="text-gray-600 text-sm">
                        {isMuted ? 'Unmute to speak' : 'You can speak'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
            </Card>
          </div>
          
          {/* Sidebar - Chat */}
          <div className="lg:col-span-1">
            <Card className="bg-white border border-gray-200 rounded-3xl h-[600px] flex flex-col">
              
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  Live Chat
                </h3>
                <Badge className="bg-emerald-50 text-emerald-700">
                  {chatMessages.length}
                </Badge>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No messages yet. Be the first to say something!
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {msg.username?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium text-sm truncate">
                            {msg.username || 'Unknown'}
                            {msg.user_id === userId && <span className="text-emerald-600 ml-1">(You)</span>}
                          </p>
                          <p className="text-gray-700 text-sm break-words">
                            {msg.message}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Chat Input */}
              <form onSubmit={sendChatMessage} className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage(e)}
                    placeholder={isConnected ? "Type a message..." : "Connecting..."}
                    disabled={!isConnected}
                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl"
                  />
                  <Button
                    type="submit"
                    disabled={!isConnected || !chatMessage.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600 rounded-xl px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
              
            </Card>
            
            {/* AI Live Features (for Telegram streams) */}
            {podcast.platform === 'telegram' && (
              <Card className="bg-white border border-gray-200 rounded-3xl p-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h3 className="font-bold text-gray-900">AI Features</h3>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Beta</span>
                </div>
                
                <div className="space-y-3">
                  {/* Live Transcription */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Live Transcription</span>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Real-time speech-to-text will be available after stream ends
                    </p>
                  </div>
                  
                  {/* AI Summary */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">AI Summary</span>
                      <Brain className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Key points and highlights generated after stream
                    </p>
                  </div>
                  
                  {/* Q&A */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Q&A Mode</span>
                      <MessageCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Use chat to ask questions to the speaker
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};
