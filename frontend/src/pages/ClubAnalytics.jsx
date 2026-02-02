import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Users, Mic, Award, Headphones, Play, Heart, Settings, Crown, Star, Radio, Clock, Hand, Lightbulb, Handshake, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useWallet } from '../context/WalletContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Analytics = () => {
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState('members');
  const [clubStats, setClubStats] = useState(null);
  const [podcastStats, setPodcastStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [podcasts, setPodcasts] = useState([]);
  const [clubSettings, setClubSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadAnalytics();
    checkAdminRole();
  }, [walletAddress]);

  const checkAdminRole = async () => {
    if (walletAddress) {
      try {
        const response = await axios.get(`${API}/admin/check-role/${walletAddress}`);
        setIsAdmin(response.data.is_admin || response.data.is_owner);
      } catch (error) {
        setIsAdmin(false);
      }
    }
  };

  const loadAnalytics = async () => {
    try {
      // Load club stats
      const [clubRes, usersRes, podcastsRes, clubSettingsRes] = await Promise.all([
        axios.get(`${API}/club/stats`).catch(() => ({ data: {} })),
        axios.get(`${API}/users`).catch(() => ({ data: [] })),
        axios.get(`${API}/podcasts`).catch(() => ({ data: { podcasts: [] } })),
        axios.get(`${API}/club/settings`).catch(() => ({ data: null }))
      ]);
      
      const podcastsList = podcastsRes.data.podcasts || podcastsRes.data || [];
      
      // Calculate podcast stats
      const totalListens = podcastsList.reduce((sum, p) => sum + (p.listens || 0), 0);
      const totalLikes = podcastsList.reduce((sum, p) => sum + (p.likes || 0), 0);
      const avgDuration = podcastsList.length > 0 
        ? podcastsList.reduce((sum, p) => sum + (p.duration || 0), 0) / podcastsList.length 
        : 0;
      
      setClubStats({
        totalMembers: clubRes.data.total_members || usersRes.data.length || 0,
        totalXP: clubRes.data.total_xp || 0,
        totalSpeeches: clubRes.data.total_speeches || 0,
        totalBadges: clubRes.data.total_badges || 0
      });
      
      setPodcastStats({
        totalPodcasts: podcastsList.length,
        totalListens,
        totalLikes,
        avgDuration: Math.round(avgDuration / 60) // в минутах
      });
      
      setUsers(usersRes.data || []);
      setPodcasts(podcastsList);
      setClubSettings(clubSettingsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Загрузка аналитики...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            {isAdmin ? 'Analytics' : 'Club'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAdmin ? 'Club and podcast statistics' : 'Members and club settings'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'} max-w-2xl`}>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="club">Club</TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
                <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Club Members</CardTitle>
                <CardDescription>
                  All members and their statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Member</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Level</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        ?.sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0))
                        .map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
                                  {user.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-xs text-gray-500">{user.username || ''}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {user.level || 1}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              {(user.xp_total || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Club Settings Tab */}
          <TabsContent value="club" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  About Club
                </CardTitle>
                <CardDescription>
                  Club information and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {clubSettings ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <div className="text-lg font-semibold">{clubSettings.club_name || 'FOMO Voice Club'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <p className="text-gray-600">{clubSettings.description || 'Private voice club with reputation economy'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Club Type
                        </label>
                        <div className="text-sm">
                          {clubSettings.is_private ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Private</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Public</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Members
                        </label>
                        <div className="text-sm font-semibold">{clubSettings.max_members || 1000}</div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Level System
                      </h3>
                      <div className="space-y-3">
                        {clubSettings.levels?.map((level) => (
                          <div key={level.level} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold">
                                {level.level}
                              </div>
                              <div>
                                <div className="font-semibold">{level.name}</div>
                                <div className="text-xs text-gray-600">Level {level.level}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">{level.xp_required} XP</div>
                              <div className="text-xs text-gray-500">required</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Badges Section - Always show all 14 badges */}
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Badges (14 Total)
                      </h3>
                      
                      {/* Participation Badges */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Participation (6)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Star className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Early Member</div>
                              <div className="text-xs text-gray-400">Joined in the first 30 days</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Radio className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">10 Sessions Attended</div>
                              <div className="text-xs text-gray-400">Participated in 10 live sessions</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Mic className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">First Time Speaker</div>
                              <div className="text-xs text-gray-400">Gave your first speech</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">100 Hours in Club</div>
                              <div className="text-xs text-gray-400">Listened for 100+ hours</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Hand className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Active Hand Raiser</div>
                              <div className="text-xs text-gray-400">Raised hand 50+ times</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Heart className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Community Supporter</div>
                              <div className="text-xs text-gray-400">Supported 25+ speeches</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contribution Badges */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Contribution (4)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Lightbulb className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Insightful Speaker</div>
                              <div className="text-xs text-gray-400">Received 50+ 'insightful' supports</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Handshake className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Community Helper</div>
                              <div className="text-xs text-gray-400">Actively helps other members</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Moderator Trusted</div>
                              <div className="text-xs text-gray-400">Trusted by moderators</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Radio className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Signal Provider</div>
                              <div className="text-xs text-gray-400">Provides valuable insights regularly</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Authority Badges */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Authority (4)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Star className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Core Member</div>
                              <div className="text-xs text-gray-400">Essential part of the club</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Verified Expert</div>
                              <div className="text-xs text-gray-400">Recognized expert in their field</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Club Council</div>
                              <div className="text-xs text-gray-400">Member of the club council</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <Award className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-700">Long-Term Holder</div>
                              <div className="text-xs text-gray-400">Long-term committed member</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Club information not loaded
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab (only for admins) */}
          <TabsContent value="stats" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {clubStats?.totalMembers || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Total XP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {clubStats?.totalXP?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Speeches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {clubStats?.totalSpeeches || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {clubStats?.totalBadges || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Member</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Level</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        ?.sort((a, b) => (b.xp_total || 0) - (a.xp_total || 0))
                        .slice(0, 10)
                        .map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
                                  {user.name?.charAt(0) || '?'}
                                </div>
                                <span className="font-medium">{user.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {user.level || 1}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              {(user.xp_total || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Podcasts Analytics Tab */}
          <TabsContent value="podcasts" className="space-y-6">
            {/* Podcast Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    Total Podcasts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {podcastStats?.totalPodcasts || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Listens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {podcastStats?.totalListens?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Likes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {podcastStats?.totalLikes?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Avg Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {podcastStats?.avgDuration || 0}
                    <span className="text-lg text-gray-500 ml-1">min</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Podcasts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Podcast Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {podcasts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Author</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Duration</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">Listens</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">Likes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {podcasts
                          .sort((a, b) => (b.listens || 0) - (a.listens || 0))
                          .map((podcast) => (
                            <tr key={podcast.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="font-medium">{podcast.title}</div>
                                <div className="text-xs text-gray-500">{podcast.category || 'Uncategorized'}</div>
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {podcast.author_name || 'Unknown'}
                              </td>
                              <td className="py-3 px-4 text-center text-sm text-gray-600">
                                {podcast.duration ? Math.round(podcast.duration / 60) : 0} min
                              </td>
                              <td className="py-3 px-4 text-right font-semibold">
                                {(podcast.listens || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-pink-600">
                                {(podcast.likes || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No podcasts yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
