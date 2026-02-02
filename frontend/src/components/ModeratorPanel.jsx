import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Shield, Volume2, VolumeX, Ban, UserX, AlertTriangle, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';

export const ModeratorPanel = ({ podcastId, isAuthor }) => {
  const [listeners, setListeners] = useState([
    { id: 1, username: 'user_123', isMuted: false },
    { id: 2, username: 'user_456', isMuted: false },
    { id: 3, username: 'user_789', isMuted: false },
  ]);
  
  if (!isAuthor) return null;
  
  const muteUser = (userId) => {
    setListeners(listeners.map(l => 
      l.id === userId ? {...l, isMuted: !l.isMuted} : l
    ));
    toast.success('User muted/unmuted');
  };
  
  const kickUser = (userId) => {
    setListeners(listeners.filter(l => l.id !== userId));
    toast.success('User kicked');
  };
  
  const banUser = (userId) => {
    toast.error('User banned');
  };
  
  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6" data-testid="moderator-panel">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Moderator Panel</h3>
          <p className="text-sm text-gray-500">{listeners.length} listeners</p>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
          <Zap className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-gray-700 font-medium">Quick Actions</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-gray-700 font-medium">Reports: 0</span>
        </div>
      </div>
      
      {/* Listeners List */}
      <div className="space-y-3">
        {listeners.map((listener) => (
          <div key={listener.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">{listener.username[0].toUpperCase()}</span>
              </div>
              <span className="text-sm text-gray-900 font-medium">{listener.username}</span>
              {listener.isMuted && (
                <VolumeX className="w-4 h-4 text-red-500" />
              )}
            </div>
            
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => muteUser(listener.id)}
                className="h-8 w-8 hover:bg-gray-100 rounded-lg"
                data-testid={`mute-user-${listener.id}`}
              >
                {listener.isMuted ? (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => kickUser(listener.id)}
                className="h-8 w-8 hover:bg-red-50 rounded-lg"
                data-testid={`kick-user-${listener.id}`}
              >
                <UserX className="w-4 h-4 text-red-500" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => banUser(listener.id)}
                className="h-8 w-8 hover:bg-red-100 rounded-lg"
                data-testid={`ban-user-${listener.id}`}
              >
                <Ban className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
