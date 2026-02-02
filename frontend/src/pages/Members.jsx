import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, ChevronRight, Trophy, Award, TrendingUp, Layers } from 'lucide-react';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Members = () => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('xp');

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [members, searchQuery, roleFilter, levelFilter, sortBy]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/users`);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...members];

    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(m => m.role === roleFilter);
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter(m => m.level === parseInt(levelFilter));
    }

    filtered.sort((a, b) => {
      if (sortBy === 'xp') return (b.xp_total || 0) - (a.xp_total || 0);
      if (sortBy === 'engagement') return (b.engagement_score || 0) - (a.engagement_score || 0);
      if (sortBy === 'level') return (b.level || 0) - (a.level || 0);
      return 0;
    });

    setFilteredMembers(filtered);
  };

  const getLevelName = (level) => {
    const names = { 1: 'Observer', 2: 'Active', 3: 'Contributor', 4: 'Speaker', 5: 'Core Voice' };
    return names[level] || 'Observer';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20" data-testid="members-loading">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading members...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20" data-testid="members-page">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1" data-testid="members-title">Club Members</h1>
          <p className="text-sm text-gray-500">{filteredMembers.length} members • Sorted by {sortBy === 'xp' ? 'XP (Leaderboard)' : sortBy}</p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                data-testid="members-search"
              />
            </div>
            
            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] h-10 rounded-lg border-gray-200" data-testid="members-role-filter">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
                <SelectItem value="all" className="py-2.5 px-3 cursor-pointer">
                  <span className="font-medium">All Roles</span>
                </SelectItem>
                <SelectItem value="owner" className="py-2.5 px-3 cursor-pointer">Owner</SelectItem>
                <SelectItem value="admin" className="py-2.5 px-3 cursor-pointer">Admin</SelectItem>
                <SelectItem value="moderator" className="py-2.5 px-3 cursor-pointer">Moderator</SelectItem>
                <SelectItem value="speaker" className="py-2.5 px-3 cursor-pointer">Speaker</SelectItem>
                <SelectItem value="listener" className="py-2.5 px-3 cursor-pointer">Listener</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Level Filter */}
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px] h-10 rounded-lg border-gray-200" data-testid="members-level-filter">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
                <SelectItem value="all" className="py-2.5 px-3 cursor-pointer">
                  <span className="font-medium">All Levels</span>
                </SelectItem>
                <SelectItem value="1" className="py-2.5 px-3 cursor-pointer">L1 Observer</SelectItem>
                <SelectItem value="2" className="py-2.5 px-3 cursor-pointer">L2 Active</SelectItem>
                <SelectItem value="3" className="py-2.5 px-3 cursor-pointer">L3 Contributor</SelectItem>
                <SelectItem value="4" className="py-2.5 px-3 cursor-pointer">L4 Speaker</SelectItem>
                <SelectItem value="5" className="py-2.5 px-3 cursor-pointer">L5 Core Voice</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px] h-10 rounded-lg border-gray-200" data-testid="members-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
                <SelectItem value="xp" className="py-2.5 px-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Leaderboard (XP)
                  </div>
                </SelectItem>
                <SelectItem value="engagement" className="py-2.5 px-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    Sort by Engagement
                  </div>
                </SelectItem>
                <SelectItem value="level" className="py-2.5 px-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-400" />
                    Sort by Level
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Members List - Table Style */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" data-testid="members-list">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Member</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Level</div>
            <div className="col-span-2 text-right">XP</div>
            <div className="col-span-1 text-right">Badges</div>
          </div>

          {/* Members Rows */}
          <div className="divide-y divide-gray-100">
            {filteredMembers.map((member, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3 && sortBy === 'xp';
              const isTop10 = rank <= 10 && sortBy === 'xp';
              
              return (
                <Link
                  key={member.id}
                  to={`/author/${member.id}`}
                  className={`block hover:bg-gray-50 transition-colors ${isTop3 ? 'bg-yellow-50/50' : ''}`}
                  data-testid={`member-row-${index}`}
                >
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                    {/* Rank */}
                    <div className="col-span-1 flex justify-center">
                      {sortBy === 'xp' && (
                        isTop3 ? (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            rank === 2 ? 'bg-gray-200 text-gray-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : isTop10 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 font-bold text-xs text-gray-600">
                            {rank}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">#{rank}</span>
                        )
                      )}
                    </div>

                    {/* Member Info */}
                    <div className="col-span-11 md:col-span-4 flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=e5e7eb&color=374151`}
                          alt={member.name}
                          className={`w-10 h-10 rounded-full border ${isTop3 ? 'border-yellow-400 border-2' : 'border-gray-200'}`}
                        />
                        {isTop3 && (
                          <Trophy className={`absolute -top-1 -right-1 w-4 h-4 ${
                            rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : 'text-orange-500'
                          }`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{member.name}</div>
                        <div className="text-xs text-gray-500">@{member.username}</div>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="hidden md:block col-span-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 capitalize">
                        {member.role || 'listener'}
                      </span>
                    </div>

                    {/* Level */}
                    <div className="hidden md:block col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded bg-gray-800 text-white">
                          {member.level || 1}
                        </span>
                        <span className="text-sm text-gray-600">{getLevelName(member.level || 1)}</span>
                      </div>
                    </div>

                    {/* XP */}
                    <div className="hidden md:block col-span-2 text-right">
                      <span className={`font-semibold ${isTop10 ? 'text-gray-900' : 'text-gray-700'}`}>
                        {(member.xp_total || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">XP</span>
                    </div>

                    {/* Badges */}
                    <div className="hidden md:flex col-span-1 justify-end items-center gap-1">
                      {member.badges && member.badges.length > 0 ? (
                        <>
                          {member.badges.slice(0, 2).map((badge, idx) => (
                            <span key={idx} className="text-sm" title={badge.name}>{badge.icon}</span>
                          ))}
                          {member.badges.length > 2 && (
                            <span className="text-xs text-gray-400">+{member.badges.length - 2}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />
                    </div>

                    {/* Mobile Stats */}
                    <div className="col-span-12 md:hidden flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize">{member.role || 'listener'}</span>
                        <span>L{member.level || 1}</span>
                        {member.badges?.length > 0 && (
                          <span>{member.badges.slice(0, 3).map(b => b.icon).join('')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-900">{member.xp_total || 0} XP</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {filteredMembers.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center" data-testid="members-empty">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No members found</h3>
            <p className="text-sm text-gray-500">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};