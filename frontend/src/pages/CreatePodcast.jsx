import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { 
  Upload, Loader2, Radio, Send, ArrowRight, ArrowLeft, 
  Image as ImageIcon, Music, X, Play, Lock, Globe, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const CreatePodcast = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { walletAddress } = useWallet();
  const initialMode = searchParams.get('mode') || 'select';
  
  const [mode, setMode] = useState(initialMode); // 'select', 'live', 'telegram', 'upload'
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [telegramChannels, setTelegramChannels] = useState([]);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  
  const currentUserId = user?.id || walletAddress || (() => {
    const testMode = localStorage.getItem('testMode') || 'user';
    return testMode === 'admin' ? 'demo-author-123' : 'demo-user-123';
  })();
  const authorId = currentUserId;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    cover_image: '',
    visibility: 'public'
  });
  
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  useEffect(() => {
    checkAccess();
    loadTelegramChannels();
  }, [walletAddress]);

  const checkAccess = async () => {
    try {
      setCheckingAccess(true);
      
      // Check wallet-based admin role
      if (walletAddress) {
        const roleResponse = await axios.get(`${API}/admin/check-role/${walletAddress}`);
        const isAdmin = roleResponse.data?.is_admin || roleResponse.data?.is_owner;
        
        if (isAdmin) {
          setHasAccess(true);
        } else {
          // Not admin - redirect silently
          navigate('/');
        }
      } else {
        // No wallet connected - redirect silently
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to check access:', error);
      navigate('/');
    } finally {
      setCheckingAccess(false);
    }
  };

  const loadTelegramChannels = async () => {
    try {
      const response = await axios.get(`${API}/telegram-streaming/channels/${authorId}`);
      setTelegramChannels(response.data || []);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setUploadingCover(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
      setFormData(prev => ({ ...prev, cover_image: reader.result }));
      setUploadingCover(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }
    
    setAudioFile(file);
    setAudioFileName(file.name);
    toast.success('Audio file ready');
  };

  // Start Live Broadcast
  const handleStartLive = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create podcast first
      const podcastRes = await axios.post(`${API}/podcasts`, {
        title: formData.title,
        description: formData.description || 'Live broadcast',
        author_id: authorId,
        category: formData.category || null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        cover_image: formData.cover_image || 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500',
        is_live: true,
        visibility: 'public',
        language: 'en'
      });
      
      const podcastId = podcastRes.data.id;
      
      // Start live broadcast
      const liveFormData = new FormData();
      liveFormData.append('podcast_id', podcastId);
      liveFormData.append('author_id', authorId);
      liveFormData.append('title', formData.title);
      
      try {
        await axios.post(`${API}/live/broadcast/start`, liveFormData);
      } catch (e) {
        console.log('Broadcast API not available, continuing...');
      }
      
      toast.success('Live room created!');
      navigate(`/live/${podcastId}`);
      
    } catch (error) {
      console.error('Failed to create live:', error);
      toast.error('Failed to start live broadcast');
    } finally {
      setLoading(false);
    }
  };

  // Upload Podcast
  const handleUploadPodcast = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    if (!audioFile) {
      toast.error('Please upload an audio file');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create podcast
      const podcastRes = await axios.post(`${API}/podcasts`, {
        title: formData.title,
        description: formData.description,
        author_id: authorId,
        category: formData.category || null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        cover_image: formData.cover_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500',
        is_live: false,
        visibility: 'public',
        language: 'en'
      });
      
      const podcastId = podcastRes.data.id;
      
      // Upload audio
      const audioFormData = new FormData();
      audioFormData.append('audio', audioFile);
      
      await axios.post(`${API}/podcasts/${podcastId}/upload`, audioFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Podcast created successfully!');
      navigate(`/podcast/${podcastId}`);
      
    } catch (error) {
      console.error('Failed to create podcast:', error);
      toast.error('Failed to create podcast');
    } finally {
      setLoading(false);
    }
  };

  // Mode Selection Screen
  const renderModeSelect = () => (
    <div className="space-y-5">
      {/* Live - Primary */}
      <button
        onClick={() => setMode('live')}
        className="w-full p-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl text-white text-left hover:from-red-600 hover:to-orange-600 transition-all group shadow-xl"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Radio className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold flex items-center gap-3">
              Start Live
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                Recommended
              </span>
            </h3>
            <p className="text-white/80 mt-1">
              Go live instantly and broadcast to your audience in real-time
            </p>
          </div>
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* Upload - Minimal */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => setMode('upload')}
          className="flex items-center gap-2 px-5 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-transparent hover:border-gray-200"
        >
          <Upload className="w-5 h-5" />
          <span>Upload audio file</span>
        </button>
      </div>
    </div>
  );

  // Live Form
  const renderLiveForm = () => (
    <div className="space-y-6">
      <button
        onClick={() => setMode('select')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to options
      </button>
      
      <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Start Live Broadcast</h3>
            <p className="text-sm text-gray-600">Go live with your audience</p>
          </div>
        </div>
      </div>

      <div>
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter broadcast title..."
          className="mt-1"
        />
      </div>
      
      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What is this broadcast about?"
          className="mt-1 min-h-[80px]"
        />
      </div>
      
      <div>
        <Label>Category</Label>
        <Input
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., DeFi, Technology, News"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">Main category for this podcast</p>
      </div>
      
      <div>
        <Label>Tags</Label>
        <Input
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="tech, podcast, live"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">Additional tags, separated by commas</p>
      </div>

      <Button
        onClick={handleStartLive}
        disabled={loading || !formData.title}
        className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-lg rounded-xl"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2" />
            Go Live Now
          </>
        )}
      </Button>
    </div>
  );

  // Upload Form
  const renderUploadForm = () => (
    <div className="space-y-6">
      <button
        onClick={() => setMode('select')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to options
      </button>

      <div>
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter podcast title..."
          className="mt-1"
        />
      </div>
      
      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your podcast..."
          className="mt-1 min-h-[80px]"
        />
      </div>
      
      <div>
        <Label>Category</Label>
        <Input
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., DeFi, Technology, News"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">Main category for this podcast</p>
      </div>
      
      <div>
        <Label>Tags</Label>
        <Input
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="ai, technology, podcast"
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">Additional tags, separated by commas</p>
      </div>
      
      {/* Cover & Audio */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cover Image</Label>
          <div className="mt-2">
            {coverPreview ? (
              <div className="relative aspect-square rounded-xl overflow-hidden border">
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setCoverPreview('');
                    setFormData({ ...formData, cover_image: '' });
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500">
                <ImageIcon className="w-8 h-8 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <Label>Audio File *</Label>
          <div className="mt-2">
            {audioFileName ? (
              <div className="aspect-square border border-emerald-200 bg-emerald-50 rounded-xl flex flex-col items-center justify-center p-4 relative">
                <Music className="w-8 h-8 text-emerald-600" />
                <span className="text-xs text-emerald-700 mt-2 text-center truncate w-full">
                  {audioFileName}
                </span>
                <button
                  onClick={() => {
                    setAudioFile(null);
                    setAudioFileName('');
                  }}
                  className="absolute top-2 right-2 text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500">
                <Music className="w-8 h-8 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">MP3, WAV</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>
      
      <Button
        onClick={handleUploadPodcast}
        disabled={loading || !formData.title || !audioFile}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg rounded-xl"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          'Create Podcast'
        )}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-2xl mx-auto px-6">
        {/* Access Check Loading */}
        {checkingAccess && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        )}

        {/* Has Access - Show Create Form */}
        {!checkingAccess && hasAccess && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create New Content
              </h1>
              <p className="text-gray-600">
                Choose how you want to share with your audience
              </p>
            </div>
            
            <Card className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">
              {mode === 'select' && renderModeSelect()}
              {mode === 'live' && renderLiveForm()}
              {mode === 'upload' && renderUploadForm()}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
