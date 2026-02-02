import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { 
  Lock, Plus, Trash2, Users, Search, X, Check, 
  UserPlus, UserMinus, Crown, Shield, Mic, Edit, Filter,
  SortAsc, SortDesc, Calendar, Clock, Star, Ban, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Access levels
const ACCESS_LEVELS = [
  { value: 'full', label: 'Full Access', icon: Crown, color: 'text-amber-600 bg-amber-100' },
  { value: 'limited', label: 'Limited Access', icon: Shield, color: 'text-blue-600 bg-blue-100' },
  { value: 'preview', label: 'Preview Only', icon: Lock, color: 'text-gray-600 bg-gray-100' }
];

export const PrivateClubManager = ({ authorId }) => {
  const navigate = useNavigate();
  const [clubMembers, setClubMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [privatePodcasts, setPrivatePodcasts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  
  // Filters and sorting
  const [sortBy, setSortBy] = useState('date_joined');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterAccess, setFilterAccess] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    total_members: 0,
    pending_requests: 0,
    private_podcasts: 0
  });

  useEffect(() => {
    loadClubData();
  }, [authorId]);

  const loadClubData = async () => {
    try {
      setLoading(true);
      
      // Load club members (global club members for this author)
      const membersRes = await axios.get(`${API}/club/${authorId}/members`).catch(() => ({ data: [] }));
      setClubMembers(membersRes.data || []);
      
      // Load pending requests
      const requestsRes = await axios.get(`${API}/club/${authorId}/requests`).catch(() => ({ data: [] }));
      setPendingRequests(requestsRes.data || []);
      
      // Load private podcasts count
      const podcastsRes = await axios.get(`${API}/podcasts`, {
        params: { author_id: authorId, visibility: 'private' }
      }).catch(() => ({ data: [] }));
      setPrivatePodcasts(podcastsRes.data || []);
      
      // Update stats
      setStats({
        total_members: membersRes.data?.length || 0,
        pending_requests: requestsRes.data?.length || 0,
        private_podcasts: podcastsRes.data?.length || 0
      });
      
    } catch (error) {
      console.error('Failed to load club data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await axios.get(`${API}/authors`);
      setAllUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const addMemberToClub = async (userId, accessLevel = 'full') => {
    try {
      await axios.post(`${API}/club/${authorId}/members`, {
        user_id: userId,
        access_level: accessLevel
      });
      toast.success('Member added to club!');
      loadClubData();
      setShowAddDialog(false);
      setSearchQuery('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add member');
    }
  };

  const removeMemberFromClub = async (userId) => {
    if (!window.confirm('Remove this member from your private club? They will lose access to all private podcasts.')) return;

    try {
      await axios.delete(`${API}/club/${authorId}/members/${userId}`);
      toast.success('Member removed from club');
      loadClubData();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const updateMemberAccess = async (userId, accessLevel) => {
    try {
      await axios.put(`${API}/club/${authorId}/members/${userId}`, {
        access_level: accessLevel
      });
      toast.success('Access level updated');
      loadClubData();
      setEditingMember(null);
    } catch (error) {
      toast.error('Failed to update access');
    }
  };

  const approveRequest = async (requestId) => {
    try {
      await axios.post(`${API}/club/${authorId}/requests/${requestId}/approve`);
      toast.success('Request approved! Member added to club.');
      loadClubData();
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.post(`${API}/club/${authorId}/requests/${requestId}/reject`);
      toast.success('Request rejected');
      loadClubData();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  // Filter and sort members
  const filteredMembers = clubMembers
    .filter(member => {
      const matchesSearch = 
        member.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user_id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterAccess === 'all' || member.access_level === filterAccess;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date_joined') {
        comparison = new Date(a.joined_at) - new Date(b.joined_at);
      } else if (sortBy === 'name') {
        comparison = (a.username || '').localeCompare(b.username || '');
      } else if (sortBy === 'access_level') {
        const order = { full: 0, limited: 1, preview: 2 };
        comparison = (order[a.access_level] || 0) - (order[b.access_level] || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const availableUsers = allUsers.filter(user => 
    !clubMembers.some(m => m.user_id === user.id) &&
    user.id !== authorId &&
    (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.id?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getAccessBadge = (level) => {
    const access = ACCESS_LEVELS.find(a => a.value === level) || ACCESS_LEVELS[0];
    const Icon = access.icon;
    return (
      <Badge className={`${access.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {access.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Club...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Crown className="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Private Club</h2>
              <p className="text-gray-600">Manage members who access your private content</p>
            </div>
          </div>
          <Button 
            onClick={() => {
              loadAllUsers();
              setShowAddDialog(true);
            }}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-gray-600">Club Members</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total_members}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-600">Pending Requests</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pending_requests}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-600">Private Podcasts</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.private_podcasts}</p>
          </div>
        </div>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Pending Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-orange-200 text-orange-700">
                      {(request.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {request.username || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-600">
                      Requested {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                    {request.message && (
                      <p className="text-sm text-gray-700 mt-1 italic bg-white p-2 rounded">
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
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectRequest(request.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Members Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Club Members ({filteredMembers.length})
          </h3>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterAccess} onValueChange={setFilterAccess}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Access</SelectItem>
              <SelectItem value="full">Full Access</SelectItem>
              <SelectItem value="limited">Limited Access</SelectItem>
              <SelectItem value="preview">Preview Only</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SortAsc className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_joined">Date Joined</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="access_level">Access Level</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>
        </div>

        {/* Members List */}
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">
              {searchQuery || filterAccess !== 'all' ? 'No members match your filters' : 'No club members yet'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {!searchQuery && filterAccess === 'all' && 'Add members to give them access to your private podcasts'}
            </p>
            {!searchQuery && filterAccess === 'all' && (
              <Button 
                onClick={() => {
                  loadAllUsers();
                  setShowAddDialog(true);
                }}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Member
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {(member.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">
                        {member.username || 'Anonymous'}
                      </p>
                      {getAccessBadge(member.access_level)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingMember(member)}
                    className="text-gray-600 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMemberFromClub(member.user_id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Private Podcast CTA (if none exist) */}
      {privatePodcasts.length === 0 && clubMembers.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Mic className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Create Private Content</h3>
              <p className="text-sm text-gray-600">
                You have {clubMembers.length} club member(s) waiting! Create a private podcast to share exclusive content.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/create')}
              className="bg-purple-500 hover:bg-purple-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Podcast
            </Button>
          </div>
        </Card>
      )}

      {/* Add Member Dialog */}
      {showAddDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddDialog(false)}
        >
          <Card
            className="max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add Member to Club</h3>
                  <p className="text-sm text-gray-600">Members will get access to all your private podcasts</p>
                </div>
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    {searchQuery ? 'No users found' : 'Start typing to search users...'}
                  </p>
                ) : (
                  availableUsers.slice(0, 20).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-gray-200">
                            {(user.username || user.name || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.username || user.name || 'Anonymous'}
                          </p>
                          <p className="text-xs text-gray-500">{user.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          defaultValue="full"
                          onValueChange={(value) => addMemberToClub(user.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Access Level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-amber-500" />
                                Full Access
                              </div>
                            </SelectItem>
                            <SelectItem value="limited">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-500" />
                                Limited
                              </div>
                            </SelectItem>
                            <SelectItem value="preview">
                              <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-gray-500" />
                                Preview
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Member Access Dialog */}
      {editingMember && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingMember(null)}
        >
          <Card
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Edit Member Access</h3>
                <button
                  onClick={() => setEditingMember(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700">
                    {(editingMember.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{editingMember.username || 'Anonymous'}</p>
                  <p className="text-xs text-gray-500">{editingMember.user_id}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Access Level</label>
                {ACCESS_LEVELS.map((level) => {
                  const Icon = level.icon;
                  const isActive = editingMember.access_level === level.value;
                  return (
                    <button
                      key={level.value}
                      onClick={() => updateMemberAccess(editingMember.user_id, level.value)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        isActive 
                          ? 'border-amber-500 bg-amber-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${level.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">{level.label}</p>
                        <p className="text-xs text-gray-500">
                          {level.value === 'full' && 'Access to all private podcasts'}
                          {level.value === 'limited' && 'Access to selected podcasts only'}
                          {level.value === 'preview' && 'Can see previews but not full content'}
                        </p>
                      </div>
                      {isActive && <CheckCircle className="w-5 h-5 text-amber-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
