import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Radio, Calendar, Users, Play, Square, Trash2, Copy, ExternalLink, Clock, Mic, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useWallet } from '../context/WalletContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Telegram Voice Chat URL
const TELEGRAM_VOICE_CHAT_URL = "https://t.me/P_FOMO?voicechat";
const TELEGRAM_GROUP_URL = "https://t.me/P_FOMO";

// Countdown component for scheduled sessions
const ScheduleCountdown = ({ scheduledAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isPast, setIsPast] = useState(false);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const scheduled = new Date(scheduledAt);
      const diff = scheduled - now;
      
      if (diff <= 0) {
        setIsPast(true);
        setTimeLeft('Starting soon...');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt]);
  
  const scheduledDate = new Date(scheduledAt);
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${isPast ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
      <Clock className="w-4 h-4" />
      <div className="flex-1">
        <div className="font-medium text-xs">
          {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-xs font-bold">
          {isPast ? '⏰ ' : '⏳ '}{timeLeft}
        </div>
      </div>
    </div>
  );
};

export const LiveManagement = () => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Create form
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    scheduleType: 'now'  // 'now' or 'later'
  });

  useEffect(() => {
    checkAdminRole();
    loadSessions();
  }, [walletAddress]);

  const checkAdminRole = async () => {
    // For private club - allow access without wallet
    // If wallet is connected, check if admin
    if (walletAddress) {
      try {
        const response = await axios.get(`${API}/admin/check-role/${walletAddress}`);
        const isAdminUser = response.data.is_admin || response.data.is_owner;
        setIsAdmin(isAdminUser);
      } catch (error) {
        setIsAdmin(true); // Allow access on error for private club
      }
    } else {
      // No wallet - still allow access for private club
      setIsAdmin(true);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await axios.get(`${API}/live-sessions/sessions`);
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    // Prepare data
    const sessionData = {
      title: newSession.title,
      description: newSession.description
    };

    // Add scheduled_at if scheduling for later
    if (newSession.scheduleType === 'later' && newSession.scheduled_at) {
      sessionData.scheduled_at = new Date(newSession.scheduled_at).toISOString();
    }

    try {
      const headers = walletAddress ? { 'X-Wallet-Address': walletAddress } : {};
      const response = await axios.post(`${API}/live-sessions/sessions`, sessionData, { headers });
      
      toast.success('Live session created!');
      setShowCreateModal(false);
      setNewSession({ title: '', description: '', scheduled_at: '', scheduleType: 'now' });
      loadSessions();
      
      // Show RTMP details
      showRTMPDetails(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Admin access required to create sessions');
      } else {
        toast.error('Failed to create session');
      }
    }
  };

  const showRTMPDetails = (data) => {
    toast.success(
      <div className="space-y-2">
        <p className="font-bold">✅ Сессия создана!</p>
        <p className="text-sm">Нажмите "Start" когда будете готовы начать стрим</p>
        <p className="text-xs text-gray-500">После старта откроется Voice Chat в Telegram</p>
      </div>,
      { duration: 5000 }
    );
  };

  const handleStartSession = async (sessionId) => {
    try {
      await axios.post(`${API}/live-sessions/sessions/${sessionId}/start`, {}, {
        headers: { 'X-Wallet-Address': walletAddress }
      });
      toast.success(
        <div className="space-y-2">
          <p className="font-bold">🔴 Стрим запущен!</p>
          <p className="text-sm">Теперь откройте Voice Chat в Telegram</p>
          <a 
            href={TELEGRAM_VOICE_CHAT_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block mt-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
          >
            🎙️ Открыть Voice Chat
          </a>
        </div>,
        { duration: 10000 }
      );
      loadSessions();
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to start session');
      }
    }
  };

  const handleEndSession = async (sessionId) => {
    if (!window.confirm('End this live session?')) return;
    
    try {
      await axios.post(`${API}/live-sessions/sessions/${sessionId}/end`, {}, {
        headers: { 'X-Wallet-Address': walletAddress }
      });
      toast.success('Session ended!');
      loadSessions();
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to end session');
      }
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this session?')) return;
    
    try {
      await axios.delete(`${API}/live-sessions/sessions/${sessionId}`, {
        headers: { 'X-Wallet-Address': walletAddress }
      });
      toast.success('Session deleted');
      loadSessions();
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to delete session');
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return 'bg-red-500 text-white';
      case 'scheduled': return 'bg-blue-500 text-white';
      case 'ended': return 'bg-gray-500 text-white';
      case 'recorded': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Radio className="w-8 h-8" />
              Live Sessions
            </h1>
            <p className="text-gray-600 mt-2">
              Manage live streaming sessions
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-red-500 hover:bg-red-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Live Session
          </Button>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                    {session.status}
                  </span>
                </div>
                <CardDescription>{session.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Session Info */}
                <div className="text-sm text-gray-600 space-y-1">
                  {/* Scheduled time with countdown */}
                  {session.scheduled_at && session.status === 'scheduled' && (
                    <ScheduleCountdown scheduledAt={session.scheduled_at} />
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  </div>
                  {session.started_at && (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      <span>Started: {new Date(session.started_at).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>

                {/* RTMP Info (for scheduled sessions) */}
                {session.status === 'scheduled' && session.rtmp_url && (
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="text-xs font-medium text-gray-700">RTMP Setup:</div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={session.rtmp_url}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(session.rtmp_url)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  {session.status === 'scheduled' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStartSession(session.id)}
                        className="bg-red-500 hover:bg-red-600 flex-1"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    </div>
                  )}
                  
                  {session.status === 'live' && (
                    <>
                      {/* Voice Chat Button - главная кнопка для live */}
                      <a
                        href={TELEGRAM_VOICE_CHAT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full"
                      >
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full"
                        >
                          <Mic className="w-4 h-4 mr-2" />
                          Открыть Voice Chat в Telegram
                        </Button>
                      </a>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/live/${session.id}`)}
                          variant="outline"
                          className="flex-1"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Чат
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEndSession(session.id)}
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Square className="w-4 h-4 mr-1" />
                          End
                        </Button>
                      </div>
                    </>
                  )}
                  
                  {(session.status === 'ended' || session.status === 'recorded') && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/live/${session.id}`)}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Replay
                    </Button>
                  )}
                  
                  {session.status !== 'live' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSession(session.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Radio className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No live sessions yet</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-red-500 hover:bg-red-600"
            >
              Create First Session
            </Button>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create Live Session</CardTitle>
                <CardDescription>
                  Start a new live streaming session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Weekly Club Discussion"
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Talk about recent developments..."
                    value={newSession.description}
                    onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  />
                </div>

                {/* Schedule Options */}
                <div className="space-y-3">
                  <Label>When to start?</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newSession.scheduleType === 'now' ? 'default' : 'outline'}
                      onClick={() => setNewSession({ ...newSession, scheduleType: 'now', scheduled_at: '' })}
                      className={`flex-1 ${newSession.scheduleType === 'now' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    >
                      Start Now
                    </Button>
                    <Button
                      type="button"
                      variant={newSession.scheduleType === 'later' ? 'default' : 'outline'}
                      onClick={() => setNewSession({ ...newSession, scheduleType: 'later' })}
                      className={`flex-1 ${newSession.scheduleType === 'later' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </div>
                  
                  {newSession.scheduleType === 'later' && (
                    <div className="pt-2">
                      <Label htmlFor="scheduled_at">Date & Time</Label>
                      <Input
                        id="scheduled_at"
                        type="datetime-local"
                        value={newSession.scheduled_at}
                        onChange={(e) => setNewSession({ ...newSession, scheduled_at: e.target.value })}
                        min={new Date().toISOString().slice(0, 16)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Reminders will be sent 15 and 5 minutes before
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSession}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    {newSession.scheduleType === 'later' ? 'Schedule Session' : 'Create Session'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
