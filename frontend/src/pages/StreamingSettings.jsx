import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Send, Radio, Settings, AlertCircle, Plus, Trash2, 
  CheckCircle, XCircle, ExternalLink, Copy, Check, RefreshCw,
  History, Clock, Users, Play
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export function StreamingSettings() {
  const [authorId] = useState('demo-author-123');
  const [channels, setChannels] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeLives, setActiveLives] = useState([]);
  const [pastLives, setPastLives] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [channelForm, setChannelForm] = useState({
    channel_username: '',
    channel_title: ''
  });

  useEffect(() => {
    loadStreamingData();
    // Refresh active lives every 30 seconds
    const interval = setInterval(() => {
      loadActiveLives();
    }, 30000);
    return () => clearInterval(interval);
  }, [authorId]);

  const loadStreamingData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadChannels(),
        loadStats(),
        loadActiveLives(),
        loadPastLives()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/telegram-streaming/channels/${authorId}`);
      setChannels(response.data || []);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/telegram-streaming/stats/${authorId}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadActiveLives = async () => {
    try {
      // Get active live sessions from Telegram
      const response = await axios.get(`${API_URL}/api/live/${authorId}?platform=telegram`);
      setActiveLives(response.data.filter(live => live.is_live) || []);
    } catch (error) {
      console.error('Failed to load active lives:', error);
    }
  };

  const loadPastLives = async () => {
    try {
      // Get past (ended) live sessions from Telegram
      const response = await axios.get(`${API_URL}/api/live/${authorId}?platform=telegram`);
      const ended = response.data.filter(live => !live.is_live) || [];
      // Sort by ended_at descending (most recent first)
      ended.sort((a, b) => new Date(b.ended_at || b.started_at) - new Date(a.ended_at || a.started_at));
      setPastLives(ended.slice(0, 10)); // Show last 10
    } catch (error) {
      console.error('Failed to load past lives:', error);
    }
  };

  const formatDuration = (startedAt, endedAt) => {
    if (!startedAt || !endedAt) return 'N/A';
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    
    if (diffHours > 0) {
      return `${diffHours}ч ${remainingMins}м`;
    }
    return `${diffMins}м`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    
    if (!channelForm.channel_username || !channelForm.channel_title) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('author_id', authorId);
      formData.append('channel_username', channelForm.channel_username);
      formData.append('channel_title', channelForm.channel_title);

      await axios.post(`${API_URL}/api/telegram-streaming/connect-channel`, formData);
      
      toast.success('Channel connected successfully!');
      setShowAddForm(false);
      setChannelForm({ channel_username: '', channel_title: '' });
      loadStreamingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect channel');
    }
  };

  const handleUpdateChannel = async (channelId, updates) => {
    try {
      const formData = new FormData();
      Object.entries(updates).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await axios.put(`${API_URL}/api/telegram-streaming/channels/${channelId}`, formData);
      toast.success('Channel updated');
      loadChannels();
    } catch (error) {
      toast.error('Failed to update channel');
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to disconnect this channel?')) return;

    try {
      await axios.delete(`${API_URL}/api/telegram-streaming/channels/${channelId}`);
      toast.success('Channel disconnected');
      loadStreamingData();
    } catch (error) {
      toast.error('Failed to disconnect channel');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading streaming settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-6">
            <Radio className="w-4 h-4" />
            Telegram Voice Chat Streaming
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Telegram <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Voice Chat</span>
          </h1>
          <p className="text-gray-600">
            Automatically create live sessions when you start Voice Chat in your Telegram channels
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Connected Channels</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_channels}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Lives</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_lives}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Radio className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Now</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.active_lives}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Lives */}
        {activeLives.length > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 mb-8 border border-red-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-lg font-bold text-gray-900">Live Now</h3>
              </div>
              <button
                onClick={loadActiveLives}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="space-y-3">
              {activeLives.map(live => (
                <div key={live.id} className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    {/* Live Indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Radio className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{live.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {live.listener_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(live.started_at).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}
                        </span>
                        {live.telegram_source && (
                          <span className="text-blue-600">
                            @{live.telegram_source.channel_username?.replace('@', '')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Join Button */}
                    <a
                      href={`/live/${live.id}`}
                      className="flex-shrink-0 px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-red-500/25"
                    >
                      <Play className="w-5 h-5" />
                      Listen
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Streams History */}
        {pastLives.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900">Stream History</h3>
              </div>
              <span className="text-sm text-gray-500">Last {pastLives.length}</span>
            </div>
            <div className="space-y-2">
              {pastLives.map(live => (
                <div 
                  key={live.id} 
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Radio className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{live.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDate(live.started_at)}</span>
                      {live.telegram_source && (
                        <span className="text-blue-500">
                          @{live.telegram_source.channel_username?.replace('@', '')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Duration */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {formatDuration(live.started_at, live.ended_at)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {live.listener_count || 0} listeners
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected Channels */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Connected Channels</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Channel
            </button>
          </div>

          {/* Add Channel Form */}
          {showAddForm && (
            <form onSubmit={handleAddChannel} className="bg-emerald-50 rounded-xl p-6 mb-6 border border-emerald-200">
              <h4 className="font-semibold text-gray-900 mb-4">Connect New Telegram Channel</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel Username *
                  </label>
                  <input
                    type="text"
                    value={channelForm.channel_username}
                    onChange={(e) => setChannelForm({...channelForm, channel_username: e.target.value})}
                    placeholder="@my_podcast_channel"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your Telegram channel username (with @)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel Title *
                  </label>
                  <input
                    type="text"
                    value={channelForm.channel_title}
                    onChange={(e) => setChannelForm({...channelForm, channel_title: e.target.value})}
                    placeholder="My Podcast Channel"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Display name for your channel
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Connect Channel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setChannelForm({ channel_username: '', channel_title: '' });
                    }}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Channels List */}
          {channels.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No channels connected</h4>
              <p className="text-gray-600 mb-4">Add your first Telegram channel to start auto-streaming</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Your First Channel
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map(channel => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  onUpdate={handleUpdateChannel}
                  onDelete={handleDeleteChannel}
                  onCopy={copyToClipboard}
                  copiedId={copiedId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-3">How to set up Voice Chat streaming:</h4>
              <ol className="text-sm text-blue-800 space-y-2">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span>Add <strong>@Podcast_FOMO_bot</strong> to your Telegram channel as administrator</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span>Give the bot <strong>"Manage Voice Chats"</strong> permission</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span>Click <strong>"Add Channel"</strong> above and enter your channel username</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  <span>Start a Voice Chat in your channel - live will be created automatically! 🎉</span>
                </li>
              </ol>
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Bot Link:</strong> <a href="https://t.me/Podcast_FOMO_bot" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">https://t.me/Podcast_FOMO_bot</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Channel Card Component
function ChannelCard({ channel, onUpdate, onDelete, onCopy, copiedId }) {
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState({
    auto_start_live: channel.auto_start_live ?? true,
    is_active: channel.is_active ?? true
  });

  const handleSave = () => {
    onUpdate(channel.id, settings);
    setEditing(false);
  };

  // Generate Telegram channel URL
  const getTelegramUrl = () => {
    const username = channel.channel_username?.replace('@', '') || '';
    return `https://t.me/${username}`;
  };

  return (
    <div className={`border rounded-xl p-4 transition-all ${
      settings.is_active ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Clickable channel icon - opens Telegram */}
          <a 
            href={getTelegramUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
              settings.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-400 hover:bg-gray-500'
            }`}
            title="Открыть в Telegram"
          >
            <Send className="w-5 h-5 text-white" />
          </a>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {/* Clickable channel title */}
              <a 
                href={getTelegramUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors"
              >
                {channel.channel_title}
              </a>
              {settings.is_active ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {/* Clickable username */}
              <a 
                href={getTelegramUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                {channel.channel_username}
              </a>
              <button
                onClick={() => onCopy(channel.channel_username, channel.id)}
                className="p-1 hover:bg-white rounded transition-colors"
                title="Копировать"
              >
                {copiedId === channel.id ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-400" />
                )}
              </button>
              <a
                href={getTelegramUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-white rounded transition-colors"
                title="Открыть в Telegram"
              >
                <ExternalLink className="w-3 h-3 text-gray-400 hover:text-blue-500" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            title="Настройки"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(channel.id)}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-600 mb-3">
        <span>📊 {channel.stats?.total_lives || 0} streams</span>
        {channel.stats?.last_live_at && (
          <span>🕐 Last: {new Date(channel.stats.last_live_at).toLocaleDateString('en-US')}</span>
        )}
      </div>

      {/* Settings */}
      {editing && (
        <div className="pt-3 border-t space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Active</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.is_active}
                onChange={(e) => setSettings({...settings, is_active: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Auto-start Live</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_start_live}
                onChange={(e) => setSettings({...settings, auto_start_live: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
