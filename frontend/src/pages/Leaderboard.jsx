import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('xp');

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/xp/leaderboard?limit=50&sort_by=${sortBy}`);
      setLeaderboard(response.data?.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20" data-testid="leaderboard-loading">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading leaderboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20" data-testid="leaderboard-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1" data-testid="leaderboard-title">Leaderboard</h1>
          <p className="text-sm text-gray-500">Top performers in the club</p>
        </div>

        {/* Sort Options */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('xp')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sortBy === 'xp'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="sort-by-xp"
            >
              By XP
            </button>
            <button
              onClick={() => setSortBy('engagement')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sortBy === 'engagement'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="sort-by-engagement"
            >
              By Engagement
            </button>
            <button
              onClick={() => setSortBy('speeches')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                sortBy === 'speeches'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="sort-by-speeches"
            >
              By Speeches
            </button>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" data-testid="leaderboard-list">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Member</div>
            <div className="col-span-2">Level</div>
            <div className="col-span-2 text-right">XP</div>
            <div className="col-span-2 text-right">Engagement</div>
            <div className="col-span-1 text-right">Badges</div>
          </div>

          {/* Leaderboard Rows */}
          <div className="divide-y divide-gray-100">
            {leaderboard.map((entry, index) => (
              <Link
                key={entry.user_id}
                to={`/author/${entry.user_id}`}
                className="block hover:bg-gray-50 transition-colors"
                data-testid={`leaderboard-row-${index}`}
              >
                <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                  {/* Rank */}
                  <div className="col-span-1 flex justify-center">
                    {entry.rank <= 3 ? (
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {entry.rank}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-500">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="col-span-11 md:col-span-4 flex items-center gap-3">
                    <img
                      src={entry.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=e5e7eb&color=374151`}
                      alt={entry.name}
                      className="w-10 h-10 rounded-full border border-gray-200"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{entry.name}</div>
                      <div className="text-xs text-gray-500">@{entry.username}</div>
                    </div>
                  </div>

                  {/* Level */}
                  <div className="hidden md:block col-span-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded bg-gray-800 text-white">
                      {entry.level}
                    </span>
                  </div>

                  {/* XP */}
                  <div className="hidden md:block col-span-2 text-right">
                    <span className="font-semibold text-gray-900">{(entry.xp_total || 0).toLocaleString()}</span>
                  </div>

                  {/* Engagement */}
                  <div className="hidden md:block col-span-2 text-right">
                    <span className="font-semibold text-gray-900">{(entry.engagement_score || 0).toFixed(1)}</span>
                  </div>

                  {/* Badges */}
                  <div className="hidden md:flex col-span-1 justify-end items-center gap-2">
                    <span className="font-semibold text-gray-900">{entry.badges_count || 0}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Mobile Stats Row */}
                <div className="md:hidden px-4 pb-3 flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-2 mt-1">
                  <div className="flex items-center gap-3">
                    <span>L{entry.level}</span>
                    <span>{entry.badges_count || 0} badges</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{entry.xp_total || 0} XP</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {leaderboard.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center" data-testid="leaderboard-empty">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No data yet</h3>
            <p className="text-sm text-gray-500">Start participating to appear on the leaderboard</p>
          </div>
        )}
      </div>
    </div>
  );
};
