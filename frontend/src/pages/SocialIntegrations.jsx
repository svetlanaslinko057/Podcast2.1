import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Send, Twitter, Radio, Mic, CheckCircle, XCircle, 
  Settings, Save, AlertCircle, Play, Square, Archive
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export function SocialIntegrations() {
  const [authorId] = useState('demo-author-123');
  const [telegramIntegrations, setTelegramIntegrations] = useState([]);
  const [twitterIntegrations, setTwitterIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Telegram form
  const [tgChatId, setTgChatId] = useState('');
  const [tgChatTitle, setTgChatTitle] = useState('');
  const [tgAutoRecord, setTgAutoRecord] = useState(true);
  const [tgAutoPublish, setTgAutoPublish] = useState(false);
  
  // Twitter form
  const [twUserId, setTwUserId] = useState('');
  const [twUsername, setTwUsername] = useState('');
  const [twAccessToken, setTwAccessToken] = useState('');
  const [twAutoRecord, setTwAutoRecord] = useState(true);
  const [twAutoPublish, setTwAutoPublish] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const [tgRes, twRes] = await Promise.all([
        axios.get(`${API_URL}/api/integrations/telegram/${authorId}`),
        axios.get(`${API_URL}/api/integrations/twitter/${authorId}`)
      ]);
      
      setTelegramIntegrations(tgRes.data.integrations || []);
      setTwitterIntegrations(twRes.data.integrations || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectTelegram = async () => {
    if (!tgChatId || !tgChatTitle) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('author_id', authorId);
      formData.append('chat_id', tgChatId);
      formData.append('chat_title', tgChatTitle);
      formData.append('auto_record', tgAutoRecord);
      formData.append('auto_publish', tgAutoPublish);

      await axios.post(`${API_URL}/api/integrations/telegram/connect`, formData);
      toast.success('Telegram connected successfully!');
      
      setTgChatId('');
      setTgChatTitle('');
      await loadIntegrations();
    } catch (error) {
      toast.error('Failed to connect Telegram');
      console.error(error);
    }
  };

  const disconnectTelegram = async (integrationId) => {
    try {
      await axios.delete(`${API_URL}/api/integrations/telegram/${integrationId}`);
      toast.success('Telegram disconnected');
      await loadIntegrations();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const connectTwitter = async () => {
    if (!twUserId || !twUsername || !twAccessToken) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('author_id', authorId);
      formData.append('twitter_user_id', twUserId);
      formData.append('twitter_username', twUsername);
      formData.append('access_token', twAccessToken);
      formData.append('auto_record', twAutoRecord);
      formData.append('auto_publish', twAutoPublish);

      await axios.post(`${API_URL}/api/integrations/twitter/connect`, formData);
      toast.success('Twitter connected successfully!');
      
      setTwUserId('');
      setTwUsername('');
      setTwAccessToken('');
      await loadIntegrations();
    } catch (error) {
      toast.error('Failed to connect Twitter');
      console.error(error);
    }
  };

  const disconnectTwitter = async (integrationId) => {
    try {
      await axios.delete(`${API_URL}/api/integrations/twitter/${integrationId}`);
      toast.success('Twitter disconnected');
      await loadIntegrations();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center pt-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-6">
            <Radio className="w-4 h-4" />
            Social Sync & Recording
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Social <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Integrations</span>
          </h1>
          <p className="text-gray-600">
            Синхронізуйте подкасти з Telegram та Twitter. Автоматично записуйте голосові кімнати.
          </p>
        </div>

        {/* Telegram Integration */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Telegram Voice Chats</h2>
              <p className="text-sm text-gray-600">Записуйте голосові чати та синхронізуйте з платформою</p>
            </div>
          </div>

          {/* Connected Integrations */}
          {telegramIntegrations.filter(i => i.is_active).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Connected Chats</h3>
              <div className="space-y-2">
                {telegramIntegrations.filter(i => i.is_active).map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="font-medium text-gray-900">{integration.chat_title}</p>
                        <p className="text-xs text-gray-500">Chat ID: {integration.chat_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {integration.auto_record && (
                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                          Auto Record
                        </span>
                      )}
                      {integration.auto_publish && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          Auto Publish
                        </span>
                      )}
                      <button
                        onClick={() => disconnectTelegram(integration.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Add New Chat</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chat ID</label>
                <input
                  type="text"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  placeholder="-1001234567890"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chat Title</label>
                <input
                  type="text"
                  value={tgChatTitle}
                  onChange={(e) => setTgChatTitle(e.target.value)}
                  placeholder="My Podcast Group"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tgAutoRecord}
                  onChange={(e) => setTgAutoRecord(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded"
                />
                <span className="text-sm text-gray-700">Auto-record voice chats</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tgAutoPublish}
                  onChange={(e) => setTgAutoPublish(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded"
                />
                <span className="text-sm text-gray-700">Auto-publish recordings</span>
              </label>
            </div>

            <button
              onClick={connectTelegram}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Connect Telegram
            </button>
          </div>
        </div>

        {/* Twitter Integration */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <Twitter className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Twitter Spaces</h2>
              <p className="text-sm text-gray-600">Записуйте Twitter Spaces та синхронізуйте</p>
            </div>
          </div>

          {/* Connected Integrations */}
          {twitterIntegrations.filter(i => i.is_active).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Connected Accounts</h3>
              <div className="space-y-2">
                {twitterIntegrations.filter(i => i.is_active).map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="font-medium text-gray-900">@{integration.twitter_username}</p>
                        <p className="text-xs text-gray-500">User ID: {integration.twitter_user_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {integration.auto_record && (
                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                          Auto Record
                        </span>
                      )}
                      {integration.auto_publish && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          Auto Publish
                        </span>
                      )}
                      <button
                        onClick={() => disconnectTwitter(integration.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Add New Account</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter User ID</label>
                <input
                  type="text"
                  value={twUserId}
                  onChange={(e) => setTwUserId(e.target.value)}
                  placeholder="1234567890"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={twUsername}
                  onChange={(e) => setTwUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
              <input
                type="password"
                value={twAccessToken}
                onChange={(e) => setTwAccessToken(e.target.value)}
                placeholder="Your Twitter API access token"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={twAutoRecord}
                  onChange={(e) => setTwAutoRecord(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded"
                />
                <span className="text-sm text-gray-700">Auto-record Spaces</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={twAutoPublish}
                  onChange={(e) => setTwAutoPublish(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded"
                />
                <span className="text-sm text-gray-700">Auto-publish recordings</span>
              </label>
            </div>

            <button
              onClick={connectTwitter}
              className="px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-xl font-medium hover:from-blue-500 hover:to-blue-700 transition-all flex items-center gap-2"
            >
              <Twitter className="w-4 h-4" />
              Connect Twitter
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Як отримати credentials:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Telegram Chat ID:</strong> Додайте @userinfobot до вашої групи</li>
                <li>• <strong>Twitter API:</strong> Створіть Developer App на developer.twitter.com</li>
                <li>• Всі записи зберігаються в єдиній бібліотеці</li>
                <li>• Auto-publish публікує запис одразу після завершення</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
