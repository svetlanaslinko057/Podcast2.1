import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Shield, Radio, Users, MessageSquare, Clock, Activity, 
  Play, Square, Mic, MicOff, UserX, Ban, Clock3, Pin, Trash2,
  Settings, AlertCircle, CheckCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export const Moderator = () => {
  const [authorId] = useState('demo-author-123');
  const [activePodcast] = useState('podcast-demo');
  const [broadcast, setBroadcast] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [moderationHistory, setModerationHistory] = useState([]);
  
  // Demo data
  const [liveListeners, setLiveListeners] = useState([
    { id: '1', username: 'Alice', avatar: '👩', status: 'active' },
    { id: '2', username: 'Bob', avatar: '👨', status: 'active' },
    { id: '3', username: 'Charlie', avatar: '🧑', status: 'muted' },
    { id: '4', username: 'Diana', avatar: '👩‍🦰', status: 'active' }
  ]);

  useEffect(() => {
    checkBroadcastStatus();
    loadModerationHistory();
  }, [activePodcast]);

  const checkBroadcastStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/moderation/broadcast/${activePodcast}/status`);
      if (response.data.is_active) {
        setBroadcast(response.data.broadcast);
        setIsLive(true);
      }
    } catch (error) {
      console.error('Failed to check broadcast status:', error);
    }
  };

  const loadModerationHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/moderation/actions/${activePodcast}`);
      setModerationHistory(response.data.actions || []);
    } catch (error) {
      console.error('Failed to load moderation history:', error);
    }
  };

  const startBroadcast = async () => {
    try {
      const formData = new FormData();
      formData.append('podcast_id', activePodcast);
      formData.append('author_id', authorId);
      formData.append('title', 'Live Broadcast');

      await axios.post(`${API_URL}/api/moderation/broadcast/start`, formData);
      setIsLive(true);
      toast.success('Broadcast started!');
      checkBroadcastStatus();
    } catch (error) {
      toast.error('Failed to start broadcast');
      console.error(error);
    }
  };

  const stopBroadcast = async () => {
    if (!broadcast) return;

    try {
      const formData = new FormData();
      formData.append('broadcast_id', broadcast.id);

      await axios.post(`${API_URL}/api/moderation/broadcast/stop`, formData);
      setIsLive(false);
      setBroadcast(null);
      toast.success('Broadcast stopped');
    } catch (error) {
      toast.error('Failed to stop broadcast');
      console.error(error);
    }
  };

  const muteUser = async (userId) => {
    try {
      const formData = new FormData();
      formData.append('podcast_id', activePodcast);
      formData.append('user_id', userId);
      formData.append('moderator_id', authorId);
      formData.append('reason', 'Disruptive behavior');

      await axios.post(`${API_URL}/api/moderation/user/mute`, formData);
      toast.success('User muted');
      loadModerationHistory();
      
      setLiveListeners(prev => 
        prev.map(l => l.id === userId ? { ...l, status: 'muted' } : l)
      );
    } catch (error) {
      toast.error('Failed to mute user');
    }
  };

  const kickUser = async (userId) => {
    try {
      const formData = new FormData();
      formData.append('podcast_id', activePodcast);
      formData.append('user_id', userId);
      formData.append('moderator_id', authorId);
      formData.append('reason', 'Violating community guidelines');

      await axios.post(`${API_URL}/api/moderation/user/kick`, formData);
      toast.success('User kicked');
      loadModerationHistory();
      
      setLiveListeners(prev => prev.filter(l => l.id !== userId));
    } catch (error) {
      toast.error('Failed to kick user');
    }
  };

  const banUser = async (userId, duration = null) => {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('moderator_id', authorId);
      formData.append('reason', 'Repeated violations');
      if (duration) formData.append('duration', duration);

      await axios.post(`${API_URL}/api/moderation/user/ban`, formData);
      toast.success(duration ? `User banned for ${duration} minutes` : 'User permanently banned');
      loadModerationHistory();
      
      setLiveListeners(prev => prev.filter(l => l.id !== userId));
    } catch (error) {
      toast.error('Failed to ban user');
    }
  };

  const timeoutUser = async (userId, duration) => {
    try {
      const formData = new FormData();
      formData.append('podcast_id', activePodcast);
      formData.append('user_id', userId);
      formData.append('moderator_id', authorId);
      formData.append('duration', duration);
      formData.append('reason', 'Spam or inappropriate content');

      await axios.post(`${API_URL}/api/moderation/user/timeout`, formData);
      toast.success(`User timed out for ${duration} minutes`);
      loadModerationHistory();
    } catch (error) {
      toast.error('Failed to timeout user');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Broadcast Control & Moderation
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Moderator <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Panel</span>
          </h1>
          <p className="text-gray-600">
            Manage live broadcasts, moderate listeners, and control your stream
          </p>
        </div>

        {/* Live Broadcast Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-200'
              }`}>
                <Radio className={`w-6 h-6 ${isLive ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Live Broadcast</h2>
                <p className={`text-sm ${isLive ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                  {isLive ? '🔴 ON AIR' : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {!isLive ? (
                <button
                  onClick={startBroadcast}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-medium flex items-center gap-2 transition-all"
                  data-testid="start-broadcast-btn"
                >
                  <Play className="w-5 h-5" />
                  Start Broadcast
                </button>
              ) : (
                <button
                  onClick={stopBroadcast}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-medium flex items-center gap-2 transition-all"
                  data-testid="stop-broadcast-btn"
                >
                  <Square className="w-5 h-5" />
                  Stop Broadcast
                </button>
              )}
            </div>
          </div>

          {/* Broadcast Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm text-gray-600 mb-2 block">Stream Quality</label>
              <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                <option>High (1080p)</option>
                <option>Medium (720p)</option>
                <option>Low (480p)</option>
              </select>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm text-gray-600 mb-2 block">Recording</label>
              <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                <option>Auto Record</option>
                <option>Manual</option>
                <option>Off</option>
              </select>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="text-sm text-gray-600 mb-2 block">Bitrate</label>
              <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                <option>320 kbps</option>
                <option>192 kbps</option>
                <option>128 kbps</option>
              </select>
            </div>
          </div>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Users className="w-5 h-5" />} label="Live Listeners" value="342" color="emerald" />
          <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Messages" value="1.2K" color="teal" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Duration" value="45m" color="cyan" />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Engagement" value="98%" color="violet" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* User Management */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Live Listeners ({liveListeners.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="live-listeners-list">
              {liveListeners.map((listener) => (
                <div key={listener.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{listener.avatar}</div>
                    <div>
                      <p className="font-medium text-gray-900">{listener.username}</p>
                      <p className="text-xs text-gray-500">
                        {listener.status === 'muted' ? '🔇 Muted' : '✅ Active'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => muteUser(listener.id)}
                      className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
                      title="Mute"
                      data-testid={`mute-user-${listener.id}`}
                    >
                      <MicOff className="w-4 h-4 text-yellow-600" />
                    </button>
                    <button
                      onClick={() => timeoutUser(listener.id, 5)}
                      className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                      title="Timeout 5min"
                      data-testid={`timeout-user-${listener.id}`}
                    >
                      <Clock3 className="w-4 h-4 text-orange-600" />
                    </button>
                    <button
                      onClick={() => kickUser(listener.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Kick"
                      data-testid={`kick-user-${listener.id}`}
                    >
                      <UserX className="w-4 h-4 text-red-600" />
                    </button>
                    <button
                      onClick={() => banUser(listener.id)}
                      className="p-2 hover:bg-gray-900 hover:bg-opacity-10 rounded-lg transition-colors"
                      title="Ban"
                      data-testid={`ban-user-${listener.id}`}
                    >
                      <Ban className="w-4 h-4 text-gray-900" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Moderation History */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Moderation History
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto" data-testid="moderation-history">
              {moderationHistory.length > 0 ? (
                moderationHistory.map((action) => (
                  <div key={action.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <ActionIcon type={action.action_type} />
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {action.action_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{action.reason || 'No reason provided'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(action.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No moderation actions yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Chat Moderation Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            Chat Moderation Settings
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded" defaultChecked />
              <span className="text-sm font-medium text-gray-700">Word Filters</span>
            </label>
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded" defaultChecked />
              <span className="text-sm font-medium text-gray-700">Spam Protection</span>
            </label>
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded" />
              <span className="text-sm font-medium text-gray-700">Slow Mode</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
function StatCard({ icon, label, value, color }) {
  const colors = {
    emerald: 'from-emerald-500 to-teal-500',
    teal: 'from-teal-500 to-cyan-500',
    cyan: 'from-cyan-500 to-blue-500',
    violet: 'from-violet-500 to-purple-500'
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ActionIcon({ type }) {
  const icons = {
    mute: <MicOff className="w-4 h-4 text-yellow-600" />,
    kick: <UserX className="w-4 h-4 text-red-600" />,
    ban: <Ban className="w-4 h-4 text-gray-900" />,
    timeout: <Clock3 className="w-4 h-4 text-orange-600" />,
    pin_message: <Pin className="w-4 h-4 text-blue-600" />,
    delete_message: <Trash2 className="w-4 h-4 text-red-600" />
  };

  return icons[type] || <AlertCircle className="w-4 h-4 text-gray-600" />;
}
