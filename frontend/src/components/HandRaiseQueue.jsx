import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Hand, Check, X, Clock, ChevronRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const HandRaiseQueue = ({ sessionId, currentUserId, isModerator, onSpeakerApproved }) => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const fetchQueue = async () => {
    try {
      const res = await axios.get(`${API}/live/${sessionId}/hand-raise-queue`);
      setQueue(res.data?.queue || []);
    } catch (error) {
      console.log('Queue fetch error:', error.message);
    }
  };

  const approveSpeaker = async (handRaiseId) => {
    if (!isModerator) return;
    setLoading(true);
    try {
      await axios.post(`${API}/live/${sessionId}/approve-speaker?hand_raise_id=${handRaiseId}&moderator_id=${currentUserId}`);
      fetchQueue();
      onSpeakerApproved?.();
    } catch (error) {
      console.error('Approve error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (queue.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg" data-testid="hand-raise-queue">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hand className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-gray-900 text-sm">Speaker Queue</span>
        </div>
        <span className="text-xs text-gray-500">{queue.length} waiting</span>
      </div>
      
      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
        {queue.map((item, index) => (
          <div 
            key={item.hand_raise_id}
            className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
            data-testid={`queue-item-${index}`}
          >
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
              {item.queue_position}
            </span>
            
            <img
              src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=e5e7eb&color=374151`}
              alt={item.name}
              className="w-8 h-8 rounded-full border border-gray-200"
            />
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                L{item.level}
              </div>
            </div>
            
            {isModerator && (
              <button
                onClick={() => approveSpeaker(item.hand_raise_id)}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
                data-testid={`approve-btn-${index}`}
              >
                <Check className="w-3 h-3 inline mr-1" />
                Approve
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
