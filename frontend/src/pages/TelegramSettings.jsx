import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { 
  Send, CheckCircle, AlertCircle, Loader2, 
  User as UserIcon, Bell, BellOff, Settings2
} from 'lucide-react';
import { TelegramConnect } from '../components/TelegramConnect';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const TelegramSettings = () => {
  const authorId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : 'demo-author-123';
  
  const [loading, setLoading] = useState(true);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [showConnect, setShowConnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  
  // Notification settings
  const [notifySettings, setNotifySettings] = useState({
    new_episodes: true,
    live_streams: true,
    new_followers: true,
    comments: true,
    mentions: true
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchTelegramStatus();
  }, []);

  const fetchTelegramStatus = async () => {
    try {
      const response = await axios.get(`${API}/telegram/personal-status/${authorId}`);
      setTelegramStatus(response.data);
      
      // If connected, also try to get notification settings
      if (response.data?.connected) {
        try {
          const settingsRes = await axios.get(`${API}/telegram-subscriptions/connection/${authorId}`);
          if (settingsRes.data?.connection) {
            setNotifySettings({
              new_episodes: settingsRes.data.connection.notify_new_episodes ?? true,
              live_streams: settingsRes.data.connection.notify_live_streams ?? true,
              new_followers: true,
              comments: true,
              mentions: true
            });
          }
        } catch (e) {
          // Settings not found, use defaults
        }
      }
    } catch (error) {
      console.error('Failed to fetch Telegram status:', error);
      setTelegramStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      const formData = new FormData();
      formData.append('author_id', authorId);
      
      await axios.post(`${API}/telegram/disconnect-personal`, formData);
      toast.success('Telegram отключён');
      setTelegramStatus({ connected: false });
    } catch (error) {
      toast.error('Не удалось отключить Telegram');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleNotification = async (type, value) => {
    const newSettings = { ...notifySettings, [type]: value };
    setNotifySettings(newSettings);
    
    // Save to backend
    try {
      setSavingSettings(true);
      const formData = new FormData();
      
      if (type === 'new_episodes') {
        formData.append('notify_new_episodes', value.toString());
      }
      if (type === 'live_streams') {
        formData.append('notify_live_streams', value.toString());
      }
      
      await axios.put(
        `${API}/telegram-subscriptions/connection/${authorId}/settings`,
        formData
      );
    } catch (error) {
      // Revert on error
      setNotifySettings(notifySettings);
      toast.error('Не удалось сохранить настройки');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTestMessage = async () => {
    try {
      const response = await axios.post(`${API}/telegram/send-personal-alert`, new URLSearchParams({
        author_id: authorId,
        alert_type: 'test',
        message: '✅ Тестовое сообщение от FOMO Podcasts!\n\nВаши уведомления работают.',
        bot_token: '8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E'
      }));
      
      if (response.data.success) {
        toast.success('Тестовое сообщение отправлено!', {
          description: 'Проверьте Telegram'
        });
      }
    } catch (error) {
      toast.error('Не удалось отправить сообщение', {
        description: error.response?.data?.detail || 'Попробуйте позже'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="telegram-settings-loading">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-testid="telegram-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Send className="w-8 h-8 text-blue-500" />
            Telegram Уведомления
          </h1>
          <p className="text-gray-500 mt-1">
            Получайте уведомления о подкастах в Telegram
          </p>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className={`p-6 ${telegramStatus?.connected ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Подключение Telegram
            </h3>
            
            {telegramStatus?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">Подключено</span>
                  <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                    Активно
                  </Badge>
                </div>
                
                {telegramStatus.username && (
                  <p className="text-sm text-gray-700">
                    Аккаунт: <span className="font-mono bg-white px-2 py-1 rounded border">@{telegramStatus.username}</span>
                  </p>
                )}
                
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Уведомления будут приходить в личные сообщения
                </p>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleSendTestMessage}
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-700 hover:bg-green-100"
                    data-testid="send-test-message-btn"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Тест
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    disabled={disconnecting}
                    data-testid="disconnect-telegram-btn"
                  >
                    {disconnecting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Отключение...</>
                    ) : (
                      'Отключить'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <span className="font-medium text-gray-800">Не подключено</span>
                </div>
                <p className="text-sm text-gray-600">
                  Подключите Telegram для получения уведомлений о новых подкастах, live трансляциях и комментариях
                </p>
                <Button
                  onClick={() => setShowConnect(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white mt-2"
                  data-testid="connect-telegram-btn"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Подключить Telegram
                </Button>
              </div>
            )}
          </div>
          
          {/* Telegram Icon */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${telegramStatus?.connected ? 'bg-green-100' : 'bg-blue-100'}`}>
            <Send className={`w-8 h-8 ${telegramStatus?.connected ? 'text-green-600' : 'text-blue-600'}`} />
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      {telegramStatus?.connected && (
        <Card className="p-6" data-testid="notification-settings-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Настройки уведомлений
          </h3>
          
          <div className="space-y-4">
            {/* New Episodes */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  🎙️
                </div>
                <div>
                  <p className="font-medium text-gray-900">Новые выпуски</p>
                  <p className="text-sm text-gray-500">Уведомления о новых подкастах</p>
                </div>
              </div>
              <Switch
                checked={notifySettings.new_episodes}
                onCheckedChange={(checked) => handleToggleNotification('new_episodes', checked)}
                data-testid="toggle-new-episodes"
              />
            </div>

            {/* Live Streams */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  🔴
                </div>
                <div>
                  <p className="font-medium text-gray-900">Live трансляции</p>
                  <p className="text-sm text-gray-500">Уведомления о начале стримов</p>
                </div>
              </div>
              <Switch
                checked={notifySettings.live_streams}
                onCheckedChange={(checked) => handleToggleNotification('live_streams', checked)}
                data-testid="toggle-live-streams"
              />
            </div>

            {/* New Followers */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  👤
                </div>
                <div>
                  <p className="font-medium text-gray-900">Новые подписчики</p>
                  <p className="text-sm text-gray-500">Уведомления о новых подписках</p>
                </div>
              </div>
              <Switch
                checked={notifySettings.new_followers}
                onCheckedChange={(checked) => handleToggleNotification('new_followers', checked)}
                data-testid="toggle-new-followers"
              />
            </div>

            {/* Comments */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  💬
                </div>
                <div>
                  <p className="font-medium text-gray-900">Комментарии</p>
                  <p className="text-sm text-gray-500">Уведомления о новых комментариях</p>
                </div>
              </div>
              <Switch
                checked={notifySettings.comments}
                onCheckedChange={(checked) => handleToggleNotification('comments', checked)}
                data-testid="toggle-comments"
              />
            </div>

            {/* Mentions */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  @
                </div>
                <div>
                  <p className="font-medium text-gray-900">Упоминания</p>
                  <p className="text-sm text-gray-500">Когда вас упоминают в комментариях</p>
                </div>
              </div>
              <Switch
                checked={notifySettings.mentions}
                onCheckedChange={(checked) => handleToggleNotification('mentions', checked)}
                data-testid="toggle-mentions"
              />
            </div>
          </div>

          {savingSettings && (
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Сохранение...
            </div>
          )}
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-6 bg-gray-50 border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Как это работает?
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>1. Подключите свой Telegram аккаунт через кнопку выше</p>
          <p>2. Наш бот <span className="font-mono bg-white px-1.5 py-0.5 rounded border">@Podcast_FOMO_bot</span> будет отправлять вам уведомления</p>
          <p>3. Настройте какие уведомления вы хотите получать</p>
          <p>4. Уведомления будут приходить в личные сообщения бота</p>
        </div>
      </Card>

      {/* Telegram Connect Modal */}
      <TelegramConnect
        isOpen={showConnect}
        onClose={() => setShowConnect(false)}
        authorId={authorId}
        onConnected={(author) => {
          setTelegramStatus({
            connected: true,
            chat_id: author.telegram_chat_id,
            username: author.telegram_username
          });
          setShowConnect(false);
        }}
      />
    </div>
  );
};

export default TelegramSettings;
