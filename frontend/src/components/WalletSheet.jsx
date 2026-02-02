import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger,
  SheetClose
} from './ui/sheet';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  Wallet, LogOut, Settings, Lock, Send, Copy, Check, 
  ExternalLink, Radio, ChevronRight, Loader2, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { TelegramConnect } from './TelegramConnect';
import { getRatingBorderClass } from '../utils/ratingUtils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const WalletSheet = () => {
  const navigate = useNavigate();
  const { isConnected, isConnecting, walletAddress, connect, disconnect } = useWallet();
  const { user, isAuthenticated, logout } = useAuth();
  const { activeLive, isInLive } = useLive();
  
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [authorId, setAuthorId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showTelegramConnect, setShowTelegramConnect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeLives, setActiveLives] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const isLoggedIn = isAuthenticated || isConnected;

  // Fetch user profile and find author ID
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const authorsRes = await axios.get(`${API}/authors`);
        const authors = authorsRes.data || [];
        
        let found = null;
        if (walletAddress) {
          found = authors.find(a => a.wallet_address === walletAddress);
        }
        if (!found && user?.id) {
          found = authors.find(a => a.id === user.id);
        }
        if (!found && authors.length > 0) {
          found = authors[0];
        }
        
        if (found) {
          setUserProfile(found);
          setAuthorId(found.id);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch active lives
    const fetchActiveLives = async () => {
      try {
        const res = await axios.get(`${API}/live-rooms`);
        const liveRooms = (res.data || []).filter(room => room.is_live === true);
        setActiveLives(liveRooms);
      } catch (error) {
        setActiveLives([]);
      }
    };
    
    // Fetch unread messages count
    const fetchUnreadCount = async () => {
      if (!authorId) return;
      try {
        const res = await axios.get(`${API}/users/${authorId}/conversations`);
        const convs = res.data || [];
        const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadMessages(total);
      } catch (error) {
        setUnreadMessages(0);
      }
    };

    if (isOpen) {
      fetchProfile();
      fetchActiveLives();
    }
    
    // Fetch unread messages periodically
    if (authorId) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // every 30 sec
      return () => clearInterval(interval);
    }
  }, [isOpen, isLoggedIn, walletAddress, user, authorId]);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Address copied!');
    }
  };

  const handleDisconnect = () => {
    logout();
    disconnect();
    setIsOpen(false);
    navigate('/');
  };

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleTelegramConnected = (author) => {
    setUserProfile(prev => ({
      ...prev,
      telegram_connected: true,
      telegram_username: author.telegram_username,
      telegram_chat_id: author.telegram_chat_id
    }));
    setShowTelegramConnect(false);
  };

  // Not logged in - show connect button
  if (!isLoggedIn) {
    return (
      <Button
        onClick={connect}
        disabled={isConnecting}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        data-testid="connect-wallet-btn"
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        <span className="text-sm font-semibold">
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </span>
      </Button>
    );
  }

  // Logged in - show avatar that opens sheet
  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button 
            className="relative flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 transition-all"
            data-testid="wallet-sheet-trigger"
          >
            <Avatar className={`w-8 h-8 border-2 ${getRatingBorderClass(userProfile?.rating || 0)}`}>
              <AvatarImage src={userProfile?.avatar || user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                {userProfile?.name?.[0] || user?.name?.[0] || walletAddress?.slice(2, 4)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {/* Unread messages indicator */}
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold animate-pulse">
                {unreadMessages > 9 ? '!' : unreadMessages}
              </span>
            )}
          </button>
        </SheetTrigger>

        <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-br from-emerald-50 to-teal-50">
              <div className="flex items-start gap-4">
                <Avatar className={`w-16 h-16 border-4 ${getRatingBorderClass(userProfile?.rating || 0)} shadow-lg`}>
                  <AvatarImage src={userProfile?.avatar || user?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xl">
                    {userProfile?.name?.[0] || user?.name?.[0] || walletAddress?.slice(2, 4)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg font-bold text-gray-900 truncate">
                    {userProfile?.name || user?.name || 'Anonymous'}
                  </SheetTitle>
                  {userProfile?.rating !== undefined && (
                    <Badge variant="outline" className="mt-1 bg-white">
                      Rating: {userProfile.rating}
                    </Badge>
                  )}
                </div>
              </div>
            </SheetHeader>

            {/* Wallet Info */}
            {walletAddress && (
              <div className="p-4 border-b">
                <p className="text-xs text-gray-500 mb-2 font-medium">WALLET ADDRESS</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                  <Wallet className="w-4 h-4 text-gray-500" />
                  <span className="flex-1 font-mono text-sm text-gray-700">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="flex-1 p-4 space-y-2">
              {/* Telegram Status */}
              <button
                onClick={() => {
                  if (userProfile?.telegram_connected) {
                    handleNavigate('/social?tab=alerts');
                  } else {
                    setShowTelegramConnect(true);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                data-testid="telegram-menu-item"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  userProfile?.telegram_connected ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Send className={`w-5 h-5 ${
                    userProfile?.telegram_connected ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  {userProfile?.telegram_connected ? (
                    <>
                      <p className="text-sm font-medium text-gray-900">
                        @{userProfile.telegram_username || 'Connected'}
                      </p>
                      <p className="text-xs text-emerald-600">Telegram Connected</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">Connect Telegram</p>
                      <p className="text-xs text-gray-500">Get notifications</p>
                    </>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Profile */}
              <button
                onClick={() => handleNavigate('/settings')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Profile Settings</p>
                  <p className="text-xs text-gray-500">Edit your profile</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Messages */}
              <button
                onClick={() => handleNavigate('/social?tab=messages')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                data-testid="messages-menu-item"
              >
                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
                  unreadMessages > 0 ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  <MessageCircle className={`w-5 h-5 ${
                    unreadMessages > 0 ? 'text-emerald-600' : 'text-gray-500'
                  }`} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    Messages
                    {unreadMessages > 0 && (
                      <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">
                        {unreadMessages}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {unreadMessages > 0 
                      ? `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}`
                      : 'Your conversations'
                    }
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Live Streams */}
              <button
                onClick={() => handleNavigate('/lives')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                data-testid="live-menu-item"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activeLives.length > 0 || isInLive ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <Radio className={`w-5 h-5 ${
                    activeLives.length > 0 || isInLive ? 'text-red-500' : 'text-gray-500'
                  }`} />
                  {(activeLives.length > 0 || isInLive) && (
                    <span className="absolute w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse top-0 right-0" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    Live
                    {activeLives.length > 0 && (
                      <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">
                        {activeLives.length}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activeLives.length > 0 
                      ? `${activeLives.length} active stream${activeLives.length > 1 ? 's' : ''}`
                      : 'No live streams'
                    }
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Footer - Disconnect */}
            <div className="p-4 border-t">
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                data-testid="disconnect-wallet-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect Wallet
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Telegram Connect Modal */}
      {showTelegramConnect && authorId && (
        <TelegramConnect
          isOpen={showTelegramConnect}
          onClose={() => setShowTelegramConnect(false)}
          authorId={authorId}
          onConnected={handleTelegramConnected}
        />
      )}
    </>
  );
};

export default WalletSheet;
