import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Archive, Send, Twitter, Radio, Calendar, Clock, Download } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export function ArchivedLibrary() {
  const [authorId] = useState('demo-author-123');
  const [archived, setArchived] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchived();
    loadStats();
  }, [filter]);

  const loadArchived = async () => {
    try {
      setLoading(true);
      const params = { author_id: authorId };
      if (filter !== 'all') params.platform = filter;
      
      const response = await axios.get(`${API_URL}/api/library/archived`, { params });
      setArchived(response.data.archived || []);
    } catch (error) {
      console.error('Failed to load archived:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/library/archived/stats/${authorId}`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'telegram': return <Send className="w-4 h-4" />;
      case 'twitter': return <Twitter className="w-4 h-4" />;
      default: return <Radio className="w-4 h-4" />;
    }
  };

  const getPlatformColor = (platform) => {
    switch(platform) {
      case 'telegram': return 'bg-blue-100 text-blue-700';
      case 'twitter': return 'bg-sky-100 text-sky-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-full text-purple-700 text-sm font-medium mb-6">
            <Archive className="w-4 h-4" />
            Archived Podcasts
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Podcast <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Archive</span>
          </h1>
          <p className="text-gray-600">
            Єдина бібліотека всіх записаних подкастів з Telegram, Twitter та платформи
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="text-2xl font-bold text-gray-900">{stats.total_archived}</div>
              <div className="text-sm text-gray-600">Total Archived</div>
            </div>
            {stats.by_platform?.map((platform) => (
              <div key={platform._id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-2xl font-bold text-gray-900">{platform.count}</div>
                <div className="text-sm text-gray-600 capitalize">{platform._id}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-8">
          {['all', 'telegram', 'twitter', 'platform'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filter === f
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Archived List */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        ) : archived.length === 0 ? (
          <div className="text-center py-32">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No archived podcasts yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archived.map((item) => (
              <Link
                key={item.id}
                to={`/podcast/${item.podcast_id}`}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:border-emerald-300 hover:shadow-lg transition-all"
              >
                {/* Platform Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(item.original_platform)}`}>
                    {getPlatformIcon(item.original_platform)}
                    {item.original_platform}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(item.file_size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>

                {/* Podcast Info */}
                {item.podcast && (
                  <>
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                      {item.podcast.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {item.podcast.description || 'No description'}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.archived_at).toLocaleDateString()}
                      </div>
                      {item.podcast.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(item.podcast.duration / 60)}m
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
