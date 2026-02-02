import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Library, Plus, Users, TrendingUp, Search, BarChart3, Bell, MessageCircle, Radio } from 'lucide-react';
import { WalletSheet } from './WalletSheet';
import { Badge } from './ui/badge';
import axios from 'axios';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { walletAddress, isConnected: walletConnected } = useWallet();
  const { user, isAuthenticated } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [userRole, setUserRole] = useState({ role: 'member', is_admin: false, is_owner: false });
  
  // Check wallet role when wallet connected
  useEffect(() => {
    const checkWalletRole = async () => {
      if (walletAddress) {
        try {
          const response = await axios.get(`${API}/admin/check-role/${walletAddress}`);
          setUserRole(response.data);
        } catch (error) {
          console.error('Failed to check wallet role:', error);
          setUserRole({ role: 'member', is_admin: false, is_owner: false });
        }
      } else {
        setUserRole({ role: 'member', is_admin: false, is_owner: false });
      }
    };
    
    checkWalletRole();
  }, [walletAddress]);
  
  // Fetch unread counts for messages and alerts separately
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        // For now, set to 0 - would need real API calls
        setUnreadMessages(0);
        setUnreadAlerts(0);
      } catch (error) {
        console.error('Failed to fetch unread counts:', error);
      }
    };
    
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);
  
  // Navigation items (conditionally include Create, Analytics and Live based on role)
  // Live, Analytics, Create - only for admins/owners
  const canCreateContent = userRole.is_admin || userRole.is_owner;
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/members', icon: Users, label: 'Members' },
    { path: '/progress', icon: TrendingUp, label: 'Progress' },
    { path: '/library', icon: Library, label: 'Library' },
    ...(canCreateContent ? [{ path: '/live-management', icon: Radio, label: 'Live' }] : []),
    ...(canCreateContent ? [{ path: '/analytics', icon: BarChart3, label: 'Analytics' }] : []),
    ...(canCreateContent ? [{ path: '/create', icon: Plus, label: 'Create', isButton: true }] : []),
  ];
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_audio-bridge-14/artifacts/1s3xonvi_Main%20Logo.svg" 
              alt="Logo" 
              className="h-8"
            />
          </Link>
          
          {/* Navigation Items */}
          <div className="flex items-center gap-1 sm:gap-2">
            {navItems.filter(i => !i.isButton).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-900 text-white font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
            
            {/* Create Podcast Button - Only for owner/admin */}
            {canCreateContent && (
              <Link
                to="/create"
                data-testid="nav-create"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-600 font-semibold transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:block text-sm">Create</span>
              </Link>
            )}
            
            {/* Search Button */}
            <button
              onClick={() => navigate('/search')}
              className={`p-2.5 rounded-xl transition-all ${
                location.pathname === '/search'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* Alerts Icon */}
            <button
              onClick={() => navigate('/alerts')}
              className={`relative p-2.5 rounded-xl transition-all ${
                location.pathname === '/alerts'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Alerts"
            >
              <Bell className="w-5 h-5" />
              {unreadAlerts > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full p-0 border-2 border-white">
                  {unreadAlerts > 9 ? '9+' : unreadAlerts}
                </Badge>
              )}
            </button>
            
            {/* Messages Icon */}
            <button
              onClick={() => navigate('/messages')}
              className={`relative p-2.5 rounded-xl transition-all ${
                location.pathname === '/messages'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Messages"
            >
              <MessageCircle className="w-5 h-5" />
              {unreadMessages > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full p-0 border-2 border-white">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </Badge>
              )}
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 mx-1 sm:mx-2" />
            
            {/* Wallet Sheet - Side Panel */}
            <WalletSheet />
          </div>
        </div>
      </div>
    </nav>
  );
};
