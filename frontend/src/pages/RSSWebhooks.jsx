import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Copy, Check, Rss, Webhook, Plus, Trash2, TestTube2, 
  Activity, AlertCircle, CheckCircle2, Send 
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Hardcoded demo user (replace with actual auth)
const DEMO_USER_ID = 'demo-user-123';

export const RSSWebhooks = () => {
  const [copied, setCopied] = useState(false);
  const [rssUrl, setRssUrl] = useState('');
  const [webhooks, setWebhooks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New webhook form
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [],
    secret: '',
    telegram_bot_token: '',
    telegram_chat_id: ''
  });
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load available events
      const eventsRes = await axios.get(`${API}/webhooks/events/list`);
      setEvents(eventsRes.data.events || []);
      
      // Load user webhooks
      const webhooksRes = await axios.get(`${API}/webhooks/user/${DEMO_USER_ID}`);
      setWebhooks(webhooksRes.data || []);
      
      // Set RSS URL
      setRssUrl(`${BACKEND_URL}/api/rss/author/${DEMO_USER_ID}`);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const copyRssUrl = () => {
    navigator.clipboard.writeText(rssUrl);
    setCopied(true);
    toast.success('RSS URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEventToggle = (event) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const createWebhook = async () => {
    try {
      if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
        toast.error('Please fill in name, URL, and select at least one event');
        return;
      }

      await axios.post(`${API}/webhooks`, {
        user_id: DEMO_USER_ID,
        ...newWebhook
      });

      toast.success('Webhook created successfully!');
      setShowAddDialog(false);
      setNewWebhook({
        name: '',
        url: '',
        events: [],
        secret: '',
        telegram_bot_token: '',
        telegram_chat_id: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast.error('Failed to create webhook');
    }
  };

  const deleteWebhook = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await axios.delete(`${API}/webhooks/${webhookId}`);
      toast.success('Webhook deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const testWebhook = async (webhookId) => {
    try {
      setTestingWebhook(webhookId);
      const response = await axios.post(`${API}/webhooks/${webhookId}/test`);
      
      if (response.data.success) {
        toast.success('Webhook test successful!');
      } else {
        toast.error(`Webhook test failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Failed to test webhook');
    } finally {
      setTestingWebhook(null);
    }
  };

  const toggleWebhookStatus = async (webhookId, isActive) => {
    try {
      await axios.put(`${API}/webhooks/${webhookId}`, {
        is_active: !isActive
      });
      toast.success(`Webhook ${!isActive ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error('Failed to update webhook');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-24">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">RSS & Webhooks</h1>
        <p className="text-gray-600 mb-8">Manage RSS feeds and webhook integrations</p>

        <Tabs defaultValue="rss" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="rss" className="flex items-center gap-2">
              <Rss className="w-4 h-4" />
              RSS Feeds
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          {/* RSS Tab */}
          <TabsContent value="rss">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rss className="w-5 h-5 text-orange-500" />
                  RSS Feed URL
                </CardTitle>
                <CardDescription>
                  Subscribe to your podcast feed in any podcast app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This RSS feed is compatible with all major podcast platforms and apps.
                    Share this URL to allow others to subscribe to your podcasts.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Input
                    value={rssUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={copyRssUrl}
                    variant="outline"
                    className="gap-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>

                <div className="pt-4 space-y-2">
                  <h3 className="font-semibold text-gray-900">How to use:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    <li>Copy the RSS feed URL above</li>
                    <li>Open your favorite podcast app</li>
                    <li>Look for "Add by URL" or "Subscribe via RSS"</li>
                    <li>Paste the URL and subscribe</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Webhooks</h2>
                <p className="text-gray-600">Receive real-time notifications for events</p>
              </div>
              
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Webhook</DialogTitle>
                    <DialogDescription>
                      Configure a webhook to receive notifications for specific events
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook-name">Webhook Name</Label>
                      <Input
                        id="webhook-name"
                        placeholder="e.g., Telegram Notifications"
                        value={newWebhook.name}
                        onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        placeholder="https://your-server.com/webhook"
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                      />
                      <p className="text-xs text-gray-500">
                        This URL will receive POST requests when events occur
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Subscribe to Events</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {events.map(event => (
                          <div key={event} className="flex items-center space-x-2">
                            <Checkbox
                              id={event}
                              checked={newWebhook.events.includes(event)}
                              onCheckedChange={() => handleEventToggle(event)}
                            />
                            <Label htmlFor={event} className="text-sm font-normal cursor-pointer">
                              {event}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret">Secret Key (Optional)</Label>
                      <Input
                        id="webhook-secret"
                        type="password"
                        placeholder="Your secret key for signature verification"
                        value={newWebhook.secret}
                        onChange={(e) => setNewWebhook({...newWebhook, secret: e.target.value})}
                      />
                      <p className="text-xs text-gray-500">
                        Used to verify webhook authenticity via X-Webhook-Signature header
                      </p>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Telegram Integration (Optional)
                      </h4>
                      <div className="space-y-2">
                        <Label htmlFor="telegram-token">Telegram Bot Token</Label>
                        <Input
                          id="telegram-token"
                          placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                          value={newWebhook.telegram_bot_token}
                          onChange={(e) => setNewWebhook({...newWebhook, telegram_bot_token: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telegram-chat">Telegram Chat ID</Label>
                        <Input
                          id="telegram-chat"
                          placeholder="-1001234567890"
                          value={newWebhook.telegram_chat_id}
                          onChange={(e) => setNewWebhook({...newWebhook, telegram_chat_id: e.target.value})}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Configure Telegram to send notifications directly to your channel/group
                      </p>
                    </div>

                    <Button onClick={createWebhook} className="w-full">
                      Create Webhook
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {webhooks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No webhooks yet</h3>
                  <p className="text-gray-600 mb-4">Create your first webhook to start receiving notifications</p>
                  <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {webhooks.map(webhook => (
                  <Card key={webhook.id} className={!webhook.is_active ? 'opacity-60' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{webhook.name}</h3>
                            <Badge variant={webhook.is_active ? "default" : "secondary"}>
                              {webhook.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 font-mono break-all">{webhook.url}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {webhook.events.map(event => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Activity className="w-4 h-4" />
                          <span>{webhook.total_calls} calls</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>{webhook.successful_calls} successful</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>{webhook.failed_calls} failed</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testWebhook(webhook.id)}
                          disabled={testingWebhook === webhook.id}
                          className="gap-2"
                        >
                          <TestTube2 className="w-4 h-4" />
                          {testingWebhook === webhook.id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleWebhookStatus(webhook.id, webhook.is_active)}
                        >
                          {webhook.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteWebhook(webhook.id)}
                          className="text-red-600 hover:text-red-700 gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
