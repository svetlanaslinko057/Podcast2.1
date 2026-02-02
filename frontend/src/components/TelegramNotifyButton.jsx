import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bell, BellRing, BellOff, Settings, Check, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export const TelegramNotifyButton = ({ 
  creatorId, 
  creatorName,
  userId,
  variant = 'default' // 'default' | 'compact' | 'icon'
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [chatId, setChatId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [settings, setSettings] = useState({
    notify_episodes: true,
    notify_live: true
  });

  const checkConnection = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/api/telegram-subscriptions/connection/${userId}`);
      setTelegramConnected(res.data.connected);
    } catch (error) {
      console.error('Failed to check Telegram connection:', error);
    }
  }, [userId]);

  const checkSubscription = useCallback(async () => {
    if (!userId || !creatorId) return;
    try {
      const res = await axios.get(
        `${API}/api/telegram-subscriptions/subscription-status/${userId}/${creatorId}`
      );
      setIsSubscribed(res.data.subscribed);
      if (res.data.subscription) {
        setSubscription(res.data.subscription);
        setSettings({
          notify_episodes: res.data.subscription.notify_episodes,
          notify_live: res.data.subscription.notify_live
        });
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  }, [userId, creatorId]);

  useEffect(() => {
    checkConnection();
    checkSubscription();
  }, [checkConnection, checkSubscription]);

  const connectTelegram = async () => {
    if (!chatId.trim()) {
      toast.error('Введите Chat ID');
      return;
    }
    
    setConnecting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('telegram_chat_id', chatId);
      
      await axios.post(`${API}/api/telegram-subscriptions/connect`, formData);
      toast.success('Telegram подключен!');
      setTelegramConnected(true);
      setShowConnectDialog(false);
      setChatId('');
    } catch (error) {
      toast.error('Ошибка подключения');
    } finally {
      setConnecting(false);
    }
  };

  const subscribe = async () => {
    if (!telegramConnected) {
      setShowConnectDialog(true);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('creator_id', creatorId);
      formData.append('notify_episodes', settings.notify_episodes);
      formData.append('notify_live', settings.notify_live);
      
      await axios.post(`${API}/api/telegram-subscriptions/subscribe`, formData);
      toast.success(`Уведомления от ${creatorName} включены`);
      setIsSubscribed(true);
      checkSubscription();
    } catch (error) {
      toast.error('Ошибка подписки');
    }
  };

  const unsubscribe = async () => {
    try {
      await axios.delete(
        `${API}/api/telegram-subscriptions/unsubscribe/${userId}/${creatorId}`
      );
      toast.success('Уведомления отключены');
      setIsSubscribed(false);
      setSubscription(null);
    } catch (error) {
      toast.error('Ошибка отписки');
    }
  };

  const updateSettings = async () => {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('creator_id', creatorId);
      formData.append('notify_episodes', settings.notify_episodes);
      formData.append('notify_live', settings.notify_live);
      
      await axios.post(`${API}/api/telegram-subscriptions/subscribe`, formData);
      toast.success('Настройки обновлены');
      setShowSettingsDialog(false);
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  // Render variants
  if (variant === 'icon') {
    return (
      <>
        <Button
          size="icon"
          variant={isSubscribed ? 'default' : 'outline'}
          onClick={isSubscribed ? () => setShowSettingsDialog(true) : subscribe}
          className={isSubscribed ? 'bg-blue-500 hover:bg-blue-600' : ''}
          title={isSubscribed ? 'Настройки уведомлений' : 'Подписаться на уведомления'}
        >
          {isSubscribed ? (
            <BellRing className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
        </Button>
        
        {/* Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-blue-500" />
                Уведомления от {creatorName}
              </DialogTitle>
            </DialogHeader>
            <NotificationSettings 
              settings={settings}
              setSettings={setSettings}
              onSave={updateSettings}
              onUnsubscribe={unsubscribe}
            />
          </DialogContent>
        </Dialog>
        
        {/* Connect Dialog */}
        <ConnectTelegramDialog
          open={showConnectDialog}
          onOpenChange={setShowConnectDialog}
          chatId={chatId}
          setChatId={setChatId}
          connecting={connecting}
          onConnect={connectTelegram}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant={isSubscribed ? 'default' : 'outline'}
              className={isSubscribed ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              {isSubscribed ? (
                <BellRing className="w-4 h-4 mr-1" />
              ) : (
                <Bell className="w-4 h-4 mr-1" />
              )}
              {isSubscribed ? 'Уведомления' : 'Уведомлять'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {!telegramConnected ? (
              <DropdownMenuItem onClick={() => setShowConnectDialog(true)}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Подключить Telegram
              </DropdownMenuItem>
            ) : isSubscribed ? (
              <>
                <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={unsubscribe} className="text-red-600">
                  <BellOff className="w-4 h-4 mr-2" />
                  Отключить
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={subscribe}>
                <Bell className="w-4 h-4 mr-2" />
                Подписаться
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-blue-500" />
                Уведомления
              </DialogTitle>
            </DialogHeader>
            <NotificationSettings 
              settings={settings}
              setSettings={setSettings}
              onSave={updateSettings}
              onUnsubscribe={unsubscribe}
            />
          </DialogContent>
        </Dialog>
        
        <ConnectTelegramDialog
          open={showConnectDialog}
          onOpenChange={setShowConnectDialog}
          chatId={chatId}
          setChatId={setChatId}
          connecting={connecting}
          onConnect={connectTelegram}
        />
      </>
    );
  }

  // Default variant
  return (
    <>
      <Button
        onClick={isSubscribed ? () => setShowSettingsDialog(true) : subscribe}
        variant={isSubscribed ? 'default' : 'outline'}
        className={isSubscribed ? 'bg-blue-500 hover:bg-blue-600' : ''}
      >
        {isSubscribed ? (
          <>
            <BellRing className="w-4 h-4 mr-2" />
            Уведомления включены
          </>
        ) : (
          <>
            <Bell className="w-4 h-4 mr-2" />
            Уведомлять в Telegram
          </>
        )}
      </Button>
      
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-blue-500" />
              Уведомления от {creatorName}
            </DialogTitle>
          </DialogHeader>
          <NotificationSettings 
            settings={settings}
            setSettings={setSettings}
            onSave={updateSettings}
            onUnsubscribe={unsubscribe}
          />
        </DialogContent>
      </Dialog>
      
      <ConnectTelegramDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        chatId={chatId}
        setChatId={setChatId}
        connecting={connecting}
        onConnect={connectTelegram}
      />
    </>
  );
};

// Notification settings component
const NotificationSettings = ({ settings, setSettings, onSave, onUnsubscribe }) => (
  <div className="space-y-6 mt-4">
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            🎙️
          </div>
          <div>
            <p className="font-medium">Новые выпуски</p>
            <p className="text-sm text-gray-500">Уведомления о новых подкастах</p>
          </div>
        </div>
        <Switch
          checked={settings.notify_episodes}
          onCheckedChange={(checked) => setSettings({ ...settings, notify_episodes: checked })}
        />
      </div>
      
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            🔴
          </div>
          <div>
            <p className="font-medium">Прямые эфиры</p>
            <p className="text-sm text-gray-500">Уведомления о начале трансляций</p>
          </div>
        </div>
        <Switch
          checked={settings.notify_live}
          onCheckedChange={(checked) => setSettings({ ...settings, notify_live: checked })}
        />
      </div>
    </div>
    
    <div className="flex gap-2">
      <Button onClick={onSave} className="flex-1 bg-blue-500 hover:bg-blue-600">
        <Check className="w-4 h-4 mr-2" />
        Сохранить
      </Button>
      <Button onClick={onUnsubscribe} variant="outline" className="text-red-600 hover:text-red-700">
        <BellOff className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

// Connect Telegram dialog
const ConnectTelegramDialog = ({ open, onOpenChange, chatId, setChatId, connecting, onConnect }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Подключить Telegram
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 mt-4">
        <div className="bg-blue-50 p-4 rounded-xl">
          <h4 className="font-medium mb-2">Как получить Chat ID:</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Откройте Telegram</li>
            <li>Найдите бота <code className="bg-white px-1 rounded">@fomo_notify_bot</code></li>
            <li>Отправьте команду <code className="bg-white px-1 rounded">/start</code></li>
            <li>Бот пришлёт ваш Chat ID</li>
          </ol>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Ваш Chat ID</label>
          <Input
            placeholder="123456789"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="bg-gray-50"
          />
        </div>
        
        <Button 
          onClick={onConnect} 
          disabled={connecting || !chatId.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600"
        >
          {connecting ? 'Подключение...' : 'Подключить'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default TelegramNotifyButton;
