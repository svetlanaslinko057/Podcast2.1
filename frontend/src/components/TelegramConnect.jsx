import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Send, Loader2, CheckCircle, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Input } from './ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BOT_USERNAME = 'Podcast_FOMO_bot';
const PRODUCTION_DOMAIN = 'p.fomo.cx'; // Domain registered in BotFather

// Check if we're on production domain where widget works
const isProductionDomain = typeof window !== 'undefined' && 
  window.location.hostname.includes(PRODUCTION_DOMAIN);

/**
 * Telegram Login Widget Component
 * Uses official Telegram Login Widget for OAuth authentication
 * Falls back to manual connection if widget doesn't load
 */
export const TelegramConnect = ({ isOpen, onClose, authorId, onConnected }) => {
  const widgetRef = useRef(null);
  const [loading, setLoading] = useState(isProductionDomain);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [widgetError, setWidgetError] = useState(!isProductionDomain); // Skip widget on non-production
  const [manualChatId, setManualChatId] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [copied, setCopied] = useState(false);

  // Handle Telegram auth callback
  const handleTelegramAuth = useCallback(async (telegramUser) => {
    setConnecting(true);
    setError(null);
    
    try {
      // Send auth data to backend for verification
      const response = await axios.post(`${API}/telegram/auth/callback-json`, {
        ...telegramUser,
        author_id: authorId
      });

      if (response.data.success) {
        toast.success('Telegram connected!', {
          description: `Welcome, ${telegramUser.first_name}!`
        });
        
        if (onConnected) {
          onConnected(response.data.author);
        }
        onClose();
      }
    } catch (err) {
      console.error('Telegram auth error:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to connect Telegram';
      setError(errorMsg);
      toast.error('Connection failed', { description: errorMsg });
    } finally {
      setConnecting(false);
    }
  }, [authorId, onClose, onConnected]);

  // Load Telegram Widget script (only on production domain)
  useEffect(() => {
    if (!isOpen || !isProductionDomain) return;

    // Set up global callback BEFORE loading script
    window.onTelegramAuth = handleTelegramAuth;

    const loadWidget = () => {
      // Clear previous content
      if (widgetRef.current) {
        widgetRef.current.innerHTML = '';
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', BOT_USERNAME);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '12');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-userpic', 'true');
      script.async = true;

      script.onload = () => {
        setLoading(false);
        // Check if widget loaded properly after a delay
        setTimeout(() => {
          const iframe = widgetRef.current?.querySelector('iframe');
          if (!iframe) {
            setWidgetError(true);
          }
        }, 2000);
      };

      script.onerror = () => {
        setLoading(false);
        setWidgetError(true);
      };

      if (widgetRef.current) {
        widgetRef.current.appendChild(script);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadWidget, 100);

    return () => {
      clearTimeout(timer);
      delete window.onTelegramAuth;
    };
  }, [isOpen, handleTelegramAuth]);

  // Manual connection via chat_id
  const handleManualConnect = async () => {
    if (!manualChatId.trim()) {
      toast.error('Please enter Chat ID');
      return;
    }
    
    setConnecting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('author_id', authorId);
      formData.append('chat_id', manualChatId.trim());
      // Add username if provided (with @ prefix handling)
      if (manualUsername.trim()) {
        const username = manualUsername.trim().replace(/^@/, ''); // Remove @ if present
        formData.append('username', username);
      }
      
      const response = await axios.post(`${API}/telegram/connect-personal`, formData);
      
      if (response.data.success) {
        toast.success('Telegram connected!');
        if (onConnected) {
          onConnected(response.data.author);
        }
        onClose();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Connection failed';
      setError(errorMsg);
      toast.error('Error', { description: errorMsg });
    } finally {
      setConnecting(false);
    }
  };

  const copyBotLink = () => {
    navigator.clipboard.writeText(`https://t.me/${BOT_USERNAME}?start=${authorId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const openBot = () => {
    window.open(`https://t.me/${BOT_USERNAME}?start=${authorId}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="telegram-connect-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-500" />
            Connect Telegram
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status indicator */}
          {connecting && (
            <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-blue-700 font-medium">Connecting...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
              <Send className="w-10 h-10 text-white" />
            </div>

            {/* Telegram Widget - only shown on production domain */}
            {isProductionDomain && !widgetError && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Login with Telegram
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Click the button below to authorize
                  </p>
                </div>

                <div 
                  className="flex justify-center min-h-[48px] py-2"
                  data-testid="telegram-widget-container"
                >
                  {loading && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  )}
                  <div ref={widgetRef} className={loading ? 'hidden' : ''} />
                </div>
              </>
            )}

            {/* Fallback: Manual connection (always shown on non-production, or if widget fails) */}
            {(widgetError || !isProductionDomain) && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-4">
                <p className="text-sm font-medium text-gray-900">
                  Connect via bot:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-sm text-gray-700">Open the bot in Telegram</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={openBot} className="flex-1 bg-blue-500 hover:bg-blue-600">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Bot
                    </Button>
                    <Button onClick={copyBotLink} variant="outline" size="icon">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-sm text-gray-700">Send /start and get your Chat ID</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-sm text-gray-700">Enter your details below</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      placeholder="Your Chat ID (required)"
                      value={manualChatId}
                      onChange={(e) => setManualChatId(e.target.value)}
                      className="w-full"
                    />
                    <Input
                      placeholder="@username (optional, e.g. @Ox01D)"
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value)}
                      className="w-full"
                    />
                    <Button 
                      onClick={handleManualConnect}
                      disabled={connecting || !manualChatId.trim()}
                      className="w-full bg-emerald-500 hover:bg-emerald-600"
                    >
                      {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {connecting ? 'Connecting...' : 'Connect Telegram'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
              <p className="text-sm text-gray-700 mb-2">
                <strong>After connecting:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Notifications about new podcasts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Live stream alerts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Comment notifications
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={connecting}
            data-testid="telegram-connect-cancel"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TelegramConnect;
