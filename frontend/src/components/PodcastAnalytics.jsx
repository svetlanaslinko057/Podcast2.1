import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  TrendingUp, Users, Clock, MessageCircle, Heart, 
  Eye, Headphones, ThumbsUp, Loader2, AlertTriangle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const PodcastAnalytics = ({ podcastId }) => {
  const [loading, setLoading] = useState(true);
  const [retention, setRetention] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [timeline, setTimeline] = useState(null);
  
  useEffect(() => {
    if (!podcastId) return;
    fetchAnalytics();
  }, [podcastId]);
  
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [retentionRes, engagementRes, timelineRes] = await Promise.all([
        axios.get(`${API}/analytics/podcast/${podcastId}/retention`),
        axios.get(`${API}/analytics/podcast/${podcastId}/engagement`),
        axios.get(`${API}/analytics/podcast/${podcastId}/timeline?interval=day`)
      ]);
      
      setRetention(retentionRes.data);
      setEngagement(engagementRes.data);
      setTimeline(timelineRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  // Prepare retention data for pie chart
  const retentionData = retention?.retention ? [
    { name: '0-25%', value: retention.retention['0-25%'], fill: COLORS[3] },
    { name: '25-50%', value: retention.retention['25-50%'], fill: COLORS[2] },
    { name: '50-75%', value: retention.retention['50-75%'], fill: COLORS[1] },
    { name: '75-100%', value: retention.retention['75-100%'], fill: COLORS[4] },
    { name: '100%', value: retention.retention['100%'], fill: COLORS[0] }
  ].filter(d => d.value > 0) : [];
  
  // Retention curve data
  const retentionCurve = retention?.retention_curve || [];
  
  // Drop-off points for bar chart
  const dropOffData = retention?.drop_off_points || [];
  
  // Timeline data
  const timelineData = timeline?.data || [];
  
  // Find critical drop-off points (where >20% of listeners left)
  const criticalDropOffs = dropOffData.filter(d => d.count > (retention?.total_sessions || 0) * 0.2);
  
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Sessions</div>
              <div className="text-xl font-bold text-gray-900">
                {retention?.total_sessions || 0}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Avg Completion</div>
              <div className="text-xl font-bold text-gray-900">
                {retention?.average_completion_rate || 0}%
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Comments</div>
              <div className="text-xl font-bold text-gray-900">
                {engagement?.comments?.total || 0}
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Listeners</div>
              <div className="text-xl font-bold text-gray-900">
                {engagement?.total_listeners || 0}
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      <Tabs defaultValue="retention" className="w-full">
        <TabsList className="bg-white border rounded-xl p-1 mb-4">
          <TabsTrigger value="retention" className="rounded-lg">Retention</TabsTrigger>
          <TabsTrigger value="dropoff" className="rounded-lg">Drop-off</TabsTrigger>
          <TabsTrigger value="engagement" className="rounded-lg">Engagement</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-lg">Timeline</TabsTrigger>
        </TabsList>
        
        {/* Retention Tab - Minute by minute curve */}
        <TabsContent value="retention" className="space-y-4">
          <Card className="p-6 bg-white rounded-2xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Listener Retention Curve</h3>
            <p className="text-sm text-gray-500 mb-4">
              Shows what percentage of listeners remain at each minute of the podcast
            </p>
            {retentionCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={retentionCurve}>
                  <defs>
                    <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="minute" 
                    label={{ value: 'Minute', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    label={{ value: '% Listeners', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, 'Retention']}
                    labelFormatter={(label) => `Minute ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorRetention)" 
                    strokeWidth={2}
                  />
                  {/* Mark 50% retention line */}
                  <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="5 5" label="50%" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                  <p>No retention data yet</p>
                  <p className="text-sm">Data will appear as users listen to this podcast</p>
                </div>
              </div>
            )}
          </Card>
          
          {/* Completion Rate Pie Chart */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Completion Distribution</h3>
              {retentionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={retentionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {retentionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  No data yet
                </div>
              )}
            </Card>
            
            {/* Summary Stats */}
            <Card className="p-6 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Key Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                  <span className="text-gray-600">Completed (100%)</span>
                  <span className="font-bold text-emerald-600">
                    {retention?.retention?.['100%'] || 0} listeners
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <span className="text-gray-600">Avg. Completion</span>
                  <span className="font-bold text-blue-600">
                    {retention?.average_completion_rate || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                  <span className="text-gray-600">Early Exits (0-25%)</span>
                  <span className="font-bold text-amber-600">
                    {retention?.retention?.['0-25%'] || 0} listeners
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
        
        {/* Drop-off Tab */}
        <TabsContent value="dropoff" className="space-y-4">
          <Card className="p-6 bg-white rounded-2xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Drop-off Points</h3>
            <p className="text-sm text-gray-500 mb-4">
              Minutes where listeners stopped watching - identify problem areas
            </p>
            {dropOffData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dropOffData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="minute" 
                    label={{ value: 'Minute', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis label={{ value: 'Listeners Left', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => [`${value} listeners`, 'Dropped off']}
                    labelFormatter={(label) => `Minute ${label}`}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                  <p>No drop-off data yet</p>
                </div>
              </div>
            )}
          </Card>
          
          {/* Critical Drop-off Points */}
          {criticalDropOffs.length > 0 && (
            <Card className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-red-800 mb-2">Critical Drop-off Points</h4>
                  <p className="text-sm text-red-700 mb-3">
                    More than 20% of listeners left at these points:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {criticalDropOffs.map((point, idx) => (
                      <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        Minute {point.minute}: {point.count} listeners
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
        
        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Listeners</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold">🔴</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">During Live</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {engagement?.live_listeners || 0}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">After Live</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {engagement?.post_live_listeners || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-white rounded-2xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Comments & Reactions</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Comments (Live)</span>
                  <span className="font-bold text-gray-900">
                    {engagement?.comments?.during_live || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Comments (After)</span>
                  <span className="font-bold text-gray-900">
                    {engagement?.comments?.after_live || 0}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm">🔥 Fire</span>
                  <span className="font-bold">
                    {(engagement?.reactions?.during_live?.fire || 0) + 
                     (engagement?.reactions?.after_live?.fire || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">❤️ Heart</span>
                  <span className="font-bold">
                    {(engagement?.reactions?.during_live?.heart || 0) + 
                     (engagement?.reactions?.after_live?.heart || 0)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
        
        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card className="p-6 bg-white rounded-2xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Listens Over Time</h3>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="listens" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No timeline data yet
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
