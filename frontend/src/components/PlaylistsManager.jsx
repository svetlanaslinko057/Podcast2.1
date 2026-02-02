import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  List, Plus, Play, Trash2, Edit, Search, Clock, 
  Headphones, Music, X, Check
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PlaylistsManager = ({ userId }) => {
  const [playlists, setPlaylists] = useState([]);
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadPlaylists();
    loadPodcasts();
  }, [userId]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/playlists/user/${userId}`);
      setPlaylists(response.data);
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPodcasts = async () => {
    try {
      const response = await axios.get(`${API}/podcasts?limit=100`);
      setPodcasts(response.data);
    } catch (error) {
      console.error('Failed to load podcasts:', error);
    }
  };

  const createPlaylist = async () => {
    if (!createForm.name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    try {
      const response = await axios.post(`${API}/playlists`, {
        ...createForm,
        user_id: userId,
        podcast_ids: []
      });

      toast.success('Playlist created!');
      setPlaylists([response.data, ...playlists]);
      setShowCreateDialog(false);
      setCreateForm({ name: '', description: '' });
    } catch (error) {
      toast.error('Failed to create playlist');
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (!confirm('Delete this playlist?')) return;

    try {
      await axios.delete(`${API}/playlists/${playlistId}`);
      toast.success('Playlist deleted');
      setPlaylists(playlists.filter(p => p.id !== playlistId));
    } catch (error) {
      toast.error('Failed to delete playlist');
    }
  };

  const addPodcastToPlaylist = async (playlistId, podcastId) => {
    try {
      await axios.post(`${API}/playlists/${playlistId}/add/${podcastId}`);
      toast.success('Added to playlist!');
      loadPlaylists();
    } catch (error) {
      toast.error('Failed to add to playlist');
    }
  };

  const removePodcastFromPlaylist = async (playlistId, podcastId) => {
    try {
      await axios.delete(`${API}/playlists/${playlistId}/remove/${podcastId}`);
      toast.success('Removed from playlist');
      loadPlaylists();
    } catch (error) {
      toast.error('Failed to remove from playlist');
    }
  };

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalDuration = (playlist) => {
    if (!playlist.podcasts || playlist.podcasts.length === 0) return '0:00';
    const totalSeconds = playlist.podcasts.reduce((sum, p) => sum + (p.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading playlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Playlists</h1>
          <p className="text-gray-600">Organize your favorite podcasts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Playlist
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search playlists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Playlists Grid */}
      {filteredPlaylists.length === 0 ? (
        <Card className="p-12 text-center">
          <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No playlists found' : 'No playlists yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery ? 'Try a different search term' : 'Create your first playlist to organize your podcasts'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Playlist
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists.map((playlist) => (
            <Card
              key={playlist.id}
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
            >
              {/* Cover */}
              <div
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                className="relative aspect-square bg-gradient-to-br from-emerald-400 to-teal-500 overflow-hidden"
              >
                {playlist.podcasts && playlist.podcasts.length > 0 && playlist.podcasts[0].cover_image ? (
                  <img
                    src={playlist.podcasts[0].cover_image}
                    alt={playlist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <List className="w-20 h-20 text-white opacity-50" />
                  </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 text-emerald-500 ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>

                {/* Badge */}
                <div className="absolute top-2 right-2">
                  <Badge className="bg-black bg-opacity-70 text-white">
                    {playlist.podcasts?.length || 0} episodes
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">
                  {playlist.name}
                </h3>
                {playlist.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {playlist.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {getTotalDuration(playlist)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5" />
                    {playlist.podcasts?.length || 0}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingPlaylist(playlist)}
                    className="flex-1"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deletePlaylist(playlist.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Playlist Name
              </label>
              <Input
                placeholder="My Awesome Playlist"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <Input
                placeholder="A collection of..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={createPlaylist} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
