import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Eye, Headphones, TrendingUp, Clock, Loader2, BarChart3, ArrowRight, Radio, Settings } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const authorId = 'demo-author-123';
  
  useEffect(() => {
    fetchAnalytics();
  }, []);
  
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/author/${authorId}`, {
        params: { days: 30 }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }
  
  const chartData = analytics?.daily_stats 
    ? Object.entries(analytics.daily_stats).map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        views: stats.views,
        listens: stats.listens
      }))
    : [];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-6">
            <BarChart3 className="w-4 h-4" />
            Analytics Dashboard
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Author <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Statistics</span>
              </h1>
              <p className="text-gray-600">Analytics of your podcasts for the last 30 days</p>
            </div>
            <Link
              to={`/analytics/${authorId}`}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-medium flex items-center gap-2 transition-all"
              data-testid="view-detailed-analytics-btn"
            >
              Detailed Analytics
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+12%</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Total Views</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics?.total_views || 0}
            </p>
          </Card>
          
          <Card className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                <Headphones className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex items-center gap-1 text-teal-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+8%</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Listens</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics?.total_listens || 0}
            </p>
          </Card>
          
          <Card className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Avg Duration</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics?.avg_listen_duration ? `${Math.round(analytics.avg_listen_duration / 60)}min` : '0min'}
            </p>
          </Card>
          
          <Card className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-violet-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Engagement</p>
            <p className="text-3xl font-bold text-gray-900">87%</p>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Views and Listens</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: '#111827', fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                <Line type="monotone" dataKey="listens" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          
          <Card className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Weekly Activity</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: '#111827', fontWeight: 600 }}
                />
                <Bar dataKey="views" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link 
            to="/moderator"
            className="block bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-2xl p-6 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Moderator Panel</h3>
                <p className="text-sm text-gray-600">Manage live broadcasts and listeners</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">Start/stop broadcasts, mute users, moderate chat, and more.</p>
            <div className="flex items-center gap-2 text-red-600 font-medium group-hover:gap-3 transition-all">
              Go to Moderator <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link 
            to="/settings/streaming"
            className="block bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-6 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Streaming Settings</h3>
                <p className="text-sm text-gray-600">Configure multi-platform streaming</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">Set up YouTube Live, Twitch, Telegram, and custom RTMP streaming.</p>
            <div className="flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all">
              Configure Streaming <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
