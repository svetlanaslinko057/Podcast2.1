import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  TrendingUp, TrendingDown, Users, Headphones, Heart, 
  Clock, Calendar, BarChart3, Eye, Share2, Download
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export const ExtendedAnalytics = ({ authorId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, all

  useEffect(() => {
    loadAnalytics();
  }, [authorId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/${authorId}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Analytics will appear once you have some activity</p>
      </Card>
    );
  }

  const totalListens = analytics.total_listens || 0;
  const totalViews = analytics.total_views || 0;
  const totalLikes = analytics.total_likes || 0;
  const totalShares = analytics.total_shares || 0;

  // Mock data for charts (в реальности придет с бэкенда)
  const dailyListensData = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    listens: Math.floor(Math.random() * 200) + 50,
    views: Math.floor(Math.random() * 150) + 30
  }));

  const podcastsData = analytics.podcasts?.slice(0, 5).map((p, i) => ({
    name: p.title?.substring(0, 20) + '...' || `Podcast ${i + 1}`,
    listens: p.listens_count || 0,
    likes: p.likes?.length || 0
  })) || [];

  const engagementData = [
    { name: 'Listens', value: totalListens },
    { name: 'Likes', value: totalLikes },
    { name: 'Shares', value: totalShares },
    { name: 'Comments', value: analytics.total_comments || 0 }
  ];

  const changePercent = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Extended Analytics</h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map((range) => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
            >
              {range === 'all' ? 'All Time' : range}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Headphones className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Listens</p>
                <p className="text-2xl font-bold text-gray-900">{totalListens.toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="success" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12%
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Profile Views</p>
                <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="success" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +8%
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900">{totalLikes.toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="success" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +15%
            </Badge>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Followers</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.followers_count || 0}</p>
              </div>
            </div>
            <Badge variant="success" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +5%
            </Badge>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Listens Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Listens & Views</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyListensData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="listens" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Podcasts Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Podcasts</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={podcastsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="listens" fill="#10b981" />
              <Bar dataKey="likes" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Engagement Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Engagement Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={engagementData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {engagementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Audience Demographics */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Listener Retention</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Complete Listens</span>
                <span className="text-sm font-semibold text-gray-900">68%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">50% Completion</span>
                <span className="text-sm font-semibold text-gray-900">82%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg Listen Time</span>
                <span className="text-sm font-semibold text-gray-900">12m 34s</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Return Rate</span>
                <span className="text-sm font-semibold text-gray-900">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>
    </div>
  );
};
