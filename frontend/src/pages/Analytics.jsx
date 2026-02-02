import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Eye, Headphones, Clock, Globe, Smartphone, Calendar } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const COLORS = ['#10b981', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

export function Analytics() {
  const { authorId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [authorId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/analytics/author/${authorId}/detailed?days=${timeRange}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  const { overview, listens_over_time, device_breakdown, geographic_distribution, peak_hours, subscriber_growth, episode_comparison } = analytics;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Detailed insights into your podcast performance</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8 flex gap-2">
          {[7, 30, 90, 365].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
                timeRange === days
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
              }`}
            >
              {days === 365 ? 'All Time' : `${days}d`}
            </button>
          ))}
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            icon={<Eye className="w-6 h-6" />}
            label="Total Views"
            value={overview.total_views.toLocaleString()}
            color="emerald"
          />
          <StatCard
            icon={<Headphones className="w-6 h-6" />}
            label="Total Listens"
            value={overview.total_listens.toLocaleString()}
            color="teal"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Avg Duration"
            value={`${Math.round(overview.avg_listen_duration / 60)}m`}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Followers"
            value={overview.current_followers.toLocaleString()}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Episodes"
            value={overview.total_podcasts}
            color="pink"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Listens Over Time */}
          <ChartCard title="Listens Over Time" icon={<TrendingUp className="w-5 h-5" />}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={listens_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="listens" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Subscriber Growth */}
          <ChartCard title="Subscriber Growth" icon={<Users className="w-5 h-5" />}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={subscriber_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="followers" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Device Breakdown */}
          <ChartCard title="Device Breakdown" icon={<Smartphone className="w-5 h-5" />}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={device_breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ device, percent }) => `${device} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="device"
                >
                  {device_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Geographic Distribution */}
          <ChartCard title="Geographic Distribution" icon={<Globe className="w-5 h-5" />}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={geographic_distribution.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="location" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                />
                <Bar dataKey="count" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Peak Listening Hours */}
          <ChartCard title="Peak Listening Hours" icon={<Clock className="w-5 h-5" />}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peak_hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                  labelFormatter={(hour) => `${hour}:00`}
                />
                <Bar dataKey="listens" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Episode Comparison */}
          <ChartCard title="Top Episodes" icon={<TrendingUp className="w-5 h-5" />} className="lg:col-span-2">
            <div className="space-y-3">
              {episode_comparison.slice(0, 8).map((episode, index) => (
                <div key={episode.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{episode.title}</p>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>👁️ {episode.views}</span>
                      <span>🎧 {episode.listens}</span>
                      <span>❤️ {episode.reactions}</span>
                      <span>💬 {episode.comments}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, color }) {
  const colors = {
    emerald: 'from-emerald-500 to-teal-500',
    teal: 'from-teal-500 to-cyan-500',
    blue: 'from-blue-500 to-indigo-500',
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500'
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ChartCard({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="text-emerald-500">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}
