import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PodcastCard } from '../components/PodcastCard';
import { 
  Trophy, Activity, Clock, Mic, Loader2,
  MessageCircle, Zap, TrendingUp, Award, Star
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthorProfile = () => {
  const { authorId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [podcasts, setPodcasts] = useState([]);
  const [progress, setProgress] = useState(null);
  const [badges, setBadges] = useState(null);
  const [voiceHistory, setVoiceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('podcasts');
  
  useEffect(() => {
    fetchUserData();
  }, [authorId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [userRes, podcastsRes, progressRes, badgesRes] = await Promise.all([
        axios.get(`${API}/authors/${authorId}`),
        axios.get(`${API}/podcasts`, { params: { author_id: authorId } }),
        axios.get(`${API}/xp/${authorId}/progress`).catch(() => ({ data: null })),
        axios.get(`${API}/users/${authorId}/badges`).catch(() => ({ data: null })),
      ]);
      
      setUser(userRes.data);
      setPodcasts(podcastsRes.data || []);
      setProgress(progressRes.data);
      setBadges(badgesRes.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      1: 'from-gray-400 to-gray-600',
      2: 'from-blue-400 to-blue-600',
      3: 'from-purple-400 to-purple-600',
      4: 'from-orange-400 to-orange-600',
      5: 'from-green-400 to-green-600',
    };
    return colors[level] || colors[1];
  };

  const getLevelName = (level) => {
    const names = {
      1: 'Observer',
      2: 'Active Member',
      3: 'Contributor',
      4: 'Speaker',
      5: 'Core Voice',
    };
    return names[level] || 'Observer';
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      owner: 'bg-yellow-500 text-white',
      admin: 'bg-red-500 text-white',
      moderator: 'bg-blue-500 text-white',
      speaker: 'bg-purple-500 text-white',
      member: 'bg-green-500 text-white',
      listener: 'bg-gray-500 text-white',
    };
    return colors[role] || colors.listener;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20 flex items-center justify-center">
        <div className="text-gray-500">User not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header Card */}
        <Card className="overflow-hidden mb-6">
          {/* Cover / Level Gradient */}
          <div className={`h-32 bg-gradient-to-r ${getLevelColor(progress?.current_level || user.level || 1)}`} />
          
          <div className="p-8 -mt-16 relative">
            {/* Avatar */}
            <div className="flex items-start gap-6 mb-6">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                  <AvatarImage src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} />
                  <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                </Avatar>
                {/* Level Badge */}
                <div className={`absolute -bottom-2 -right-2 ${getLevelColor(progress?.current_level || user.level || 1).replace('from-', 'bg-').replace('to-', '').split(' ')[0]} px-3 py-1 rounded-full text-white font-bold text-sm shadow-lg`}>
                  L{progress?.current_level || user.level || 1}
                </div>
              </div>

              <div className="flex-1">
                {/* Name & Role */}
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                  <Badge className={`${getRoleBadgeColor(user.role || 'listener')}`}>
                    {(user.role || 'listener').toUpperCase()}
                  </Badge>
                </div>
                
                <p className="text-gray-600 mb-1">@{user.username}</p>
                <p className="text-lg text-gray-700 mb-3">{getLevelName(progress?.current_level || user.level || 1)}</p>
                
                {user.bio && <p className="text-gray-600 mb-4">{user.bio}</p>}

                {/* Stats */}
                <div className="flex gap-6">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {progress?.xp_total?.toLocaleString() || user.xp_total?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total XP</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {progress?.engagement_score?.toFixed(1) || user.engagement_score?.toFixed(1) || 0}
                    </div>
                    <div className="text-sm text-gray-600">Engagement</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {badges?.total_badges || 0}
                    </div>
                    <div className="text-sm text-gray-600">Badges</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => navigate(`/messages/${user.id}`)}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>

            {/* Progress Bar (if has progress data) */}
            {progress && (
              <div className="bg-gray-100 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">Progress to Level {progress.next_level}</span>
                  <span className="font-semibold text-gray-900">{progress.progress_percent}%</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                  <div
                    className={`bg-gradient-to-r ${getLevelColor(progress.current_level)} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${progress.progress_percent}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {progress.xp_to_next_level} XP to {progress.next_level_name}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Stats Grid */}
        {progress && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Engagement Score</h3>
              </div>
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {progress.engagement_score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Out of 100</div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Priority Score</h3>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {progress.priority_score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Hand Raise Queue</div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Mic className="w-6 h-6 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Voice Stats</h3>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {user.voice_stats?.total_speeches || 0}
              </div>
              <div className="text-sm text-gray-600">Speeches Given</div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="podcasts">Podcasts ({podcasts.length})</TabsTrigger>
            <TabsTrigger value="badges">Badges ({badges?.total_badges || 0})</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          {/* Podcasts Tab */}
          <TabsContent value="podcasts">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {podcasts.map((podcast) => (
                <PodcastCard key={podcast.id} podcast={podcast} />
              ))}
              {podcasts.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No podcasts yet
                </div>
              )}
            </div>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges">
            {badges && badges.total_badges > 0 ? (
              <div className="space-y-6">
                {/* Participation Badges */}
                {badges.badges.participation.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-4">Participation Badges</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {badges.badges.participation.map((badge, idx) => (
                        <div key={idx} className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                          <span className="text-3xl">{badge.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{badge.name}</div>
                            <div className="text-sm text-gray-600">{badge.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Earned: {new Date(badge.earned_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Contribution Badges */}
                {badges.badges.contribution.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-4">Contribution Badges</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {badges.badges.contribution.map((badge, idx) => (
                        <div key={idx} className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                          <span className="text-3xl">{badge.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{badge.name}</div>
                            <div className="text-sm text-gray-600">{badge.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Earned: {new Date(badge.earned_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Authority Badges */}
                {badges.badges.authority.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-4">Authority Badges</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {badges.badges.authority.map((badge, idx) => (
                        <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                          <span className="text-3xl">{badge.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{badge.name}</div>
                            <div className="text-sm text-gray-600">{badge.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Earned: {new Date(badge.earned_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No badges yet</h3>
                <p className="text-gray-600">This user hasn't earned any badges yet</p>
              </Card>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="space-y-6">
              {/* Voice Stats */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-4">Voice Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Total Speeches</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {user.voice_stats?.total_speeches || 0}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Speech Time</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {user.voice_stats?.total_speech_time_minutes || 0}m
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Hand Raises</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {user.voice_stats?.hand_raise_count || 0}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Success Rate</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {((user.voice_stats?.hand_raise_success_rate || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </Card>

              {/* XP Breakdown */}
              {progress && (
                <Card className="p-6">
                  <h3 className="font-semibold text-lg text-gray-900 mb-4">XP Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Listening Time</span>
                      <span className="font-semibold text-blue-600">
                        {progress.xp_breakdown.listening_time} XP
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Live Attendance</span>
                      <span className="font-semibold text-orange-600">
                        {progress.xp_breakdown.live_attendance} XP
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Hand Raises</span>
                      <span className="font-semibold text-purple-600">
                        {progress.xp_breakdown.hand_raises} XP
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Speeches Given</span>
                      <span className="font-semibold text-emerald-600">
                        {progress.xp_breakdown.speeches_given} XP
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Support Received</span>
                      <span className="font-semibold text-pink-600">
                        {progress.xp_breakdown.support_received} XP
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
