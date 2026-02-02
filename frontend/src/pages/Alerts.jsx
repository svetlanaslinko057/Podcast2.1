import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Check, X, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Telegram settings
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);

  useEffect(() => {
    loadAlerts();
    loadTelegramSettings();
  }, []);

  const loadTelegramSettings = async () => {
    try {
      // Load from localStorage or API
      const savedChatId = localStorage.getItem('telegram_chat_id');
      if (savedChatId) {
        setTelegramChatId(savedChatId);
        setTelegramConnected(true);
      }
    } catch (error) {
      console.error('Failed to load Telegram settings:', error);
    }
  };

  const handleConnectTelegram = async () => {
    if (!telegramChatId.trim()) {
      toast.error('Please enter Telegram Chat ID or Username');
      return;
    }

    try {
      setSavingTelegram(true);
      // Save to localStorage
      localStorage.setItem('telegram_chat_id', telegramChatId);
      setTelegramConnected(true);
      toast.success('Telegram connected successfully!');
    } catch (error) {
      toast.error('Failed to connect Telegram');
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleDisconnectTelegram = () => {
    localStorage.removeItem('telegram_chat_id');
    setTelegramChatId('');
    setTelegramConnected(false);
    toast.success('Telegram disconnected');
  };

  const loadAlerts = async () => {
    try {
      // For now, mock data - would need real API
      setAlerts([]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setLoading(false);
    }
  };

  const markAsRead = async (alertId) => {
    try {
      // Mock - would need real API
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, read: true } : a));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      // Mock - would need real API
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading alerts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-8 h-8" />
            Alerts
          </h1>
          <p className="text-gray-600 mt-2">
            Important notifications and events
          </p>
        </div>

        {/* Telegram Bot Connection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Telegram Bot Notifications
            </CardTitle>
            <CardDescription>
              Connect your Telegram to receive instant alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!telegramConnected ? (
                <>
                  <div>
                    <Label htmlFor="telegram-id">Telegram Chat ID or Username</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="telegram-id"
                        type="text"
                        placeholder="@username or chat_id"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleConnectTelegram}
                        disabled={savingTelegram}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        {savingTelegram ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    To get your Chat ID, start a chat with @userinfobot on Telegram
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Send className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Connected</div>
                      <div className="text-sm text-gray-600">{telegramChatId}</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleDisconnectTelegram}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Alerts</span>
              {alerts.some(a => !a.read) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAlerts(alerts.map(a => ({ ...a, read: true })))}
                >
                  Mark all as read
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.read ? 'bg-white' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${
                            alert.type === 'error' ? 'text-red-600' :
                            alert.type === 'warning' ? 'text-orange-600' :
                            alert.type === 'success' ? 'text-green-600' :
                            'text-blue-600'
                          }`}>
                            {alert.type === 'error' ? 'Error' :
                             alert.type === 'warning' ? 'Warning' :
                             alert.type === 'success' ? 'Success' :
                             'Info'}
                          </span>
                          <span className="text-xs text-gray-500">{alert.time}</span>
                        </div>
                        <p className="text-sm text-gray-900">{alert.message}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!alert.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(alert.id)}
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlert(alert.id)}
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No new alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
