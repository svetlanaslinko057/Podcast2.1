import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import EmojiPicker from 'emoji-picker-react';
import { 
  MessageCircle, Users, Bell, Search, Send, ArrowLeft, 
  Loader2, UserPlus, UserMinus, Heart, Play, CheckCheck, Clock, Crown,
  Plus, Edit2, Trash2, BellOff, BellRing, Settings, Copy, Check, CheckCircle, AlertCircle,
  Pin, X, Smile, Paperclip, Image, FileText, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '../context/WalletContext';
import { PrivateClubManager } from '../components/PrivateClubManager';
import { TelegramConnect } from '../components/TelegramConnect';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Telegram Channel Card Component
const TelegramChannelCard = ({ channel, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState({
    notify_new_episodes: channel.notify_new_episodes ?? true,
    notify_live_streams: channel.notify_live_streams ?? true,
    notify_comments: channel.notify_comments ?? true,
    notify_mentions: channel.notify_mentions ?? true,
    is_active: channel.is_active ?? true
  });

  const handleSave = () => {
    onUpdate(channel.id, settings);
    setIsEditing(false);
  };

  const allMuted = !settings.notify_new_episodes && !settings.notify_live_streams && 
                   !settings.notify_comments && !settings.notify_mentions;

  return (
    <Card className={`p-4 transition-all ${settings.is_active ? 'border-emerald-200' : 'border-gray-200 opacity-60'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            settings.is_active ? 'bg-emerald-100' : 'bg-gray-100'
          }`}>
            {allMuted || !settings.is_active ? (
              <BellOff className="w-5 h-5 text-gray-400" />
            ) : (
              <BellRing className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{channel.name || 'Unnamed Channel'}</h3>
            <p className="text-xs text-gray-500">Chat ID: {channel.chat_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : <Settings className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(channel.id)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3 mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Active</span>
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

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Notification Types:</p>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">New Episodes</span>
              <input
                type="checkbox"
                checked={settings.notify_new_episodes}
                onChange={(e) => setSettings({...settings, notify_new_episodes: e.target.checked})}
                className="w-4 h-4 text-emerald-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Live Streams</span>
              <input
                type="checkbox"
                checked={settings.notify_live_streams}
                onChange={(e) => setSettings({...settings, notify_live_streams: e.target.checked})}
                className="w-4 h-4 text-emerald-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Comments & Replies</span>
              <input
                type="checkbox"
                checked={settings.notify_comments}
                onChange={(e) => setSettings({...settings, notify_comments: e.target.checked})}
                className="w-4 h-4 text-emerald-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700">Mentions</span>
              <input
                type="checkbox"
                checked={settings.notify_mentions}
                onChange={(e) => setSettings({...settings, notify_mentions: e.target.checked})}
                className="w-4 h-4 text-emerald-500 rounded"
              />
            </label>
          </div>

          <Button 
            onClick={handleSave}
            className="w-full bg-emerald-500 hover:bg-emerald-600 mt-3"
          >
            Save Changes
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3">
          {settings.notify_new_episodes && (
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              New Episodes
            </Badge>
          )}
          {settings.notify_live_streams && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Live Streams
            </Badge>
          )}
          {settings.notify_comments && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              Comments
            </Badge>
          )}
          {settings.notify_mentions && (
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
              Mentions
            </Badge>
          )}
          {allMuted && (
            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200">
              All Muted
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
};

export const SocialHub = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { walletAddress } = useWallet();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'messages');
  const [loading, setLoading] = useState(true);
  const [authorId, setAuthorId] = useState(null);
  
  // Messages state
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [authorSearch, setAuthorSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingAuthors, setSearchingAuthors] = useState(false);
  const [pinnedChats, setPinnedChats] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = React.useRef(null);
  
  // Social state
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  
  // Telegram Alerts state (replacing old notifications)
  const [telegramConnection, setTelegramConnection] = useState(null);
  const [telegramChannels, setTelegramChannels] = useState([]);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showTelegramConnect, setShowTelegramConnect] = useState(false);
  const [channelForm, setChannelForm] = useState({
    name: '',
    chat_id: '',
    notify_new_episodes: true,
    notify_live_streams: true,
    notify_comments: true,
    notify_mentions: true
  });
  const [copiedChatId, setCopiedChatId] = useState(false);
  
  // Find author by wallet address
  useEffect(() => {
    const findAuthor = async () => {
      try {
        const res = await axios.get(`${API}/authors`);
        const authors = res.data || [];
        
        if (walletAddress) {
          // Find author by wallet
          const found = authors.find(a => a.wallet_address === walletAddress);
          if (found) {
            setAuthorId(found.id);
            return;
          }
        }
        
        // Fallback: use first available author for demo purposes
        if (authors.length > 0) {
          setAuthorId(authors[0].id);
        } else {
          setAuthorId('demo-user-123');
        }
      } catch (error) {
        console.error('Failed to find author:', error);
        setAuthorId(walletAddress || 'demo-user-123');
      }
    };
    
    findAuthor();
  }, [walletAddress]);
  
  // Use authorId for API calls
  const currentUserId = authorId;
  
  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);
  
  // Fetch data based on active tab (only when authorId is loaded)
  useEffect(() => {
    if (currentUserId) {
      fetchData();
    }
  }, [activeTab, currentUserId]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'messages') {
        const res = await axios.get(`${API}/users/${currentUserId}/conversations`);
        setConversations(res.data || []);
      } else if (activeTab === 'followers') {
        const res = await axios.get(`${API}/authors/${currentUserId}/followers`);
        setFollowers(res.data || []);
      } else if (activeTab === 'following') {
        const res = await axios.get(`${API}/authors/${currentUserId}/following`);
        setFollowing(res.data || []);
      } else if (activeTab === 'alerts') {
        await fetchTelegramSettings();
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadConversation = async (conversation) => {
    setSelectedConversation(conversation);
    try {
      const res = await axios.get(`${API}/messages/${currentUserId}/${conversation.user_id}`);
      setMessages(res.data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 5MB.');
        return;
      }
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };
  
  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation) return;
    
    try {
      if (selectedFile) {
        // Send with file
        const formData = new FormData();
        formData.append('sender_id', currentUserId);
        formData.append('recipient_id', selectedConversation.user_id);
        formData.append('content', newMessage || '');
        formData.append('file', selectedFile);
        
        await axios.post(`${API}/messages/with-file`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Send text only
        await axios.post(`${API}/messages`, {
          sender_id: currentUserId,
          recipient_id: selectedConversation.user_id,
          content: newMessage
        });
      }
      
      setNewMessage('');
      clearFileSelection();
      setShowEmojiPicker(false);
      loadConversation(selectedConversation);
      fetchData(); // Refresh conversations
    } catch (error) {
      toast.error('Failed to send message');
    }
  };
  
  const handleFollow = async (userId) => {
    try {
      await axios.post(`${API}/authors/${userId}/follow`, { follower_id: currentUserId });
      toast.success('Following!');
      fetchData();
    } catch (error) {
      toast.error('Failed to follow');
    }
  };
  
  const handleUnfollow = async (userId) => {
    try {
      await axios.delete(`${API}/authors/${userId}/follow/${currentUserId}`);
      toast.success('Unfollowed');
      fetchData();
    } catch (error) {
      toast.error('Failed to unfollow');
    }
  };
  
  // Search authors for new chat
  const searchAuthors = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchingAuthors(true);
    try {
      const res = await axios.get(`${API}/search/authors?q=${encodeURIComponent(query)}&limit=10`);
      // Filter out current user only if we have a valid authorId that's not a demo fallback
      const filtered = (res.data.results || []).filter(a => {
        // Only filter if we have a real author with wallet connected
        if (walletAddress && currentUserId) {
          return a.id !== currentUserId;
        }
        return true;
      });
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchingAuthors(false);
    }
  };
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authorSearch) {
        searchAuthors(authorSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [authorSearch]);
  
  // Start new conversation with author
  const startConversation = (author) => {
    const newConv = {
      user_id: author.id,
      user_name: author.name,
      username: author.username,
      avatar: author.avatar,
      last_message: '',
      time: '',
      unread_count: 0
    };
    setSelectedConversation(newConv);
    setMessages([]);
    setShowNewChat(false);
    setAuthorSearch('');
    setSearchResults([]);
  };
  
  // Pin/Unpin chat
  const togglePinChat = (userId) => {
    if (pinnedChats.includes(userId)) {
      setPinnedChats(pinnedChats.filter(id => id !== userId));
      toast.success('Chat unpinned');
    } else {
      if (pinnedChats.length >= 5) {
        toast.error('Maximum 5 pinned chats allowed');
        return;
      }
      setPinnedChats([...pinnedChats, userId]);
      toast.success('Chat pinned');
    }
    // Save to localStorage
    localStorage.setItem(`pinned_chats_${currentUserId}`, JSON.stringify(
      pinnedChats.includes(userId) 
        ? pinnedChats.filter(id => id !== userId)
        : [...pinnedChats, userId]
    ));
  };
  
  // Load pinned chats from localStorage
  useEffect(() => {
    if (currentUserId) {
      const saved = localStorage.getItem(`pinned_chats_${currentUserId}`);
      if (saved) {
        try {
          setPinnedChats(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse pinned chats');
        }
      }
    }
  }, [currentUserId]);
  
  // Delete conversation
  const deleteConversation = async (userId) => {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    
    try {
      await axios.delete(`${API}/messages/${currentUserId}/${userId}`);
      setConversations(conversations.filter(c => c.user_id !== userId));
      if (selectedConversation?.user_id === userId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      // Remove from pinned if pinned
      if (pinnedChats.includes(userId)) {
        const newPinned = pinnedChats.filter(id => id !== userId);
        setPinnedChats(newPinned);
        localStorage.setItem(`pinned_chats_${currentUserId}`, JSON.stringify(newPinned));
      }
      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };
  
  // Telegram functions
  const fetchTelegramSettings = async () => {
    try {
      // First check author's telegram status
      const statusRes = await axios.get(`${API}/telegram/personal-status/${currentUserId}`);
      if (statusRes.data?.connected) {
        setTelegramConnection({
          chat_id: statusRes.data.chat_id,
          username: statusRes.data.username,
          connected: true
        });
      } else {
        setTelegramConnection(null);
      }
    } catch (error) {
      console.error('Failed to fetch Telegram status:', error);
      setTelegramConnection(null);
    }
    
    // Fetch channels separately (don't let this error affect connection status)
    try {
      const channelsRes = await axios.get(`${API}/telegram-subscriptions/channels/${currentUserId}`);
      setTelegramChannels(channelsRes.data || []);
    } catch (error) {
      // Channels endpoint may not exist or return 404 - that's ok
      setTelegramChannels([]);
    }
  };
  
  const handleTelegramConnected = (author) => {
    setTelegramConnection({
      chat_id: author.telegram_chat_id,
      username: author.telegram_username,
      connected: true
    });
    setShowTelegramConnect(false);
    toast.success('Telegram connected!');
    fetchTelegramSettings();
  };
  
  const handleDisconnectTelegram = async () => {
    try {
      const formData = new FormData();
      formData.append('author_id', currentUserId);
      await axios.post(`${API}/telegram/disconnect-personal`, formData);
      setTelegramConnection(null);
      toast.success('Telegram disconnected');
    } catch (error) {
      toast.error('Failed to disconnect Telegram');
    }
  };
  
  const handleAddTelegramChannel = async (e) => {
    e.preventDefault();
    
    if (!channelForm.chat_id.trim()) {
      toast.error('Please enter Chat ID');
      return;
    }
    
    try {
      // First connect if not connected
      if (!telegramConnection) {
        const formData = new FormData();
        formData.append('user_id', currentUserId);
        formData.append('telegram_chat_id', channelForm.chat_id);
        formData.append('telegram_username', channelForm.name || 'User');
        
        await axios.post(`${API}/telegram-subscriptions/connect`, formData);
        toast.success('Telegram connected successfully!');
      }
      
      // Subscribe to notifications
      const subsFormData = new FormData();
      subsFormData.append('user_id', currentUserId);
      subsFormData.append('chat_id', channelForm.chat_id);
      subsFormData.append('name', channelForm.name || `Channel ${Date.now()}`);
      subsFormData.append('notify_new_episodes', channelForm.notify_new_episodes);
      subsFormData.append('notify_live_streams', channelForm.notify_live_streams);
      subsFormData.append('notify_comments', channelForm.notify_comments);
      subsFormData.append('notify_mentions', channelForm.notify_mentions);
      
      await axios.post(`${API}/telegram-subscriptions/channels`, subsFormData);
      
      toast.success('Channel added successfully!');
      setShowAddChannel(false);
      setChannelForm({
        name: '',
        chat_id: '',
        notify_new_episodes: true,
        notify_live_streams: true,
        notify_comments: true,
        notify_mentions: true
      });
      fetchTelegramSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add channel');
    }
  };
  
  const handleUpdateChannel = async (channelId, updates) => {
    try {
      await axios.put(`${API}/telegram-subscriptions/channels/${channelId}`, updates);
      toast.success('Settings updated');
      fetchTelegramSettings();
    } catch (error) {
      toast.error('Failed to update channel');
    }
  };
  
  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;
    
    try {
      await axios.delete(`${API}/telegram-subscriptions/channels/${channelId}`);
      toast.success('Channel deleted');
      fetchTelegramSettings();
    } catch (error) {
      toast.error('Failed to delete channel');
    }
  };
  
  const copyBotLink = () => {
    navigator.clipboard.writeText('https://t.me/Podcast_FOMO_bot');
    setCopiedChatId(true);
    setTimeout(() => setCopiedChatId(false), 2000);
    toast.success('Bot link copied!');
  };
  
  const filteredConversations = conversations.filter(c => 
    c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort conversations: pinned first, then by time
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aPinned = pinnedChats.includes(a.user_id);
    const bPinned = pinnedChats.includes(b.user_id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });
  
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Social Hub</h1>
          <p className="text-gray-500 text-sm">Messages and club members</p>
        </div>
        
        <div className="grid lg:grid-cols-[280px,1fr] gap-6">
          {/* Sidebar with Tabs */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 gap-1 bg-white border rounded-xl p-1 mb-4">
                <TabsTrigger value="messages" className="rounded-lg text-xs">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Messages</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="rounded-lg text-xs relative">
                  <BellRing className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Alerts</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsList className="grid grid-cols-2 gap-1 bg-white border rounded-xl p-1">
                <TabsTrigger value="members" className="rounded-lg text-xs">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Members</span>
                </TabsTrigger>
                <TabsTrigger value="private-club" className="rounded-lg text-xs">
                  <Crown className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Club</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Conversations List (shown when messages tab is active) */}
            {activeTab === 'messages' && (
              <Card className="bg-white rounded-2xl overflow-hidden">
                <div className="p-3 border-b space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowNewChat(!showNewChat)}
                      className="bg-emerald-500 hover:bg-emerald-600 h-9"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* New Chat Search */}
                  {showNewChat && (
                    <div className="pt-2 border-t">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={authorSearch}
                          onChange={(e) => setAuthorSearch(e.target.value)}
                          placeholder="Search users to chat..."
                          className="pl-9 h-9 text-sm"
                          autoFocus
                        />
                        {authorSearch && (
                          <button
                            onClick={() => { setAuthorSearch(''); setSearchResults([]); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                      
                      {/* Search Results */}
                      {searchingAuthors ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="mt-2 max-h-[200px] overflow-y-auto">
                          {searchResults.map((author) => (
                            <div
                              key={author.id}
                              onClick={() => startConversation(author)}
                              className="flex items-center gap-3 p-2 cursor-pointer hover:bg-emerald-50 rounded-lg"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={author.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs">
                                  {author.name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">{author.name}</p>
                                {author.telegram_username && (
                                  <p className="text-xs text-gray-500">@{author.telegram_username}</p>
                                )}
                              </div>
                              <Send className="w-4 h-4 text-emerald-500" />
                            </div>
                          ))}
                        </div>
                      ) : authorSearch && !searchingAuthors ? (
                        <p className="text-center text-sm text-gray-500 py-4">No users found</p>
                      ) : null}
                    </div>
                  )}
                </div>
                
                <div className="max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    </div>
                  ) : sortedConversations.length > 0 ? (
                    sortedConversations.map((conv) => (
                      <div
                        key={conv.user_id}
                        className={`group flex items-center gap-3 p-3 cursor-pointer transition-colors relative ${
                          selectedConversation?.user_id === conv.user_id 
                            ? 'bg-emerald-50' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Pin indicator */}
                        {pinnedChats.includes(conv.user_id) && (
                          <div className="absolute left-1 top-1">
                            <Pin className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                          </div>
                        )}
                        
                        <div onClick={() => loadConversation(conv)} className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={conv.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                              {conv.user_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm text-gray-900 truncate">{conv.user_name}</p>
                              <span className="text-xs text-gray-400">{conv.time}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                          </div>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-emerald-500 text-white text-xs">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Action buttons - show on hover */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePinChat(conv.user_id); }}
                            className={`p-1.5 rounded-lg hover:bg-gray-200 ${
                              pinnedChats.includes(conv.user_id) ? 'text-emerald-500' : 'text-gray-400'
                            }`}
                            title={pinnedChats.includes(conv.user_id) ? 'Unpin' : 'Pin'}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteConversation(conv.user_id); }}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No conversations yet</p>
                      <p className="text-xs mt-1">Start chatting with creators!</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
          
          {/* Main Content Area */}
          <Card className="bg-white rounded-2xl min-h-[500px] flex flex-col">
            {/* Messages Tab Content */}
            {activeTab === 'messages' && (
              selectedConversation ? (
                <div className="flex flex-col h-full">
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 p-4 border-b">
                    <button 
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedConversation.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                        {selectedConversation.user_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedConversation.user_name}</p>
                      <p className="text-xs text-gray-500">Online</p>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.sender_id === currentUserId
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {/* Attachment */}
                          {msg.attachment_url && (
                            <div className="mb-2">
                              {msg.attachment_type === 'image' ? (
                                <img 
                                  src={msg.attachment_url} 
                                  alt="attachment" 
                                  className="max-w-full rounded-lg max-h-60 object-cover"
                                />
                              ) : (
                                <a 
                                  href={msg.attachment_url} 
                                  download={msg.attachment_name}
                                  className={`flex items-center gap-2 p-2 rounded-lg ${
                                    msg.sender_id === currentUserId 
                                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                                      : 'bg-gray-200 hover:bg-gray-300'
                                  }`}
                                >
                                  <FileText className="w-5 h-5" />
                                  <span className="text-sm truncate">{msg.attachment_name || 'File'}</span>
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          )}
                          {msg.content && <p className="text-sm">{msg.content}</p>}
                          <div className={`flex items-center gap-1 mt-1 ${
                            msg.sender_id === currentUserId ? 'justify-end' : ''
                          }`}>
                            <span className="text-xs opacity-70">{msg.time}</span>
                            {msg.sender_id === currentUserId && (
                              <CheckCheck className="w-3 h-3 opacity-70" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* File Preview */}
                  {selectedFile && (
                    <div className="px-4 pb-2">
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                        {filePreview ? (
                          <img src={filePreview} alt="preview" className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button onClick={clearFileSelection} className="p-1 hover:bg-gray-200 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Message Input */}
                  <form onSubmit={sendMessage} className="p-4 border-t">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      className="hidden"
                    />
                    <div className="relative">
                      {showEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50">
                          <EmojiPicker 
                            onEmojiClick={(emojiData) => {
                              setNewMessage(prev => prev + emojiData.emoji);
                              setShowEmojiPicker(false);
                            }}
                            width={300}
                            height={400}
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          title="Attach file"
                        >
                          <Paperclip className="w-4 h-4" />
                        </Button>
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1"
                        />
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={!newMessage.trim() && !selectedFile}
                          className="bg-emerald-500 hover:bg-emerald-600"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm">Choose from your messages on the left</p>
                  </div>
                </div>
              )
            )}
            
            {/* Followers Tab Content */}
            {activeTab === 'members' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Club Members
                  </h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/members')}
                    className="rounded-xl"
                  >
                    View All
                  </Button>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">View all members</p>
                    <p className="text-sm">Go to Members page to see all club members</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Private Club Tab Content */}
            
            {/* Alerts Tab Content - Telegram Management */}
            {activeTab === 'alerts' && (
              <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Telegram Alerts</h2>
                    <p className="text-sm text-gray-500">Telegram notifications</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  </div>
                ) : !telegramConnection?.connected ? (
                  /* OAuth Connect Card */
                  <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                        <Send className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Connect Telegram
                        </h3>
                        <p className="text-gray-600 text-sm max-w-md mx-auto">
                          Get notifications about new podcasts, live streams and comments directly in Telegram
                        </p>
                      </div>
                      
                      <Button 
                        onClick={() => setShowTelegramConnect(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3"
                        data-testid="connect-telegram-oauth-btn"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        Connect with Telegram
                      </Button>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        Secure authorization via official Telegram Login
                      </p>
                    </div>
                  </Card>
                ) : (
                  /* Connected - Show Status and Settings */
                  <div className="space-y-4">
                    {/* Connection Status Card */}
                    <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                              Telegram Connected
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                                Active
                              </Badge>
                            </p>
                            {telegramConnection.username && (
                              <p className="text-sm text-gray-600">
                                @{telegramConnection.username}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDisconnectTelegram}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </Card>
                    
                    {/* Notification Types */}
                    <Card className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Notification Types</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          🎙️ New podcasts from creators
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          🔴 Live streams
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          💬 Comments on your podcasts
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          👤 New followers
                        </div>
                      </div>
                    </Card>

                    {/* Additional Channels */}
                    {telegramChannels.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-900">Additional Channels</h3>
                        {telegramChannels.map((channel) => (
                          <TelegramChannelCard 
                            key={channel.id}
                            channel={channel}
                            onUpdate={handleUpdateChannel}
                            onDelete={handleDeleteChannel}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Add Channel Button */}
                    <Button 
                      onClick={() => setShowAddChannel(!showAddChannel)}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Channel/Group
                    </Button>
                    
                    {/* Add Channel Form */}
                    {showAddChannel && (
                      <Card className="p-4 border-emerald-200 bg-emerald-50">
                        <form onSubmit={handleAddTelegramChannel} className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">Add Channel</h3>
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm"
                              onClick={() => setShowAddChannel(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            <Input
                              placeholder="Channel name"
                              value={channelForm.name}
                              onChange={(e) => setChannelForm({...channelForm, name: e.target.value})}
                            />
                            <Input
                              placeholder="Channel Chat ID (e.g., -100123456789)"
                              value={channelForm.chat_id}
                              onChange={(e) => setChannelForm({...channelForm, chat_id: e.target.value})}
                              required
                            />
                            <p className="text-xs text-gray-500">
                              Get Channel Chat ID from @Podcast_FOMO_bot
                            </p>
                          </div>
                          
                          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600">
                            Add Channel
                          </Button>
                        </form>
                      </Card>
                    )}
                  </div>
                )}
                
                {/* Telegram Connect Modal */}
                <TelegramConnect
                  isOpen={showTelegramConnect}
                  onClose={() => setShowTelegramConnect(false)}
                  authorId={currentUserId}
                  onConnected={handleTelegramConnected}
                />
              </div>
            )}
            
            {/* Private Club Tab Content */}
            {activeTab === 'private-club' && (
              <div className="p-4">
                <PrivateClubManager authorId={currentUserId} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
