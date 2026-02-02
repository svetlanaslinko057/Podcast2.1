import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Radio, Youtube, MessageCircle, Twitch, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const MultiPlatformStream = ({ podcastId }) => {
  const [platforms, setPlatforms] = useState([
    { id: 'telegram', name: 'Telegram Voice Chat', icon: MessageCircle, enabled: true, connected: true },
    { id: 'youtube', name: 'YouTube Live', icon: Youtube, enabled: false, connected: false },
    { id: 'twitch', name: 'Twitch', icon: Twitch, enabled: false, connected: false },
  ]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  
  const togglePlatform = (platformId) => {
    setPlatforms(platforms.map(p => 
      p.id === platformId ? {...p, enabled: !p.enabled} : p
    ));
  };
  
  const startMultiStream = () => {
    const enabled = platforms.filter(p => p.enabled);
    if (enabled.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }
    
    setIsStreaming(true);
    toast.success(`Broadcasting started on ${enabled.length} platforms!`);
  };
  
  const stopMultiStream = () => {
    setIsStreaming(false);
    toast.info('Broadcast stopped');
  };
  
  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6" data-testid="multi-platform-stream">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Radio className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Multi-platform Stream</h3>
          <p className="text-sm text-gray-500">Broadcast to multiple platforms</p>
        </div>
      </div>
      
      {/* Platforms List */}
      <div className="space-y-3 mb-6">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <div
              key={platform.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                platform.enabled
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={platform.enabled}
                  onCheckedChange={() => togglePlatform(platform.id)}
                  className="border-gray-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  data-testid={`platform-${platform.id}`}
                />
                <Icon className={`w-5 h-5 ${
                  platform.enabled ? 'text-emerald-600' : 'text-gray-400'
                }`} />
                <span className={`font-medium ${platform.enabled ? 'text-gray-900' : 'text-gray-600'}`}>{platform.name}</span>
              </div>
              
              {platform.connected ? (
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200 rounded-lg"
                >
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Control Button */}
      {isStreaming ? (
        <Button
          onClick={stopMultiStream}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-3"
          data-testid="stop-stream-button"
        >
          Stop Broadcast
        </Button>
      ) : (
        <Button
          onClick={startMultiStream}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl py-3"
          data-testid="start-stream-button"
        >
          <Radio className="w-4 h-4 mr-2" />
          Start Broadcast
        </Button>
      )}
      
      {/* Status */}
      {isStreaming && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          <span className="text-sm text-red-700 font-medium">
            Broadcasting live on {platforms.filter(p => p.enabled).length} platforms
          </span>
        </div>
      )}
    </Card>
  );
};
