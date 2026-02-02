import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Bookmark, Heart, List, Plus, Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useWallet } from '../context/WalletContext';

// Import refactored components
import { 
  LibraryPodcastCard, 
  LibraryPlaylistCard, 
  CreatePlaylistDialog,
  EditPlaylistDialog,
  SharePlaylistDialog
} from '../components/library';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Library = () => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState('saved');
  const [savedPodcasts, setSavedPodcasts] = useState([]);
  const [likedPodcasts, setLikedPodcasts] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [sharingPlaylist, setSharingPlaylist] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const userId = walletAddress || 'demo-user-123';
  
  useEffect(() => {
    fetchLibraryData();
  }, [activeTab, userId]);
  
  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      
      switch (activeTab) {
        case 'saved':
          const savedRes = await axios.get(`${API}/library/saved/${userId}`);
          setSavedPodcasts(savedRes.data);
          break;
        case 'liked':
          const likedRes = await axios.get(`${API}/library/liked/${userId}`);
          setLikedPodcasts(likedRes.data);
          break;
        case 'playlists':
          const playlistRes = await axios.get(`${API}/users/${userId}/playlists`);
          setPlaylists(playlistRes.data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Playlist handlers
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    try {
      await axios.post(`${API}/playlists`, {
        user_id: userId,
        name: newPlaylistName,
        description: newPlaylistDesc,
        is_public: true
      });
      toast.success('Playlist created!');
      setShowCreateDialog(false);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      fetchLibraryData();
    } catch (error) {
      toast.error('Failed to create playlist');
    }
  };
  
  const handleEditPlaylist = async () => {
    if (!editingPlaylist) return;
    try {
      await axios.put(`${API}/playlists/${editingPlaylist.id}`, {
        name: editingPlaylist.name,
        description: editingPlaylist.description
      });
      toast.success('Playlist updated!');
      setShowEditDialog(false);
      setEditingPlaylist(null);
      fetchLibraryData();
    } catch (error) {
      toast.error('Failed to update playlist');
    }
  };
  
  const handleDeletePlaylist = async (playlistId) => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await axios.delete(`${API}/playlists/${playlistId}`);
      toast.success('Playlist deleted');
      fetchLibraryData();
    } catch (error) {
      toast.error('Failed to delete playlist');
    }
  };
  
  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/playlist/${sharingPlaylist.id}`);
    toast.success('Link copied to clipboard!');
  };
  
  const shareToTwitter = () => {
    const url = `${window.location.origin}/playlist/${sharingPlaylist.id}`;
    const text = `Check out my playlist "${sharingPlaylist.name}" on FOMO!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };
  
  // Podcast handlers
  const handleUnsave = async (podcastId) => {
    try {
      await axios.delete(`${API}/podcasts/${podcastId}/save`, { data: { user_id: userId } });
      toast.success('Removed from saved');
      fetchLibraryData();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };
  
  const handleUnlike = async (podcastId) => {
    try {
      await axios.delete(`${API}/podcasts/${podcastId}/like`, { data: { user_id: userId } });
      toast.success('Removed from liked');
      fetchLibraryData();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };
  
  // Empty state component
  const EmptyState = ({ icon: Icon, title, description, action, actionLabel, iconBgClass = "bg-gray-100" }) => (
    <Card className="bg-white rounded-2xl p-12 text-center">
      <div className={`w-20 h-20 ${iconBgClass} rounded-full flex items-center justify-center mx-auto mb-4`}>
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action && (
        <Button onClick={action} className="bg-emerald-500 hover:bg-emerald-600">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
  
  // Loading state
  const LoadingState = () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="mb-8 pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-4">
            <Bookmark className="w-4 h-4" />
            Your Collection
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            <span className="text-gray-900">My </span>
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Library</span>
          </h1>
          <p className="text-gray-600">Your saved podcasts and playlists</p>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border rounded-xl p-1 mb-8">
            <TabsTrigger value="saved" className="rounded-lg">
              <Bookmark className="w-4 h-4 mr-2" />Saved ({savedPodcasts.length})
            </TabsTrigger>
            <TabsTrigger value="liked" className="rounded-lg">
              <Heart className="w-4 h-4 mr-2" />Liked ({likedPodcasts.length})
            </TabsTrigger>
            <TabsTrigger value="playlists" className="rounded-lg">
              <List className="w-4 h-4 mr-2" />Playlists ({playlists.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Saved Tab */}
          <TabsContent value="saved">
            {loading ? <LoadingState /> : savedPodcasts.length === 0 ? (
              <EmptyState icon={Bookmark} title="No saved podcasts" description="Save podcasts to listen later" action={() => navigate('/')} actionLabel="Explore Podcasts" />
            ) : (
              <div className="space-y-3">
                {savedPodcasts.map((podcast) => (
                  <LibraryPodcastCard key={podcast.id} podcast={podcast} onRemove={handleUnsave} />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Liked Tab */}
          <TabsContent value="liked">
            {loading ? <LoadingState /> : likedPodcasts.length === 0 ? (
              <EmptyState icon={Heart} title="No liked podcasts" description="Like podcasts you enjoy" action={() => navigate('/')} actionLabel="Explore Podcasts" />
            ) : (
              <div className="space-y-3">
                {likedPodcasts.map((podcast) => (
                  <LibraryPodcastCard key={podcast.id} podcast={podcast} onRemove={handleUnlike} />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Playlists Tab */}
          <TabsContent value="playlists">
            <div className="mb-6">
              <CreatePlaylistDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                name={newPlaylistName}
                setName={setNewPlaylistName}
                description={newPlaylistDesc}
                setDescription={setNewPlaylistDesc}
                onCreate={handleCreatePlaylist}
                trigger={<Button className="bg-emerald-500 hover:bg-emerald-600"><Plus className="w-4 h-4 mr-2" />Create Playlist</Button>}
              />
            </div>
            {loading ? <LoadingState /> : playlists.length === 0 ? (
              <EmptyState icon={List} title="No playlists yet" description="Create playlists to organize your podcasts" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {playlists.map((playlist) => (
                  <LibraryPlaylistCard 
                    key={playlist.id} 
                    playlist={playlist}
                    onShare={(p) => { setSharingPlaylist(p); setShowShareDialog(true); }}
                    onEdit={(p) => { setEditingPlaylist(p); setShowEditDialog(true); }}
                    onDelete={handleDeletePlaylist}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Dialogs */}
        <EditPlaylistDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          playlist={editingPlaylist}
          setPlaylist={setEditingPlaylist}
          onSave={handleEditPlaylist}
        />
        
        <SharePlaylistDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          playlist={sharingPlaylist}
          onCopyLink={copyShareLink}
          onShareTwitter={shareToTwitter}
        />
        
      </div>
    </div>
  );
};
