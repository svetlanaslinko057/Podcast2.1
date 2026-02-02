import React, { useState } from 'react';
import axios from 'axios';
import { Search, Clock, Play, Loader2, FileText, Sparkles } from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export const TranscriptSearch = ({ 
  podcastId, 
  hasTranscript,
  onSeek,
  onGenerateTranscript 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const searchTranscript = async () => {
    if (!query.trim() || query.length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }
    
    setSearching(true);
    try {
      const res = await axios.get(
        `${API}/api/content/podcasts/${podcastId}/transcript/search`,
        { params: { query, context_words: 30 } }
      );
      setResults(res.data);
      setExpanded(true);
      
      if (res.data.total_matches === 0) {
        toast.info(`No matches found for "${query}"`);
      } else {
        toast.success(`Found ${res.data.total_matches} mention${res.data.total_matches > 1 ? 's' : ''}`);
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const highlightQuery = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
      ) : part
    );
  };

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-500" />
          Transcript Search
        </h3>
        {hasTranscript ? (
          <Badge className="bg-green-100 text-green-700">
            <Sparkles className="w-3 h-3 mr-1" />
            Available
          </Badge>
        ) : (
          <Button 
            size="sm" 
            variant="outline"
            onClick={onGenerateTranscript}
          >
            Generate Transcript
          </Button>
        )}
      </div>

      {hasTranscript ? (
        <>
          {/* Search input */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder='"покажи момент где говорили про Binance"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchTranscript()}
                className="pl-10 bg-gray-50"
              />
            </div>
            <Button 
              onClick={searchTranscript}
              disabled={searching || !query.trim()}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Search suggestions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-gray-500">Try:</span>
            {['Bitcoin', 'Security', 'DeFi', 'безопасность', 'крипто'].map((suggestion) => (
              <Badge
                key={suggestion}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setQuery(suggestion);
                  setTimeout(searchTranscript, 100);
                }}
              >
                {suggestion}
              </Badge>
            ))}
          </div>

          {/* Results */}
          {results && expanded && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {results.total_matches} result{results.total_matches !== 1 ? 's' : ''} for "{results.query}"
                </span>
                {results.total_matches > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setExpanded(false)}
                  >
                    Collapse
                  </Button>
                )}
              </div>
              
              {results.matches.map((match, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all group"
                  onClick={() => {
                    onSeek && onSeek(match.timestamp);
                    toast.success(`Jumping to ${match.formatted_time}`);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Badge 
                      className="bg-cyan-500 text-white font-mono flex-shrink-0"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {match.formatted_time}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        ...{highlightQuery(match.text, results.query)}...
                      </p>
                    </div>
                    <Play className="w-5 h-5 text-gray-400 group-hover:text-cyan-500 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>No transcript available yet</p>
          <p className="text-sm">Generate one to enable search</p>
        </div>
      )}
    </Card>
  );
};

export default TranscriptSearch;
