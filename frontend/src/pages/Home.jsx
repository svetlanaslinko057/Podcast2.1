import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Loader2, Users, Radio, Play, Mic, ChevronRight, ChevronLeft, X, 
  Search, SlidersHorizontal, Filter, Clock, Award, Zap, MessageSquare, Calendar
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { PodcastCard } from '../components/PodcastCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Format duration helper
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Horizontal Scroll Row Component
const HorizontalScrollRow = ({ title, tag, podcasts, onPodcastClick }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    checkScroll();
  }, [podcasts]);

  if (!podcasts || podcasts.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            {podcasts.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`p-2 rounded-full border transition-all ${
              canScrollLeft 
                ? 'border-gray-300 hover:bg-gray-100 text-gray-700' 
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`p-2 rounded-full border transition-all ${
              canScrollRight 
                ? 'border-gray-300 hover:bg-gray-100 text-gray-700' 
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {podcasts.map((podcast) => (
          <div key={podcast.id} className="flex-shrink-0 w-[260px]">
            <PodcastCard 
              podcast={podcast} 
              onClick={() => onPodcastClick(podcast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Live Notification Banner
const LiveNotification = ({ sessions, onClose }) => {
  if (!sessions || sessions.length === 0) return null;
  
  return (
    <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-3 rounded-lg mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 animate-pulse" />
          <span className="font-semibold">🔴 Live Now!</span>
          <span className="text-white/90">
            {sessions.length === 1 
              ? `"${sessions[0].title}" is streaming now!` 
              : `${sessions.length} streams are live!`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to={sessions.length === 1 ? `/live/${sessions[0].id}` : '/lives'}>
            <Button size="sm" variant="secondary" className="bg-white text-red-600 hover:bg-gray-100">
              Join Now
            </Button>
          </Link>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Home = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [clubStats, setClubStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [clubSettings, setClubSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLiveNotification, setShowLiveNotification] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTags, setSelectedTags] = useState([]);
  const [minDuration, setMinDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState(7200);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const [settingsRes, statsRes, leaderboardRes, podcastsRes, sessionsRes] = await Promise.all([
        axios.get(`${API}/club/settings`),
        axios.get(`${API}/club/stats`),
        axios.get(`${API}/xp/leaderboard?limit=5`),
        axios.get(`${API}/podcasts`),
        axios.get(`${API}/live-sessions/sessions`).catch(() => ({ data: { sessions: [] } }))
      ]);

      setClubSettings(settingsRes.data);
      setClubStats(statsRes.data);
      setLeaderboard(leaderboardRes.data?.leaderboard || []);
      setPodcasts(podcastsRes.data || []);
      
      const activeSessions = (sessionsRes.data?.sessions || []).filter(s => s.status === 'live');
      setLiveSessions(activeSessions);
    } catch (error) {
      console.error('Failed to fetch home data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all unique categories (from category field or first tag as fallback)
  const allCategories = useMemo(() => {
    const categories = new Set();
    podcasts.forEach(p => {
      if (p.category) {
        categories.add(p.category);
      } else if (p.tags && p.tags.length > 0) {
        // Use first tag as category fallback
        categories.add(p.tags[0]);
      }
    });
    return Array.from(categories).sort();
  }, [podcasts]);

  // Check if filters are active
  const hasActiveFilters = searchQuery || selectedTags.length > 0 || 
    minDuration > 0 || maxDuration < 7200 || dateFrom || dateTo;

  // Filter podcasts
  const filteredPodcasts = useMemo(() => {
    let result = [...podcasts];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Categories filter (using selectedTags state for categories)
    if (selectedTags.length > 0) {
      result = result.filter(p => {
        const podcastCategory = p.category || (p.tags && p.tags[0]) || '';
        return selectedTags.includes(podcastCategory);
      });
    }
    
    // Duration filter
    if (minDuration > 0 || maxDuration < 7200) {
      result = result.filter(p => {
        const dur = p.duration || 0;
        return dur >= minDuration && dur <= maxDuration;
      });
    }
    
    // Date filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(p => new Date(p.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      result = result.filter(p => new Date(p.created_at) <= to);
    }
    
    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'duration':
          comparison = (a.duration || 0) - (b.duration || 0);
          break;
        case 'listens_count':
        case 'popular':
          comparison = (a.views_count || a.listens || 0) - (b.views_count || b.listens || 0);
          break;
        case 'views_count':
          comparison = (a.views_count || 0) - (b.views_count || 0);
          break;
        case 'likes_count':
          comparison = (a.likes_count || 0) - (b.likes_count || 0);
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at) - new Date(b.created_at);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return result;
  }, [podcasts, searchQuery, sortBy, sortOrder, selectedTags, minDuration, maxDuration, dateFrom, dateTo]);

  // Group podcasts by categories
  const podcastsByCategory = useMemo(() => {
    const groups = {};
    
    // First, add "All Episodes" with all filtered podcasts
    if (filteredPodcasts.length > 0 && !searchQuery && selectedTags.length === 0) {
      groups['All Episodes'] = filteredPodcasts.slice(0, 10);
    }
    
    // Then group by each category
    allCategories.forEach(category => {
      const categoryPodcasts = filteredPodcasts.filter(p => {
        const podcastCategory = p.category || (p.tags && p.tags[0]) || '';
        return podcastCategory === category;
      });
      if (categoryPodcasts.length > 0) {
        groups[category] = categoryPodcasts;
      }
    });
    
    return groups;
  }, [filteredPodcasts, allCategories, searchQuery, selectedTags]);

  const toggleCategory = (category) => {
    setSelectedTags(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSortBy('created_at');
    setSortOrder('desc');
    setMinDuration(0);
    setMaxDuration(7200);
    setDateFrom('');
    setDateTo('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Live Notification */}
        {showLiveNotification && liveSessions.length > 0 && (
          <LiveNotification 
            sessions={liveSessions} 
            onClose={() => setShowLiveNotification(false)} 
          />
        )}

        {/* Header with Stats */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {clubSettings?.club_name || 'FOMO Voice Club'}
              </h1>
              <p className="text-gray-500">
                {clubSettings?.club_description || 'Private podcast club with reputation economy'}
              </p>
            </div>
            
            {/* Compact Stats + Top Members */}
            <div className="flex flex-wrap items-center gap-4">
              {clubStats && (
                <>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-gray-900">{clubStats.total_members}</span>
                    <span className="text-sm text-gray-500">members</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-gray-900">{clubStats.total_xp_earned?.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">XP</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                    <Mic className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-gray-900">{clubStats.total_speeches}</span>
                    <span className="text-sm text-gray-500">speeches</span>
                  </div>
                </>
              )}
              
              {/* Top 3 Members */}
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                <Award className="w-4 h-4 text-yellow-500" />
                <div className="flex -space-x-2">
                  {leaderboard.slice(0, 3).map((entry, idx) => (
                    <Link key={entry.user_id} to={`/author/${entry.user_id}`}>
                      <img
                        src={entry.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=e5e7eb&color=374151`}
                        alt={entry.name}
                        title={`${entry.name} - ${entry.xp_total} XP`}
                        className="w-8 h-8 rounded-full border-2 border-white hover:scale-110 transition-transform"
                      />
                    </Link>
                  ))}
                </div>
                <Link to="/leaderboard" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Top →
                </Link>
              </div>
            </div>
          </div>

          {/* Search, Sort, Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search podcasts..."
                className="pl-10 h-10 text-sm rounded-lg border-gray-200 bg-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] h-10 rounded-lg bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Newest</SelectItem>
                <SelectItem value="listens_count">Most Listened</SelectItem>
                <SelectItem value="views_count">Most Viewed</SelectItem>
                <SelectItem value="likes_count">Most Liked</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Button */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`h-10 px-4 rounded-lg ${hasActiveFilters ? 'border-emerald-500 text-emerald-600' : ''}`}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge className="ml-2 bg-emerald-500 text-xs">
                      {selectedTags.length + (minDuration > 0 || maxDuration < 7200 ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              
              <SheetContent className="w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    <span>Filters</span>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear All
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* Categories */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {allCategories.map(category => (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            selectedTags.includes(category)
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Duration: {formatDuration(minDuration)} - {formatDuration(maxDuration)}
                    </h4>
                    <div className="px-2">
                      <Slider
                        value={[minDuration, maxDuration]}
                        onValueChange={([min, max]) => {
                          setMinDuration(min);
                          setMaxDuration(max);
                        }}
                        min={0}
                        max={7200}
                        step={300}
                        className="my-4"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[
                        { label: '< 15m', min: 0, max: 900 },
                        { label: '15-30m', min: 900, max: 1800 },
                        { label: '30-60m', min: 1800, max: 3600 },
                        { label: '> 60m', min: 3600, max: 7200 }
                      ].map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMinDuration(preset.min);
                            setMaxDuration(preset.max);
                          }}
                          className={
                            minDuration === preset.min && maxDuration === preset.max
                              ? 'border-emerald-500 text-emerald-600'
                              : ''
                          }
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Date Range</h4>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-gray-400">to</span>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => setShowFilters(false)}
                  >
                    Apply Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Found: {filteredPodcasts.length}</span>
              {searchQuery && (
                <Badge 
                  variant="secondary" 
                  className="bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                  onClick={() => setSearchQuery('')}
                >
                  "{searchQuery}" <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              {selectedTags.map(tag => (
                <Badge 
                  key={tag}
                  variant="secondary" 
                  className="bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                  onClick={() => toggleTag(tag)}
                >
                  {tag.charAt(0).toUpperCase() + tag.slice(1)} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              {(minDuration > 0 || maxDuration < 7200) && (
                <Badge 
                  variant="secondary" 
                  className="bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                  onClick={() => { setMinDuration(0); setMaxDuration(7200); }}
                >
                  {formatDuration(minDuration)} - {formatDuration(maxDuration)} <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              {(dateFrom || dateTo) && (
                <Badge 
                  variant="secondary" 
                  className="bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                >
                  {dateFrom || '...'} → {dateTo || '...'} <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Podcasts by Tags - Horizontal Scroll Rows */}
        <div className="space-y-2">
          {hasActiveFilters ? (
            // Search/Filter results - single row
            filteredPodcasts.length > 0 ? (
              <HorizontalScrollRow
                title="Search Results"
                podcasts={filteredPodcasts}
                onPodcastClick={(id) => navigate(`/podcast/${id}`)}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )
          ) : (
            // Grouped by categories
            Object.entries(podcastsByCategory).map(([categoryName, categoryPodcasts]) => (
              <HorizontalScrollRow
                key={categoryName}
                title={categoryName === 'All Episodes' ? '🎙️ All Episodes' : categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
                tag={categoryName}
                podcasts={categoryPodcasts}
                onPodcastClick={(id) => navigate(`/podcast/${id}`)}
              />
            ))
          )}

          {/* Empty state */}
          {podcasts.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <Mic className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">No podcasts yet</h3>
              <p className="text-gray-500">New episodes will appear here soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
