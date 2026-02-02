import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link2, ExternalLink, Clock, Coins, Building, FileText, Wrench } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const TYPE_CONFIG = {
  token: { icon: Coins, color: 'bg-yellow-100 text-yellow-700', label: 'Token' },
  exchange: { icon: Building, color: 'bg-blue-100 text-blue-700', label: 'Exchange' },
  article: { icon: FileText, color: 'bg-green-100 text-green-700', label: 'Article' },
  tool: { icon: Wrench, color: 'bg-purple-100 text-purple-700', label: 'Tool' },
  project: { icon: Link2, color: 'bg-indigo-100 text-indigo-700', label: 'Project' },
  link: { icon: ExternalLink, color: 'bg-gray-100 text-gray-700', label: 'Link' }
};

export const ResourcesSection = ({ podcastId, onSeek }) => {
  const [resources, setResources] = useState([]);

  const fetchResources = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/content/podcasts/${podcastId}/resources`);
      setResources(res.data);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const trackClick = async (resource) => {
    try {
      await axios.post(`${API}/api/content/resources/${resource.id}/click`);
      window.open(resource.url, '_blank');
    } catch (error) {
      window.open(resource.url, '_blank');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (resources.length === 0) return null;

  // Group by type
  const grouped = resources.reduce((acc, r) => {
    const type = r.type || 'link';
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {});

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
        <Link2 className="w-5 h-5 text-blue-500" />
        Resources & Links ({resources.length})
      </h3>

      <div className="space-y-4">
        {Object.entries(grouped).map(([type, items]) => {
          const config = TYPE_CONFIG[type] || TYPE_CONFIG.link;
          const Icon = config.icon;
          
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={config.color}>
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}s
                </Badge>
                <span className="text-sm text-gray-400">({items.length})</span>
              </div>
              
              <div className="space-y-2">
                {items.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group cursor-pointer"
                    onClick={() => trackClick(resource)}
                  >
                    <span className="text-xl">{resource.icon || '🔗'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate group-hover:text-blue-600">
                        {resource.title}
                      </div>
                      {resource.description && (
                        <p className="text-sm text-gray-500 truncate">{resource.description}</p>
                      )}
                    </div>
                    
                    {resource.timestamp && (
                      <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek && onSeek(resource.timestamp);
                          toast.success(`Jumping to mention at ${formatTime(resource.timestamp)}`);
                        }}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(resource.timestamp)}
                      </Badge>
                    )}
                    
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ResourcesSection;
