import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mic, Clock, Square } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const CurrentSpeaker = ({ sessionId, currentUserId, isModerator, onSpeechEnd }) => {
  const [speaker, setSpeaker] = useState(null);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchCurrentSpeaker();
      const interval = setInterval(fetchCurrentSpeaker, 3000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  useEffect(() => {
    if (speaker?.speech_started_at) {
      const timer = setInterval(() => {
        const start = new Date(speaker.speech_started_at);
        const now = new Date();
        setDuration(Math.floor((now - start) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [speaker?.speech_started_at]);

  const fetchCurrentSpeaker = async () => {
    try {
      const res = await axios.get(`${API}/live/${sessionId}/current-speaker`);
      setSpeaker(res.data?.current_speaker);
    } catch (error) {
      console.log('Speaker fetch error:', error.message);
    }
  };

  const endSpeech = async () => {
    if (!speaker?.hand_raise_id || !isModerator) return;
    setLoading(true);
    try {
      await axios.post(`${API}/live/${sessionId}/end-speech?hand_raise_id=${speaker.hand_raise_id}&moderator_id=${currentUserId}`);
      onSpeechEnd?.(speaker);
      setSpeaker(null);
    } catch (error) {
      console.error('End speech error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!speaker) return null;

  return (
    <div className="bg-gray-900 text-white rounded-lg p-4" data-testid="current-speaker">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={speaker.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=374151&color=fff`}
            alt={speaker.name}
            className="w-14 h-14 rounded-full border-2 border-green-500"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Mic className="w-3 h-3 text-white" />
          </div>
        </div>
        
        <div className="flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Speaking Now</p>
          <p className="font-semibold text-lg">{speaker.name}</p>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatTime(duration)}</span>
            <span className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">L{speaker.level}</span>
          </div>
        </div>
        
        {isModerator && (
          <button
            onClick={endSpeech}
            disabled={loading}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
            data-testid="end-speech-btn"
          >
            <Square className="w-4 h-4" />
            End
          </button>
        )}
      </div>
    </div>
  );
};
