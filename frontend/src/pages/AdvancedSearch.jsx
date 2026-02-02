import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, Filter, X, Clock, Eye, Headphones, Heart,
  ChevronDown, Calendar, Tag, User, SlidersHorizontal, Loader2
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
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
import { PodcastCard } from '../components/PodcastCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdvancedSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    authorId: searchParams.get('author_id') || '',
    minDuration: parseInt(searchParams.get('min_duration')) || 0,
    maxDuration: parseInt(searchParams.get('max_duration')) || 7200,
    dateFrom: searchParams.get('date_from') || '',
    dateTo: searchParams.get('date_to') || '',
    sortBy: searchParams.get('sort_by') || 'created_at',
    sortOrder: searchParams.get('sort_order') || 'desc'
  });
  
  // Available filter options
  const [availableTags, setAvailableTags] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  // Load filter options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await axios.get(`${API}/search/filters`);
        setAvailableTags(response.data.tags || []);
      } catch (error) {
        console.error('Failed to load filters:', error);
      }
    };
    loadFilters();
  }, []);

  // Search function
  const performSearch = useCallback(async (resetPage = true) => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      
      if (query) params.append('q', query);
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.authorId) params.append('author_id', filters.authorId);
      if (filters.minDuration > 0) params.append('min_duration', filters.minDuration.toString());
      if (filters.maxDuration < 7200) params.append('max_duration', filters.maxDuration.toString());
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);
      params.append('limit', LIMIT.toString());
      params.append('skip', resetPage ? '0' : (page * LIMIT).toString());
      
      const response = await axios.get(`${API}/search/podcasts?${params.toString()}`);
      
      if (resetPage) {
        setResults(response.data.results);
        setPage(0);
      } else {
        setResults(prev => [...prev, ...response.data.results]);
      }
      
      setTotalResults(response.data.total);
      setHasMore(response.data.has_more);
      
      // Update URL params
      setSearchParams(params);
      
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [query, filters, page, setSearchParams]);

  // Search on mount if URL has params
  useEffect(() => {
    if (searchParams.toString()) {
      performSearch();
    }
  }, []);

  // Get suggestions
  const getSuggestions = async (q) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(q)}`);
      setSuggestions(response.data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  };

  // Handle search input
  const handleSearchInput = (e) => {
    const value = e.target.value;
    setQuery(value);
    getSuggestions(value);
  };

  // Handle search submit
  const handleSearch = (e) => {
    e?.preventDefault();
    setShowSuggestions(false);
    performSearch(true);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'author') {
      navigate(`/author/${suggestion.id}`);
    } else if (suggestion.type === 'tag') {
      setFilters(prev => ({
        ...prev,
        tags: [...new Set([...prev.tags, suggestion.text])]
      }));
      setQuery('');
      performSearch(true);
    } else {
      setQuery(suggestion.text);
      setShowSuggestions(false);
      performSearch(true);
    }
  };

  // Toggle tag filter
  const toggleTag = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      tags: [],
      authorId: '',
      minDuration: 0,
      maxDuration: 7200,
      dateFrom: '',
      dateTo: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    setQuery('');
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Check if any filters are active
  const hasActiveFilters = filters.tags.length > 0 || 
    filters.authorId || 
    filters.minDuration > 0 || 
    filters.maxDuration < 7200 ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="mb-8 pt-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Podcasts
          </h1>
          <p className="text-gray-600">
            Find exactly what you&apos;re looking for
          </p>
        </div>
        
        {/* Search Bar */}
        <Card className="bg-white rounded-2xl p-4 mb-6">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={query}
                  onChange={handleSearchInput}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search by title..."
                  className="pl-12 h-12 text-lg rounded-xl"
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        {suggestion.type === 'podcast' && <Headphones className="w-4 h-4 text-emerald-500" />}
                        {suggestion.type === 'author' && <User className="w-4 h-4 text-blue-500" />}
                        {suggestion.type === 'tag' && <Tag className="w-4 h-4 text-purple-500" />}
                        <span className="flex-1">{suggestion.text}</span>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.type}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button type="submit" className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 rounded-xl">
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
              
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className={`h-12 px-4 rounded-xl ${hasActiveFilters ? 'border-emerald-500 text-emerald-600' : ''}`}
                  >
                    <SlidersHorizontal className="w-5 h-5 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-emerald-500">
                        {filters.tags.length + (filters.minDuration > 0 || filters.maxDuration < 7200 ? 1 : 0) + (filters.dateFrom || filters.dateTo ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center justify-between">
                      <span>Filters</span>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear all
                        </Button>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="space-y-6 mt-6">
                    {/* Sort */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort By
                      </label>
                      <div className="flex gap-2">
                        <Select 
                          value={filters.sortBy} 
                          onValueChange={(v) => setFilters(prev => ({ ...prev, sortBy: v }))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created_at">Newest</SelectItem>
                            <SelectItem value="listens_count">Most Listened</SelectItem>
                            <SelectItem value="views_count">Most Viewed</SelectItem>
                            <SelectItem value="likes_count">Most Liked</SelectItem>
                            <SelectItem value="duration">Duration</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select 
                          value={filters.sortOrder} 
                          onValueChange={(v) => setFilters(prev => ({ ...prev, sortOrder: v }))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Descending</SelectItem>
                            <SelectItem value="asc">Ascending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.slice(0, 15).map((tagObj) => (
                          <Badge
                            key={tagObj.tag}
                            variant={filters.tags.includes(tagObj.tag) ? 'default' : 'outline'}
                            className={`cursor-pointer ${
                              filters.tags.includes(tagObj.tag) 
                                ? 'bg-emerald-500 hover:bg-emerald-600' 
                                : 'hover:bg-gray-100'
                            }`}
                            onClick={() => toggleTag(tagObj.tag)}
                          >
                            {tagObj.tag}
                            <span className="ml-1 text-xs opacity-70">({tagObj.count})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration: {formatDuration(filters.minDuration)} - {formatDuration(filters.maxDuration)}
                      </label>
                      <div className="px-2">
                        <Slider
                          value={[filters.minDuration, filters.maxDuration]}
                          onValueChange={([min, max]) => setFilters(prev => ({ 
                            ...prev, 
                            minDuration: min, 
                            maxDuration: max 
                          }))}
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
                            onClick={() => setFilters(prev => ({ 
                              ...prev, 
                              minDuration: preset.min, 
                              maxDuration: preset.max 
                            }))}
                            className={
                              filters.minDuration === preset.min && filters.maxDuration === preset.max
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Range
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                          className="flex-1"
                        />
                        <span className="self-center text-gray-400">to</span>
                        <Input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    {/* Apply Button */}
                    <Button 
                      onClick={() => {
                        performSearch(true);
                        setShowFilters(false);
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </form>
          
          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {filters.tags.map((tag) => (
                <Badge 
                  key={tag}
                  className="bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              {(filters.minDuration > 0 || filters.maxDuration < 7200) && (
                <Badge className="bg-blue-100 text-blue-700">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDuration(filters.minDuration)} - {formatDuration(filters.maxDuration)}
                </Badge>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <Badge className="bg-purple-100 text-purple-700">
                  <Calendar className="w-3 h-3 mr-1" />
                  {filters.dateFrom || 'Any'} - {filters.dateTo || 'Now'}
                </Badge>
              )}
            </div>
          )}
        </Card>
        
        {/* Results */}
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                {totalResults} results found
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((podcast) => (
                <PodcastCard key={podcast.id} podcast={podcast} />
              ))}
            </div>
            
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPage(prev => prev + 1);
                    performSearch(false);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </>
        ) : query || hasActiveFilters ? (
          <Card className="bg-white rounded-2xl p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </Card>
        ) : (
          <Card className="bg-white rounded-2xl p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Start searching
            </h3>
            <p className="text-gray-600">
              Enter a search term or use filters to find podcasts
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
