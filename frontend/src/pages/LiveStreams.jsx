import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Radio, Users, Clock, ArrowLeft, Loader2, 
  Headphones, Calendar, Play
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const LiveStreams = () => {
  const navigate = useNavigate();
  
  const [liveSessions, setLiveSessions] = useState([]);
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/live-sessions/sessions`);
      const sessions = res.data?.sessions || [];
      
      // Filter by status
      const live = sessions.filter(s => s.status === 'live');
      const scheduled = sessions.filter(s => s.status === 'scheduled');
      
      setLiveSessions(live);
      setScheduledSessions(scheduled);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setLiveSessions([]);
      setScheduledSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (session) => {
    navigate(`/live/${session.id}`);
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '0:00';
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatScheduledTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-20 pb-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              Live Streams
            </h1>
            <p className="text-gray-400 mt-1">
              {liveSessions.length > 0 
                ? `${liveSessions.length} active stream${liveSessions.length > 1 ? 's' : ''} right now`
                : 'No active streams at the moment'
              }
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        )}

        {/* Live Sessions */}
        {!loading && liveSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Live Now
            </h2>
            <div className="space-y-4">
              {liveSessions.map((session) => (
                <Card 
                  key={session.id}
                  className="p-4 bg-gray-800 border-gray-700 hover:border-red-500 transition-all cursor-pointer border-l-4 border-l-red-500"
                  onClick={() => handleJoinSession(session)}
                  data-testid={`live-session-${session.id}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <Radio className="w-8 h-8 text-white" />
                      </div>
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs animate-pulse">
                        LIVE
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 truncate">
                        {session.title}
                      </h3>
                      
                      {session.description && (
                        <p className="text-gray-400 text-sm mb-2 line-clamp-1">
                          {session.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {session.participants_count || 0} listening
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(session.started_at)}
                        </span>
                      </div>
                    </div>

                    {/* Join button */}
                    <Button 
                      className="bg-red-500 hover:bg-red-600 text-white shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinSession(session);
                      }}
                    >
                      <Headphones className="w-4 h-4 mr-2" />
                      Join
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Sessions */}
        {!loading && scheduledSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-500" />
              Upcoming
            </h2>
            <div className="space-y-3">
              {scheduledSessions.map((session) => (
                <Card 
                  key={session.id}
                  className="p-4 bg-gray-800 border-gray-700 hover:border-yellow-500 transition-all cursor-pointer"
                  onClick={() => handleJoinSession(session)}
                  data-testid={`scheduled-session-${session.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{session.title}</h3>
                      <p className="text-gray-500 text-sm">
                        {formatScheduledTime(session.scheduled_at || session.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                      Scheduled
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && liveSessions.length === 0 && scheduledSessions.length === 0 && (
          <Card className="p-12 text-center bg-gray-800 border-gray-700">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No Live Streams
            </h2>
            <p className="text-gray-400 mb-6">
              There are no active or scheduled streams at the moment.
            </p>
            <Button
              onClick={() => navigate('/live')}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Go to Live Management
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LiveStreams;
