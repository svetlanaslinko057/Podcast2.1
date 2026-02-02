import React, { useState } from 'react';
import axios from 'axios';
import { ThumbsUp, Lightbulb, HelpCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SUPPORT_TYPES = [
  { id: 'valuable', label: 'Valuable', icon: ThumbsUp, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { id: 'insightful', label: 'Insightful', icon: Lightbulb, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { id: 'helpful', label: 'Helpful', icon: HelpCircle, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
];

export const SpeechSupportPanel = ({ speechId, speakerName, currentUserId, speakerId, onClose }) => {
  const [supported, setSupported] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSupport = async (supportType) => {
    if (currentUserId === speakerId) {
      toast.error('Cannot support your own speech');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/speeches/${speechId}/support?supporter_id=${currentUserId}&support_type=${supportType}`);
      setSupported(supportType);
      toast.success(`Supported as ${supportType}!`);
      setTimeout(() => onClose?.(), 2000);
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to support';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (supported) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4" data-testid="speech-support-done">
        <div className="flex items-center justify-center gap-2 text-green-600">
          <Check className="w-5 h-5" />
          <span className="font-medium">Thanks for your support!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4" data-testid="speech-support-panel">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">Speech ended</p>
        <p className="font-semibold text-gray-900">Support {speakerName}'s contribution?</p>
      </div>
      
      <div className="flex gap-2 justify-center">
        {SUPPORT_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => handleSupport(type.id)}
              disabled={loading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${type.color}`}
              data-testid={`support-${type.id}`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>
      
      <button
        onClick={onClose}
        className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600"
      >
        Skip
      </button>
    </div>
  );
};
