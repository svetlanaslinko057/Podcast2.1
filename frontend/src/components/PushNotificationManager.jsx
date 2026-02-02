import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Bell, BellOff, Check, Radio, MessageCircle, 
  UserPlus, Headphones, Settings, Loader2 
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const PushNotificationManager = ({ userId }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  
  // Notification type preferences
  const [notificationTypes, setNotificationTypes] = useState({
    new_podcast: true,
    live_start: true,
    new_comment: true,
    private_club_invite: true
  });

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        setPermission(Notification.permission);
      }
    };
    checkSupport();
  }, []);

  // Get VAPID public key
  useEffect(() => {
    const getVapidKey = async () => {
      try {
        const response = await axios.get(`${API}/push/vapid-public-key`);
        setVapidPublicKey(response.data.publicKey);
      } catch (error) {
        console.error('Failed to get VAPID key:', error);
      }
    };
    getVapidKey();
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        
        // Also check server for notification preferences
        if (userId) {
          const response = await axios.get(`${API}/push/subscriptions/${userId}`);
          if (response.data.length > 0) {
            const types = response.data[0].notification_types || [];
            setNotificationTypes({
              new_podcast: types.includes('new_podcast'),
              live_start: types.includes('live_start'),
              new_comment: types.includes('new_comment'),
              private_club_invite: types.includes('private_club_invite')
            });
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };
    checkSubscription();
  }, [isSupported, userId]);

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!isSupported || !vapidPublicKey || !userId) return;
    
    setLoading(true);
    
    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }
      
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }
      
      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      // Send subscription to server
      const enabledTypes = Object.entries(notificationTypes)
        .filter(([, enabled]) => enabled)
        .map(([type]) => type);
      
      await axios.post(`${API}/push/subscribe`, {
        user_id: userId,
        subscription: subscription.toJSON(),
        notification_types: enabledTypes
      });
      
      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
      
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!isSupported || !userId) return;
    
    setLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }
      
      // Remove from server
      await axios.delete(`${API}/push/unsubscribe`, {
        data: { user_id: userId }
      });
      
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  // Update notification preferences
  const updatePreferences = async () => {
    if (!userId) return;
    
    try {
      const enabledTypes = Object.entries(notificationTypes)
        .filter(([, enabled]) => enabled)
        .map(([type]) => type);
      
      await axios.put(`${API}/push/subscriptions/${userId}/settings`, {
        notification_types: enabledTypes
      });
      
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  // Toggle notification type
  const toggleType = (type) => {
    setNotificationTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (!isSupported) {
    return (
      <Card className="bg-amber-50 border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Push notifications not supported</p>
            <p className="text-sm text-amber-600">Your browser doesn&apos;t support push notifications</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isSubscribed ? 'bg-emerald-100' : 'bg-gray-100'
          }`}>
            {isSubscribed ? (
              <Bell className="w-5 h-5 text-emerald-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-500">
              {isSubscribed 
                ? 'Notifications are enabled' 
                : permission === 'denied' 
                  ? 'Notifications blocked in browser'
                  : 'Enable to receive updates'}
            </p>
          </div>
        </div>
        
        <Button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading || permission === 'denied'}
          className={isSubscribed 
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
            : 'bg-emerald-500 hover:bg-emerald-600'
          }
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : isSubscribed ? (
            <BellOff className="w-4 h-4 mr-2" />
          ) : (
            <Bell className="w-4 h-4 mr-2" />
          )}
          {isSubscribed ? 'Disable' : 'Enable'}
        </Button>
      </div>
      
      {/* Notification Types */}
      {isSubscribed && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Notification Types
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Headphones className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-gray-900">New Podcasts</p>
                  <p className="text-xs text-gray-500">From creators you follow</p>
                </div>
              </div>
              <Switch
                checked={notificationTypes.new_podcast}
                onCheckedChange={() => toggleType('new_podcast')}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium text-gray-900">Live Streams</p>
                  <p className="text-xs text-gray-500">When followed creators go live</p>
                </div>
              </div>
              <Switch
                checked={notificationTypes.live_start}
                onCheckedChange={() => toggleType('live_start')}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Comments</p>
                  <p className="text-xs text-gray-500">On your podcasts</p>
                </div>
              </div>
              <Switch
                checked={notificationTypes.new_comment}
                onCheckedChange={() => toggleType('new_comment')}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-gray-900">Private Club Invites</p>
                  <p className="text-xs text-gray-500">Exclusive content access</p>
                </div>
              </div>
              <Switch
                checked={notificationTypes.private_club_invite}
                onCheckedChange={() => toggleType('private_club_invite')}
              />
            </div>
          </div>
          
          <Button 
            onClick={updatePreferences}
            variant="outline" 
            className="w-full mt-4"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      )}
      
      {permission === 'denied' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">
            <strong>Notifications blocked:</strong> To enable, click the lock icon in your browser&apos;s address bar and allow notifications.
          </p>
        </div>
      )}
    </Card>
  );
};

export default PushNotificationManager;
