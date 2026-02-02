import React, { useState, useEffect } from 'react';
import { Lock, Users, Send, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PrivatePodcastGate = ({ podcast, currentUserId, onAccessGranted }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkAccess();
  }, [podcast.id, currentUserId]);

  const checkAccess = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        `${API}/podcasts/${podcast.id}/access/check?user_id=${currentUserId}`
      );
      
      const access = response.data.has_access;
      setHasAccess(access);
      
      if (access && onAccessGranted) {
        onAccessGranted();
      }
    } catch (error) {
      console.error('Failed to check access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const requestAccess = async () => {
    if (!currentUserId) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setRequesting(true);
      await axios.post(
        `${API}/podcasts/${podcast.id}/access/request?user_id=${currentUserId}&message=${encodeURIComponent(message)}`
      );
      
      toast.success('Access request sent! The creator will review it soon.');
      setRequestSent(true);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already have a pending request')) {
        toast.info('You already have a pending request for this podcast');
        setRequestSent(true);
      } else {
        toast.error(error.response?.data?.detail || 'Failed to send request');
      }
    } finally {
      setRequesting(false);
    }
  };

  // If checking access, show loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // If user has access, don't show gate
  if (hasAccess) {
    return null;
  }

  // Show private podcast gate
  return (
    <Card className="p-8 text-center border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-md mx-auto">
        {/* Lock Icon */}
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-gray-400" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          🔒 Private Podcast
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          This is an exclusive podcast. Only invited members can listen to this content.
        </p>

        {/* Author Info */}
        {podcast.author_name && (
          <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-emerald-50 rounded-lg">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-gray-700">
              Hosted by <span className="font-semibold">{podcast.author_name}</span>
            </span>
          </div>
        )}

        {/* Request Access Form */}
        {!currentUserId ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your wallet to request access
            </p>
            <Button className="w-full" disabled>
              <Lock className="w-4 h-4 mr-2" />
              Connect Wallet Required
            </Button>
          </div>
        ) : requestSent ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Request Sent!</span>
            </div>
            <p className="text-sm text-gray-600">
              The creator will review your request. You'll be notified once approved.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                Message to Creator (Optional)
              </label>
              <Input
                placeholder="Tell the creator why you'd like to join..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={requestAccess}
              disabled={requesting}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {requesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Request Access
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500">
              Your request will be sent to the podcast creator for approval
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
