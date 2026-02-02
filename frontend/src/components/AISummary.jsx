import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Brain, Loader2, Sparkles, Clock, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AISummary = ({ podcastId, transcript }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [keyPoints, setKeyPoints] = useState([]);
  
  const generateSummary = async () => {
    if (!transcript) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/podcasts/${podcastId}/ai-summary`);
      setSummary(response.data.summary);
      setKeyPoints(response.data.key_points || []);
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="glass-card p-6" data-testid="ai-summary">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-white">AI Summary</h3>
        </div>
        {!summary && (
          <Button
            onClick={generateSummary}
            disabled={loading || !transcript}
            className="fomo-button"
            data-testid="generate-summary-button"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Генерація...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Згенерувати
            </>)}
          </Button>
        )}
      </div>
      
      {summary ? (
        <div>
          {/* Summary Text */}
          <div className="bg-[#0F0F0F] border border-[#00FF00]/20 rounded-2xl p-4 mb-4">
            <p className="text-gray-300 leading-relaxed">{summary}</p>
          </div>
          
          {/* Key Points */}
          {keyPoints.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Ключові моменти
              </h4>
              <ul className="space-y-2">
                {keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-900/20 border border-[#00FF00]/40 flex items-center justify-center text-emerald-600 text-xs font-bold flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-gray-300 text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Timestamp */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            Згенеровано AI
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {transcript 
              ? 'Натисніть "Generate" для AI резюме' 
              : 'Transcript unavailable'}
          </p>
        </div>
      )}
    </Card>
  );
};