import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, Info, Clock, ExternalLink, FileCheck } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const FACT_CONFIG = {
  fact: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Verified Fact' },
  clarification: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Clarification' },
  correction: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Correction' },
  note: { icon: FileCheck, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Note' }
};

export const FactsSection = ({ podcastId, onSeek }) => {
  const [facts, setFacts] = useState([]);

  const fetchFacts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/content/podcasts/${podcastId}/facts`);
      setFacts(res.data);
    } catch (error) {
      console.error('Failed to fetch facts:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchFacts();
  }, [fetchFacts]);

  const formatTime = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (facts.length === 0) return null;

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
        <FileCheck className="w-5 h-5 text-green-500" />
        Fact Check & Notes ({facts.length})
      </h3>

      <div className="space-y-3">
        {facts.map((fact) => {
          const config = FACT_CONFIG[fact.type] || FACT_CONFIG.note;
          const Icon = config.icon;
          
          return (
            <div
              key={fact.id}
              className={`${config.bg} rounded-xl p-4 border border-${config.color.replace('text-', '')}/20`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {config.label}
                    </Badge>
                    {fact.verified && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {fact.timestamp && (
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          onSeek && onSeek(fact.timestamp);
                          toast.success(`Jumping to ${formatTime(fact.timestamp)}`);
                        }}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(fact.timestamp)}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-800">{fact.text}</p>
                  
                  {fact.source && (
                    <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                      <span>Source:</span>
                      {fact.source_url ? (
                        <a 
                          href={fact.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          {fact.source}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span>{fact.source}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default FactsSection;
