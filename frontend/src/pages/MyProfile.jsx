import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { 
  User, Edit3, Save, X, Loader2, Camera, MessageCircle, 
  Headphones, Heart, Calendar, Wallet, Twitter, Globe, Send, Youtube
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '../context/WalletContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const MyProfile = () => {
  const navigate = useNavigate();
  const { walletAddress, connectWallet, disconnectWallet, isConnected } = useWallet();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile data
  const [profile, setProfile] = useState({
    id: walletAddress || 'demo-user-123',
    name: '',
    username: '',
    bio: '',
    avatar: '',
    email: '',
    wallet_address: walletAddress || '',
    followers_count: 0,
    following_count: 0,
    podcasts_count: 0,
    social_links: {
      twitter: '',
      telegram: '',
      website: '',
      youtube: ''
    }
  });
  
  // Activity data
  const [myPodcasts, setMyPodcasts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [listeningHistory, setListeningHistory] = useState([]);
  
  const userId = walletAddress || 'demo-user-123';
  
  useEffect(() => {
    fetchProfileData();
    fetchActivityData();
  }, [walletAddress]);
  
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      // Try to fetch author profile by ID
      const response = await axios.get(`${API}/authors/${userId}`);
      if (response.data) {
        setProfile({
          ...response.data,
          social_links: response.data.social_links || {
            twitter: '',
            telegram: '',
            website: '',
            youtube: ''
          }
        });
      }
    } catch (error) {
      // If not found, try to find by wallet address
      try {
        const allAuthors = await axios.get(`${API}/authors`);
        const existingAuthor = allAuthors.data.find(a => 
          a.wallet_address === walletAddress || a.id === userId
        );
        if (existingAuthor) {
          setProfile({
            ...existingAuthor,
            social_links: existingAuthor.social_links || {
              twitter: '',
              telegram: '',
              website: '',
              youtube: ''
            }
          });
        }
      } catch (e) {
        console.error('Failed to fetch profile:', e);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const fetchActivityData = async () => {
    try {
      // Fetch my podcasts
      const podcastsRes = await axios.get(`${API}/podcasts`, {
        params: { author_id: userId }
      });
      setMyPodcasts(podcastsRes.data);
      
      // Fetch my comments (if endpoint exists)
      try {
        const commentsRes = await axios.get(`${API}/comments/user/${userId}`);
        setMyComments(commentsRes.data);
      } catch (e) {
        setMyComments([]);
      }
      
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };
  
  const handleSaveProfile = async () => {
    if (!profile.name || !profile.username) {
      toast.error('Name and username are required');
      return;
    }
    
    setSaving(true);
    try {
      // Prepare data for update
      const updateData = {
        id: userId,
        name: profile.name,
        username: profile.username,
        bio: profile.bio,
        avatar: profile.avatar,
        wallet_address: walletAddress || '',
        social_links: profile.social_links
      };
      
      // Try to update, if fails create new
      try {
        await axios.put(`${API}/authors/${userId}`, updateData);
      } catch (e) {
        // Create new author
        await axios.post(`${API}/authors`, updateData);
      }
      
      toast.success('Profile updated successfully!');
      setEditing(false);
      fetchProfileData();
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };
  
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile({ ...profile, avatar: reader.result });
    };
    reader.readAsDataURL(file);
  };
  
  const updateSocialLink = (platform, value) => {
    setProfile({
      ...profile,
      social_links: {
        ...profile.social_links,
        [platform]: value
      }
    });
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-500">Manage your profile, activity, and settings</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border rounded-xl p-1 mb-6">
            <TabsTrigger value="profile" className="rounded-lg">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg">
              <Headphones className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="wallet" className="rounded-lg">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-white rounded-2xl p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-emerald-100">
                      <AvatarImage src={profile.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-2xl">
                        {profile.name ? profile.name[0] : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {editing && (
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition-colors">
                        <Camera className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex gap-6">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{profile.podcasts_count || 0}</div>
                      <div className="text-sm text-gray-500">Podcasts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{profile.xp_total || 0}</div>
                      <div className="text-sm text-gray-500">XP</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">L{profile.level || 1}</div>
                      <div className="text-sm text-gray-500">Level</div>
                    </div>
                  </div>
                </div>
                
                {/* Edit/Save Button */}
                {editing ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" /> Save</>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing(false);
                        fetchProfileData();
                      }}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                )}
              </div>
              
              {/* Form Fields */}
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      disabled={!editing}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      disabled={!editing}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    disabled={!editing}
                    className="mt-2 min-h-[100px]"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                
                {/* Social Links */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Social Links</Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="twitter" className="flex items-center gap-2 text-sm">
                        <Twitter className="w-4 h-4" /> Twitter
                      </Label>
                      <Input
                        id="twitter"
                        value={profile.social_links?.twitter || ''}
                        onChange={(e) => updateSocialLink('twitter', e.target.value)}
                        disabled={!editing}
                        className="mt-1"
                        placeholder="@username"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="telegram" className="flex items-center gap-2 text-sm">
                        <Send className="w-4 h-4" /> Telegram
                      </Label>
                      <Input
                        id="telegram"
                        value={profile.social_links?.telegram || ''}
                        onChange={(e) => updateSocialLink('telegram', e.target.value)}
                        disabled={!editing}
                        className="mt-1"
                        placeholder="@username or t.me/..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="youtube" className="flex items-center gap-2 text-sm">
                        <Youtube className="w-4 h-4" /> YouTube
                      </Label>
                      <Input
                        id="youtube"
                        value={profile.social_links?.youtube || ''}
                        onChange={(e) => updateSocialLink('youtube', e.target.value)}
                        disabled={!editing}
                        className="mt-1"
                        placeholder="Channel URL"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="website" className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4" /> Website
                      </Label>
                      <Input
                        id="website"
                        value={profile.social_links?.website || ''}
                        onChange={(e) => updateSocialLink('website', e.target.value)}
                        disabled={!editing}
                        className="mt-1"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="space-y-6">
              {/* My Podcasts */}
              <Card className="bg-white rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  My Podcasts ({myPodcasts.length})
                </h3>
                {myPodcasts.length > 0 ? (
                  <div className="space-y-3">
                    {myPodcasts.map((podcast) => (
                      <div
                        key={podcast.id}
                        onClick={() => navigate(`/podcast/${podcast.id}`)}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex-shrink-0">
                          {podcast.cover_image && (
                            <img src={podcast.cover_image} alt="" className="w-full h-full object-cover rounded-xl" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{podcast.title}</h4>
                          <p className="text-sm text-gray-500">{podcast.views_count || 0} views</p>
                        </div>
                        {podcast.is_live && (
                          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            LIVE
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Headphones className="w-12 h-12 mx-auto mb-2" />
                    <p>No podcasts created yet</p>
                  </div>
                )}
              </Card>
              
              {/* My Comments */}
              <Card className="bg-white rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Recent Comments ({myComments.length})
                </h3>
                {myComments.length > 0 ? (
                  <div className="space-y-3">
                    {myComments.slice(0, 5).map((comment) => (
                      <div key={comment.id} className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-gray-900">{comment.text}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2" />
                    <p>No comments yet</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
          
          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <Card className="bg-white rounded-2xl p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Wallet Connection</h3>
              
              {isConnected ? (
                <div className="space-y-4">
                  <div className="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-emerald-600 font-medium">Connected</div>
                        <div className="font-mono text-sm text-gray-900">
                          {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={disconnectWallet}
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    Disconnect Wallet
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-10 h-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Connect your wallet
                  </h4>
                  <p className="text-gray-500 mb-6">
                    Connect MetaMask to leave comments and interact with podcasts
                  </p>
                  <Button
                    onClick={connectWallet}
                    className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                  >
                    Connect MetaMask
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
