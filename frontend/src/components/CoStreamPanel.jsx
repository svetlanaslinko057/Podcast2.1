import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Radio, MessageCircle, Users, Clock, Send, X, 
  Play, Square, RefreshCw, ChevronDown, ChevronUp, Bot, Settings
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const CoStreamPanel = ({ 
  podcastId, 
  authorId, 
  title, 
  platformUrl,
  onStatusChange 
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [bots, setBots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [isActive, setIsActive] = useState(false);
  
  // Load available bots
  useEffect(() => {
    const fetchBots = async () => {
      try {
        const response = await axios.get(`${API}/telegram-bots/user/${authorId}`);
        const activeBots = response.data.filter(bot => bot.is_active);
        setBots(activeBots);
        
        // Auto-select first bot with auto_notify_live_start
        const autoBot = activeBots.find(b => b.auto_notify_live_start);
        if (autoBot) {
          setSelectedBotId(autoBot.id);
        } else if (activeBots.length > 0) {
          setSelectedBotId(activeBots[0].id);
        }
      } catch (error) {
        console.error('Failed to load bots:', error);
      }
    };
    
    if (authorId) {
      fetchBots();
    }
  }, [authorId]);
  
  // Check co-stream status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API}/costream/status/${podcastId}`);
        setIsActive(response.data.is_active);
        setSession(response.data.session);
        
        if (onStatusChange) {
          onStatusChange(response.data.is_active);
        }
      } catch (error) {
        console.error('Failed to check co-stream status:', error);
      }
    };
    
    if (podcastId) {
      checkStatus();
      
      // Poll status every 30 seconds
      const interval = setInterval(checkStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [podcastId, onStatusChange]);
  
  const handleStartCostream = async () => {
    if (!selectedBotId) {
      toast.error('Select Telegram bot');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API}/costream/start`, {
        podcast_id: podcastId,
        author_id: authorId,
        bot_id: selectedBotId,
        title: title,
        description: 'Live broadcast on FOMO Podcasts platform',
        platform_url: platformUrl || window.location.href
      });
      
      if (response.data.success) {
        setIsActive(true);
        setSession(response.data.session);
        toast.success('Co-streaming started!');
        
        if (onStatusChange) {
          onStatusChange(true);
        }
        
        // Refresh status
        const statusRes = await axios.get(`${API}/costream/status/${podcastId}`);
        setSession(statusRes.data.session);
      }
    } catch (error) {
      console.error('Failed to start co-stream:', error);
      toast.error(error.response?.data?.detail || 'Failed to start co-streaming');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStopCostream = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API}/costream/stop/${podcastId}`);
      
      if (response.data.success) {
        setIsActive(false);
        setSession(null);
        toast.success(`Co-streaming stopped. Forwarded ${response.data.messages_forwarded} messages`);
        
        if (onStatusChange) {
          onStatusChange(false);
        }
      }
    } catch (error) {
      console.error('Failed to stop co-stream:', error);
      toast.error(error.response?.data?.detail || 'Не удалось остановить co-streaming');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };
  
  if (bots.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Telegram Co-Streaming</p>
            <p className="text-xs text-gray-500">
              Add Telegram bot for channel streaming
            </p>
          </div>
          <Button 
            onClick={() => navigate('/workspace')}
            variant="outline"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={`
      border rounded-xl overflow-hidden transition-all duration-300
      ${isActive 
        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-400' 
        : 'bg-white border-gray-200'
      }
    `}>
      {/* Header */}
      <div 
        className={`
          p-4 cursor-pointer flex items-center justify-between
          ${isActive ? 'text-white' : 'text-gray-900'}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${isActive ? 'bg-white/20' : 'bg-blue-100'}
          `}>
            <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-blue-600'}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          
          <div>
            <p className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
              Telegram Co-Streaming
            </p>
            <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
              {isActive ? 'Active' : 'Duplicate to Telegram channel'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge className="bg-white/20 text-white border-0">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1.5"></div>
              LIVE
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className={`
          p-4 pt-0 space-y-4
          ${isActive ? 'text-white' : ''}
        `}>
          {/* Status when active */}
          {isActive && session && (
            <div className="bg-white/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Время: {formatDuration(session.elapsed_minutes || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>{session.chat_messages_forwarded || 0} сообщ.</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Notifications: {session.notifications_sent || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{session.listener_count || 0} слушат.</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Bot Selection - only when not active */}
          {!isActive && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Telegram bot for streaming
              </label>
              <Select value={selectedBotId} onValueChange={setSelectedBotId}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Выберите бота" />
                </SelectTrigger>
                <SelectContent>
                  {bots.map(bot => (
                    <SelectItem key={bot.id} value={bot.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <span>{bot.name}</span>
                        {bot.auto_notify_live_start && (
                          <Badge variant="secondary" className="text-xs">Авто</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Chat messages will be duplicated to selected channel
              </p>
            </div>
          )}
          
          {/* Action Button */}
          <div className="flex gap-2">
            {isActive ? (
              <Button
                onClick={handleStopCostream}
                disabled={isLoading}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
                data-testid="stop-costream-btn"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleStartCostream}
                disabled={isLoading || !selectedBotId}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="start-costream-btn"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Запустить Co-Stream
              </Button>
            )}
          </div>
          
          {/* Info Text */}
          <div className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
            {isActive ? (
              <>
                ✅ Chat is streaming to Telegram<br/>
                ✅ Уведомления о спикерах отправляются<br/>
                ✅ Периодические обновления каждые 5 мин
              </>
            ) : (
              <>
                При запуске co-streaming:<br/>
                • Сообщения чата будут пересылаться в Telegram<br/>
                • Уведомления о спикерах будут отправляться<br/>
                • Статистика будет обновляться каждые 5 минут
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
