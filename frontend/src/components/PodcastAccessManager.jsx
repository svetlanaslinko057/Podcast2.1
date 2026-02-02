import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Lock, Plus, Trash2, Users, Search, X, 
  CheckCircle, XCircle, Clock, Send
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PodcastAccessManager = ({ podcastId, authorId }) => {
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, max: 1000 });

  useEffect(() => {
    loadAccessList();
    loadAccessRequests();
  }, [podcastId]);

  const loadAccessList = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API}/podcasts/${podcastId}/access/list?current_user_id=${authorId}`
      );
      setMembers(response.data.members || []);
      setStats({
        total: response.data.total_members || 0,
        max: response.data.max_members || 1000
      });
    } catch (error) {
      console.error('Failed to load access list:', error);
      toast.error('Failed to load member list');
    } finally {
      setLoading(false);
    }
  };

  const loadAccessRequests = async () => {
    try {
      const response = await axios.get(
        `${API}/podcasts/${podcastId}/access/requests?current_user_id=${authorId}&status_filter=pending`
      );
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load access requests:', error);
    }
  };

  const inviteUser = async () => {
    if (!newUserId.trim()) {
      toast.error('Please enter a wallet address or user ID');
      return;
    }

    try {
      await axios.post(
        `${API}/podcasts/${podcastId}/access/invite?current_user_id=${authorId}`,
        { user_id: newUserId.trim() }
      );
      
      toast.success('User invited successfully!');
      setNewUserId('');
      setShowInviteDialog(false);
      loadAccessList();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to invite user');
    }
  };

  const removeUser = async (userId) => {
    if (!confirm('Remove this member from your private podcast?')) return;

    try {
      await axios.delete(
        `${API}/podcasts/${podcastId}/access/remove?current_user_id=${authorId}`,
        { data: { user_id: userId } }
      );
      
      toast.success('Member removed');
      loadAccessList();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const approveRequest = async (requestId) => {
    try {
      await axios.post(
        `${API}/podcasts/${podcastId}/access/requests/${requestId}/approve?current_user_id=${authorId}`
      );
      
      toast.success('Access request approved!');
      loadAccessRequests();
      loadAccessList();
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.post(
        `${API}/podcasts/${podcastId}/access/requests/${requestId}/reject?current_user_id=${authorId}`
      );
      
      toast.success('Access request rejected');
      loadAccessRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const filteredMembers = members.filter(member => 
    member.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Private Access Control</h3>
              <p className="text-sm text-gray-600">Manage who can listen to this podcast</p>
            </div>
          </div>
          <Button onClick={() => setShowInviteDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Members</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Pending Requests</p>
            <p className="text-2xl font-bold text-orange-600">{requests.length}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Available Slots</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.max - stats.total}</p>
          </div>
        </div>
      </Card>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Pending Access Requests ({requests.length})
          </h4>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {request.avatar ? (
                    <img
                      src={request.avatar}
                      alt={request.username}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {request.username || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-600 truncate max-w-xs">
                      {request.user_id}
                    </p>
                    {request.message && (
                      <p className="text-sm text-gray-700 mt-1 italic">
                        "{request.message}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveRequest(request.id)}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectRequest(request.id)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Members List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-gray-900">
            Members ({filteredMembers.length})
          </h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">
              {searchQuery ? 'No members found' : 'No members yet. Invite someone to get started!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {member.username || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">
                      {member.user_id}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Joined {new Date(member.invited_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeUser(member.user_id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInviteDialog(false)}
        >
          <Card
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Invite Member</h3>
                <button
                  onClick={() => setShowInviteDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Address or User ID
                  </label>
                  <Input
                    placeholder="0x... or user ID"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && inviteUser()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the wallet address or user ID of the person you want to invite
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={inviteUser} className="flex-1">
                    <Send className="w-4 h-4 mr-2" />
                    Send Invite
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
