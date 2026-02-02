import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  User, BarChart3, Loader2, Save,
  Eye, Headphones, TrendingUp, 
  Twitter, MessageCircle, Globe, FileText, 
  Plus, Clock, Play, Radio, Send, ExternalLink,
  Bell, Shield, Link as LinkIcon, Wallet, CheckCircle,
  Youtube, LogOut, Upload, ImagePlus
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreatePodcastDialog } from '../components/CreatePodcastDialog';
import { PodcastAnalytics } from '../components/PodcastAnalytics';
import { PushNotificationManager } from '../components/PushNotificationManager';
import { useWallet } from '../context/WalletContext';
import { getRatingBorderClass } from '../utils/ratingUtils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const CreatorWorkspace = () => {
  const navigate = useNavigate();
  const { walletAddress, isConnected, disconnect } = useWallet();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('telegram');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Profile state - FULL VERSION with all social links
  const [profile, setProfile] = useState({
    name: '', bio: '', short_bio: '', avatar: '',
    wallet_address: '',
    telegram_username: '',
    telegram_connected: false,
    rating: 0, // User rating (0-100)
    activity_score: 0, // Raw activity score
    social_links: { 
      twitter: '', 
      youtube: '',
      discord: '',
      telegram: '', 
      website: '' 
    }
  });
  
  // Notifications state
  const [notifications, setNotifications] = useState({
    notify_new_follower: true,
    notify_new_comment: true,
    notify_new_reaction: true,
    notify_new_episode: true,
    notify_mentions: true,
    email_notifications: false
  });
  
  // Privacy state
  const [privacy, setPrivacy] = useState({
    profile_visible: true,
    show_listening_history: true,
    allow_comments: true
  });
  
  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [podcasts, setPodcasts] = useState([]);
  
  // Telegram streaming state
  const [telegramChannels, setTelegramChannels] = useState([]);
  const [telegramStats, setTelegramStats] = useState(null);
  
  // Create Podcast Dialog state
  const [showCreatePodcast, setShowCreatePodcast] = useState(false);
  
  // Analytics state
  const [selectedPodcastForAnalytics, setSelectedPodcastForAnalytics] = useState(null);
  
  const authorId = walletAddress || 'demo-author-123';
  
  useEffect(() => {
    fetchData();
  }, [authorId]);
  
  // Sync wallet address when wallet connects/disconnects
  useEffect(() => {
    if (walletAddress) {
      setProfile(prev => ({
        ...prev,
        wallet_address: walletAddress
      }));
    }
  }, [walletAddress]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        axios.get(`${API}/authors/${authorId}`).catch(() => null),
        axios.get(`${API}/analytics/author/${authorId}`, { params: { days: 30 } }).catch(() => ({ data: {} })),
        axios.get(`${API}/settings/${authorId}`).catch(() => ({ data: {} }))
      ]);
      
      // If author doesn't exist, create one
      if (!results[0] || !results[0].data) {
        console.log('Author not found, creating...');
        try {
          const newAuthor = await axios.post(`${API}/authors`, {
            id: authorId,
            name: walletAddress ? `User ${walletAddress.slice(0, 6)}` : 'Demo User',
            username: walletAddress ? `user_${walletAddress.slice(0, 8)}` : 'demouser',
            bio: 'New podcast creator',
            wallet_address: walletAddress || '',
            followers_count: 0,
            following_count: 0,
            podcasts_count: 0
          });
          setProfile({
            name: newAuthor.data.name || '',
            username: newAuthor.data.username || '',
            bio: newAuthor.data.bio || '',
            avatar: newAuthor.data.avatar || '',
            wallet_address: walletAddress || '',
            social_links: newAuthor.data.social_links || {}
          });
        } catch (createError) {
          console.error('Failed to create author:', createError);
        }
      } else {
        setProfile({
          name: results[0].data.name || '',
          bio: results[0].data.bio || '',
          short_bio: results[0].data.short_bio || '',
          avatar: results[0].data.avatar || '',
          wallet_address: walletAddress || results[0].data.wallet_address || '',
          telegram_username: results[0].data.telegram_username || '',
          telegram_connected: results[0].data.telegram_connected || false,
          rating: results[0].data.rating || 0,
          activity_score: results[0].data.activity_score || 0,
          social_links: results[0].data.social_links || {}
        });
      }
      
      setAnalytics(results[1].data);
      
      // Load settings
      const settings = results[2].data;
      if (settings) {
        setNotifications({
          notify_new_follower: settings.notify_new_follower ?? true,
          notify_new_comment: settings.notify_new_comment ?? true,
          notify_new_reaction: settings.notify_new_reaction ?? true,
          notify_new_episode: settings.notify_new_episode ?? true,
          notify_mentions: settings.notify_mentions ?? true,
          email_notifications: settings.email_notifications ?? false
        });
        
        setPrivacy({
          profile_visible: settings.profile_visible ?? true,
          show_listening_history: settings.show_listening_history ?? true,
          allow_comments: settings.allow_comments ?? true
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const saveProfile = async () => {
    try {
      setSaving(true);
      await axios.put(`${API}/authors/${authorId}`, {
        name: profile.name,
        bio: profile.bio,
        short_bio: profile.short_bio,
        avatar: profile.avatar,
        social_links: profile.social_links
      });
      toast.success('Profile saved!');
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };
  
  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put(`${API}/settings/${authorId}`, {
        ...notifications,
        ...privacy
      });
      toast.success('Settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDisconnectWallet = () => {
    disconnect();
    toast.success('Wallet disconnected');
  };
  
  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG, WebP, or GIF)');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    try {
      setUploadingImage(true);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfile({...profile, avatar: base64String});
        toast.success('Image uploaded! Click "Save Profile" to keep changes.');
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Fetch podcasts for analytics
  const fetchMyPodcasts = async () => {
    try {
      const response = await axios.get(`${API}/moderation/podcasts/${authorId}`);
      setPodcasts(response.data);
    } catch (error) {
      console.error('Failed to fetch podcasts:', error);
    }
  };
  
  // Fetch telegram streaming data
  const fetchTelegramStreaming = async () => {
    try {
      const [channelsRes, statsRes] = await Promise.all([
        axios.get(`${API}/telegram-streaming/channels/${authorId}`),
        axios.get(`${API}/telegram-streaming/stats/${authorId}`)
      ]);
      setTelegramChannels(channelsRes.data || []);
      setTelegramStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch telegram streaming:', error);
    }
  };
  
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchMyPodcasts();
    } else if (activeTab === 'telegram') {
      fetchTelegramStreaming();
    }
  }, [activeTab]);
  
  const chartData = analytics?.daily_stats 
    ? Object.entries(analytics.daily_stats).map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        views: stats.views, listens: stats.listens
      }))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 pt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Creator Workspace</h1>
            <p className="text-gray-500 text-sm">Manage your content, profile, and analytics</p>
          </div>
          <Button
            onClick={() => setShowCreatePodcast(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Podcast
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border rounded-xl p-1 mb-6 grid grid-cols-3 gap-1 max-w-xl mx-auto" data-testid="workspace-tabs">
            <TabsTrigger value="telegram" className="rounded-lg text-xs sm:text-sm">
              <Send className="w-4 h-4 mr-1" /> Telegram
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 mr-1" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg text-xs sm:text-sm">
              <User className="w-4 h-4 mr-1" /> Profile
            </TabsTrigger>
          </TabsList>
          
          
          
          {/* ANALYTICS TAB - Combined Overview + Podcast Analytics */}
          <TabsContent value="analytics">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs text-gray-500">Views</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.total_views || 0}</p>
              </Card>
              <Card className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 text-teal-600 mb-2">
                  <Headphones className="w-4 h-4" />
                  <span className="text-xs text-gray-500">Listens</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.total_listens || 0}</p>
              </Card>
              <Card className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 text-cyan-600 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs text-gray-500">Subscribers</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.subscribers || 0}</p>
              </Card>
              <Card className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Headphones className="w-4 h-4" />
                  <span className="text-xs text-gray-500">Episodes</span>
                </div>
                <p className="text-2xl font-bold">{analytics?.total_podcasts || 0}</p>
              </Card>
            </div>
            
            {/* 30 Days Chart */}
            <Card className="bg-white rounded-xl p-4 mb-6">
              <h3 className="font-semibold mb-4">Last 30 Days</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="listens" stroke="#14b8a6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            
            {/* Podcast-Specific Analytics */}
            <Card className="bg-white rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Podcast Analytics</h3>
                {podcasts.length > 0 && (
                  <Select 
                    value={selectedPodcastForAnalytics?.id || ''} 
                    onValueChange={(value) => {
                      const podcast = podcasts.find(p => p.id === value);
                      setSelectedPodcastForAnalytics(podcast);
                    }}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select podcast" />
                    </SelectTrigger>
                    <SelectContent>
                      {podcasts.map(podcast => (
                        <SelectItem key={podcast.id} value={podcast.id}>
                          {podcast.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {podcasts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No podcasts yet</p>
                  <p className="text-sm text-gray-400">Create your first podcast to see detailed analytics</p>
                </div>
              ) : !selectedPodcastForAnalytics ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Select a podcast to view detailed analytics</p>
                </div>
              ) : (
                <PodcastAnalytics podcastId={selectedPodcastForAnalytics.id} />
              )}
            </Card>
          </TabsContent>
          
          {/* PROFILE TAB - FULL VERSION WITH SUB-TABS */}
          <TabsContent value="profile">
            <Tabs defaultValue="profile-info" className="w-full">
              <TabsList className="bg-white border border-gray-200 rounded-2xl p-1 mb-6 w-full grid grid-cols-4">
                <TabsTrigger 
                  value="profile-info"
                  className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications"
                  className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger 
                  value="privacy"
                  className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger 
                  value="links"
                  className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Links
                </TabsTrigger>
              </TabsList>
              
              {/* Profile Info Sub-Tab */}
              <TabsContent value="profile-info">
                <Card className="bg-white border border-gray-200 rounded-3xl p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
                  
                  {/* Avatar */}
                  <div className="flex items-start gap-6 mb-8">
                    <Avatar className={`w-24 h-24 border-4 ${getRatingBorderClass(profile.rating)} flex-shrink-0`}>
                      <AvatarImage src={profile.avatar} />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                        {profile.name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                      <div>
                        <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                          <ImagePlus className="w-4 h-4" />
                          Avatar Image
                        </Label>
                        <div className="flex items-center gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button
                            onClick={handleUploadClick}
                            disabled={uploadingImage}
                            variant="outline"
                            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          >
                            {uploadingImage ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                            ) : (
                              <><Upload className="w-4 h-4 mr-2" /> Upload Image</>
                            )}
                          </Button>
                          <span className="text-xs text-gray-500">
                            JPG, PNG, WebP, GIF (max 5MB)
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Or use URL
                        </Label>
                        <Input
                          value={profile.avatar}
                          onChange={(e) => setProfile({...profile, avatar: e.target.value})}
                          placeholder="https://example.com/avatar.jpg"
                          className="bg-gray-50 border-gray-200 rounded-xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          You can also paste a direct link to an image
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label className="text-gray-900 font-medium mb-2 block">Display Name</Label>
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        placeholder="Your name"
                        className="bg-gray-50 border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-900 font-medium mb-2 block flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Telegram Username
                      </Label>
                      {profile.telegram_connected ? (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                          <span className="font-medium text-blue-700">@{profile.telegram_username || 'Connected'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <span className="text-gray-500">Connect Telegram to set username</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Username synced from Telegram
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <Label className="text-gray-900 font-medium mb-2 block">Short Bio</Label>
                    <Input
                      value={profile.short_bio}
                      onChange={(e) => setProfile({...profile, short_bio: e.target.value})}
                      placeholder="Brief description for your profile card (max 100 chars)"
                      maxLength={100}
                      className="bg-gray-50 border-gray-200 rounded-xl"
                    />
                    <p className="text-xs text-gray-500 mt-1">{profile.short_bio?.length || 0}/100 - Shown on profile cards</p>
                  </div>
                  
                  <div className="mb-6">
                    <Label className="text-gray-900 font-medium mb-2 block">Full Bio</Label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({...profile, bio: e.target.value})}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="bg-gray-50 border-gray-200 rounded-xl"
                    />
                    <p className="text-xs text-gray-500 mt-1">Shown on your full profile page</p>
                  </div>
                  
                  <div className="mb-8">
                    <Label className="text-gray-900 font-medium mb-2 block flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Wallet Address
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        value={walletAddress || profile.wallet_address}
                        disabled
                        placeholder="Connect wallet to see address"
                        className="bg-gray-100 border-gray-200 rounded-xl font-mono flex-1"
                      />
                      {isConnected && walletAddress && (
                        <Button
                          onClick={handleDisconnectWallet}
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Disconnect
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {isConnected ? 'Your connected wallet address is automatically synced' : 'Please connect your wallet to link it to your profile'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    className="bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl px-8"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save Profile</>
                    )}
                  </Button>
                </Card>
              </TabsContent>
              
              {/* Notifications Sub-Tab */}
              <TabsContent value="notifications">
                {/* Push Notifications Section */}
                <div className="mb-6">
                  <PushNotificationManager userId={authorId} />
                </div>
                
                <Card className="bg-white border border-gray-200 rounded-3xl p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">New Followers</p>
                        <p className="text-sm text-gray-500">Get notified when someone follows you</p>
                      </div>
                      <Switch
                        checked={notifications.notify_new_follower}
                        onCheckedChange={(checked) => setNotifications({...notifications, notify_new_follower: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">New Comments</p>
                        <p className="text-sm text-gray-500">Get notified when someone comments</p>
                      </div>
                      <Switch
                        checked={notifications.notify_new_comment}
                        onCheckedChange={(checked) => setNotifications({...notifications, notify_new_comment: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">Reactions</p>
                        <p className="text-sm text-gray-500">Get notified when someone reacts</p>
                      </div>
                      <Switch
                        checked={notifications.notify_new_reaction}
                        onCheckedChange={(checked) => setNotifications({...notifications, notify_new_reaction: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">New Episodes</p>
                        <p className="text-sm text-gray-500">Get notified about new episodes from subscriptions</p>
                      </div>
                      <Switch
                        checked={notifications.notify_new_episode}
                        onCheckedChange={(checked) => setNotifications({...notifications, notify_new_episode: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">Mentions</p>
                        <p className="text-sm text-gray-500">Get notified when someone mentions you</p>
                      </div>
                      <Switch
                        checked={notifications.notify_mentions}
                        onCheckedChange={(checked) => setNotifications({...notifications, notify_mentions: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={notifications.email_notifications}
                        onCheckedChange={(checked) => setNotifications({...notifications, email_notifications: checked})}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="mt-8 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl px-8"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" /> Save Preferences</>
                    )}
                  </Button>
                </Card>
              </TabsContent>
              
              {/* Privacy Sub-Tab */}
              <TabsContent value="privacy">
                <Card className="bg-white border border-gray-200 rounded-3xl p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Privacy Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">Public Profile</p>
                        <p className="text-sm text-gray-500">Make your profile visible to everyone</p>
                      </div>
                      <Switch
                        checked={privacy.profile_visible}
                        onCheckedChange={(checked) => setPrivacy({...privacy, profile_visible: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">Listening History</p>
                        <p className="text-sm text-gray-500">Show what you&apos;ve been listening to</p>
                      </div>
                      <Switch
                        checked={privacy.show_listening_history}
                        onCheckedChange={(checked) => setPrivacy({...privacy, show_listening_history: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-medium text-gray-900">Allow Comments</p>
                        <p className="text-sm text-gray-500">Let others comment on your podcasts</p>
                      </div>
                      <Switch
                        checked={privacy.allow_comments}
                        onCheckedChange={(checked) => setPrivacy({...privacy, allow_comments: checked})}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="mt-8 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl px-8"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" /> Save Settings</>
                    )}
                  </Button>
                </Card>
              </TabsContent>
              
              {/* Links Sub-Tab */}
              <TabsContent value="links">
                <Card className="bg-white border border-gray-200 rounded-3xl p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Social Links</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                        <Twitter className="w-4 h-4" />
                        Twitter / X
                      </Label>
                      <Input
                        value={profile.social_links?.twitter || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          social_links: {...profile.social_links, twitter: e.target.value}
                        })}
                        placeholder="https://twitter.com/username"
                        className="bg-gray-50 border-gray-200 rounded-xl"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                        <Youtube className="w-4 h-4" />
                        YouTube
                      </Label>
                      <Input
                        value={profile.social_links?.youtube || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          social_links: {...profile.social_links, youtube: e.target.value}
                        })}
                        placeholder="https://youtube.com/@channel"
                        className="bg-gray-50 border-gray-200 rounded-xl"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Discord
                      </Label>
                      <Input
                        value={profile.social_links?.discord || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          social_links: {...profile.social_links, discord: e.target.value}
                        })}
                        placeholder="https://discord.gg/invite"
                        className="bg-gray-50 border-gray-200 rounded-xl"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Telegram
                      </Label>
                      <Input
                        value={profile.social_links?.telegram || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          social_links: {...profile.social_links, telegram: e.target.value}
                        })}
                        placeholder="https://t.me/username"
                        className="bg-gray-50 border-gray-200 rounded-xl"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-900 font-medium mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Website
                      </Label>
                      <Input
                        value={profile.social_links?.website || ''}
                        onChange={(e) => setProfile({
                          ...profile, 
                          social_links: {...profile.social_links, website: e.target.value}
                        })}
                        placeholder="https://yourwebsite.com"
                        className="bg-gray-50 border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    className="mt-8 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl px-8"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save Links</>
                    )}
                  </Button>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          {/* TELEGRAM STREAMING TAB */}
          <TabsContent value="telegram">
            <div className="space-y-6">
              {/* Stats Overview */}
              {telegramStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <Send className="w-4 h-4" />
                      <span className="text-xs text-gray-500">Channels</span>
                    </div>
                    <p className="text-2xl font-bold">{telegramStats.total_channels || 0}</p>
                  </Card>
                  <Card className="bg-white rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <Radio className="w-4 h-4" />
                      <span className="text-xs text-gray-500">Total Streams</span>
                    </div>
                    <p className="text-2xl font-bold">{telegramStats.total_lives || 0}</p>
                  </Card>
                  <Card className="bg-white rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-500">Live Now</span>
                    </div>
                    <p className="text-2xl font-bold">{telegramStats.active_lives || 0}</p>
                  </Card>
                </div>
              )}
              
              {/* Main Card */}
              <Card className="bg-white rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Telegram Voice Chat Streaming</h2>
                    <p className="text-sm text-gray-500">Automatically create live sessions when Voice Chat starts</p>
                  </div>
                  <Button 
                    onClick={() => navigate('/settings/streaming')} 
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Channel
                  </Button>
                </div>
                
                {telegramChannels.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">No channels connected</h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                      Connect your Telegram channel, add @Podcast_FOMO_bot as admin, 
                      and when Voice Chat starts - live session will be created automatically
                    </p>
                    <Button 
                      onClick={() => navigate('/settings/streaming')}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      Setup Streaming
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {telegramChannels.slice(0, 3).map(channel => {
                      const telegramUrl = `https://t.me/${channel.channel_username?.replace('@', '')}`;
                      return (
                      <a
                        key={channel.id}
                        href={telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block border rounded-xl p-4 transition-all cursor-pointer hover:shadow-md ${
                          channel.is_active 
                            ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300' 
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              channel.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}>
                              <Send className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 group-hover:text-emerald-600">{channel.channel_title}</h4>
                              <p className="text-sm text-blue-600">{channel.channel_username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {channel.is_active ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Streams: {channel.stats?.total_lives || 0}
                        </div>
                      </a>
                    )})}
                    
                    {telegramChannels.length > 3 && (
                      <p className="text-center text-sm text-gray-500">
                        + {telegramChannels.length - 3} more channels
                      </p>
                    )}
                    
                    <Button 
                      onClick={() => navigate('/settings/streaming')}
                      variant="outline"
                      className="w-full mt-4"
                    >
                      Manage Channels
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </Card>
              
              {/* Instructions */}
              <Card className="bg-blue-50 border-blue-200 rounded-2xl p-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">How it works?</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Add @Podcast_FOMO_bot to your Telegram channel as admin</li>
                      <li>2. Grant the bot "Manage Voice Chats" permission</li>
                      <li>3. Connect the channel in streaming settings</li>
                      <li>4. Start Voice Chat — live session will be created automatically!</li>
                    </ol>
                    <a 
                      href="https://t.me/Podcast_FOMO_bot" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Open Bot <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Create Podcast Dialog */}
      <CreatePodcastDialog
        open={showCreatePodcast}
        onClose={() => setShowCreatePodcast(false)}
        authorId={authorId}
        onSuccess={() => {
          fetchData();
          if (activeTab === 'analytics') {
            fetchMyPodcasts();
          }
        }}
      />
    </div>
  );
};
