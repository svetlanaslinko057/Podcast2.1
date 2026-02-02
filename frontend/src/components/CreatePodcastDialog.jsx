import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { 
  Upload, X, Loader2, Image as ImageIcon, Music, 
  Radio, Send, ArrowRight, Mic, Play, ExternalLink,
  Lock, Globe, ArrowLeft
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const CreatePodcastDialog = ({ open, onClose, authorId, onSuccess }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('select'); // 'select', 'live', 'telegram', 'upload'
  const [loading, setLoading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [telegramChannels, setTelegramChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    cover_image: '',
    audio_file: null,
    is_live: false,
    visibility: 'public',
    telegram_channel_id: ''
  });
  
  const [audioFileName, setAudioFileName] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  useEffect(() => {
    if (open) {
      setMode('select');
      loadTelegramChannels();
    }
  }, [open]);

  const loadTelegramChannels = async () => {
    setLoadingChannels(true);
    try {
      const response = await axios.get(`${API}/telegram-streaming/channels/${authorId}`);
      setTelegramChannels(response.data || []);
    } catch (error) {
      console.error('Failed to load telegram channels:', error);
      setTelegramChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  };

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
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        cover_image: formData.cover_image || 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500',
        is_live: true,
        visibility: formData.visibility,
        language: 'en'
      });
      
      const podcastId = podcastRes.data.id;
      
      toast.success('Live room created!');
      onClose();
      navigate(`/live/${podcastId}`);
      
    } catch (error) {
      console.error('Failed to create live:', error);
      toast.error('Failed to start live broadcast');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramStream = () => {
    // Navigate to Telegram streaming settings
    onClose();
    navigate('/settings/streaming');
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }
    
    setUploadingAudio(true);
    setAudioFileName(file.name);
    
    try {
      setFormData(prev => ({ ...prev, audio_file: file }));
      toast.success('Audio file ready for upload');
    } catch (error) {
      toast.error('Failed to prepare audio file');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setUploadingCover(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
        setFormData(prev => ({ ...prev, cover_image: reader.result }));
      };
      reader.readAsDataURL(file);
      toast.success('Cover image uploaded');
    } catch (error) {
      toast.error('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    setLoading(true);
    
    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      const podcastData = {
        title: formData.title,
        description: formData.description,
        author_id: authorId,
        tags: tags,
        cover_image: formData.cover_image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500',
        is_live: false,
        visibility: formData.visibility,
        category: tags[0] || 'general',
        language: 'en'
      };
      
      const response = await axios.post(`${API}/podcasts`, podcastData);
      
      if (formData.audio_file) {
        const audioFormData = new FormData();
        audioFormData.append('file', formData.audio_file);
        
        try {
          await axios.post(
            `${API}/podcasts/${response.data.id}/audio`,
            audioFormData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
        } catch (audioError) {
          console.warn('Audio upload failed, but podcast created');
        }
      }
      
      toast.success('Podcast created successfully!');
      onSuccess?.();
      resetForm();
      onClose();
      
    } catch (error) {
      console.error('Failed to create podcast:', error);
      toast.error(error.response?.data?.detail || 'Failed to create podcast');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      tags: '',
      cover_image: '',
      audio_file: null,
      is_live: false,
      visibility: 'public',
      telegram_channel_id: ''
    });
    setAudioFileName('');
    setCoverPreview('');
    setMode('select');
  };

  // Mode Selection Screen
  const renderModeSelect = () => (
    <div className="space-y-4 py-4">
      {/* Live - Primary */}
      <button
        onClick={() => setMode('live')}
        className="w-full p-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl text-white text-left hover:from-red-600 hover:to-orange-600 transition-all group shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <Radio className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
              Start Live
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                Recommended
              </span>
            </h3>
            <p className="text-sm text-white/80 mt-1">
              Go live instantly and broadcast to your audience in real-time
            </p>
          </div>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* Telegram */}
      <button
        onClick={handleTelegramStream}
        className="w-full p-5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-white text-left hover:from-blue-600 hover:to-cyan-600 transition-all group shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <Send className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">Telegram Stream</h3>
            <p className="text-sm text-white/80 mt-1">
              Stream from Telegram Voice Chat to your platform
            </p>
            {telegramChannels.length > 0 && (
              <p className="text-xs text-white/60 mt-1">
                {telegramChannels.length} channel(s) connected
              </p>
            )}
          </div>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* Upload - Minimal */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setMode('upload')}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm">Upload audio file</span>
        </button>
      </div>
    </div>
  );

  // Live Form with Visibility Toggle
  const renderLiveForm = () => (
    <div className="space-y-5 py-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setMode('select')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back to options
      </button>

      {/* Header */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Start Live Broadcast</h3>
            <p className="text-sm text-gray-600">Go live with your audience</p>
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter broadcast title..."
          className="mt-1"
        />
      </div>
      
      {/* Description */}
      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What is this broadcast about?"
          className="mt-1 min-h-[60px]"
        />
      </div>

      {/* Visibility Toggle */}
      <div>
        <Label className="mb-2 block">Visibility</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, visibility: 'public' })}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              formData.visibility === 'public'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                formData.visibility === 'public' ? 'bg-emerald-500' : 'bg-gray-200'
              }`}>
                <Globe className={`w-5 h-5 ${
                  formData.visibility === 'public' ? 'text-white' : 'text-gray-500'
                }`} />
              </div>
              <div>
                <p className={`font-semibold ${
                  formData.visibility === 'public' ? 'text-emerald-700' : 'text-gray-700'
                }`}>Public</p>
                <p className="text-xs text-gray-500">Anyone can join</p>
              </div>
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData({ ...formData, visibility: 'private' })}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              formData.visibility === 'private'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                formData.visibility === 'private' ? 'bg-purple-500' : 'bg-gray-200'
              }`}>
                <Lock className={`w-5 h-5 ${
                  formData.visibility === 'private' ? 'text-white' : 'text-gray-500'
                }`} />
              </div>
              <div>
                <p className={`font-semibold ${
                  formData.visibility === 'private' ? 'text-purple-700' : 'text-gray-700'
                }`}>Private</p>
                <p className="text-xs text-gray-500">Invite only</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <Input
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="tech, podcast, live"
          className="mt-1"
        />
      </div>

      {/* Start Button */}
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
    <form onSubmit={handleSubmit} className="space-y-5 py-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setMode('select')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        ← Back to options
      </button>

      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter podcast title"
          className="mt-1"
          required
        />
      </div>
      
      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your podcast..."
          className="mt-1 min-h-[80px]"
        />
      </div>
      
      {/* Tags */}
      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="ai, technology, blockchain"
          className="mt-1"
        />
      </div>
      
      {/* Cover & Audio Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cover Image */}
        <div>
          <Label>Cover</Label>
          <div className="mt-2">
            {coverPreview ? (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden border">
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                <button
                  type="button"
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
              <label className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500">
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

        {/* Audio File */}
        <div>
          <Label>Audio File *</Label>
          <div className="mt-2">
            {audioFileName ? (
              <div className="w-full aspect-square border border-emerald-200 bg-emerald-50 rounded-xl flex flex-col items-center justify-center p-4 relative">
                <Music className="w-8 h-8 text-emerald-600" />
                <span className="text-xs text-emerald-700 mt-2 text-center truncate w-full px-2">
                  {audioFileName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAudioFileName('');
                    setFormData({ ...formData, audio_file: null });
                  }}
                  className="absolute top-2 right-2 text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500">
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
      
      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || !formData.title}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Podcast'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="px-6 rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {mode === 'select' ? 'Create New Content' : 
             mode === 'live' ? 'Start Live Broadcast' :
             mode === 'upload' ? 'Upload Podcast' : 'Create'}
          </DialogTitle>
        </DialogHeader>
        
        {mode === 'select' && renderModeSelect()}
        {mode === 'live' && renderLiveForm()}
        {mode === 'upload' && renderUploadForm()}
      </DialogContent>
    </Dialog>
  );
};
