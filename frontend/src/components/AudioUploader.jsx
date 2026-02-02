import React, { useState, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Upload, Mic, Music, FileAudio, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SUPPORTED_FORMATS = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const AudioUploader = ({ podcastId, onUploadComplete }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      toast.error('Unsupported format. Use MP3, WAV, OGG, M4A, or AAC');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 100MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);

      const response = await axios.post(`${API}/podcasts/${podcastId}/audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      toast.success('Audio uploaded successfully!');
      setSelectedFile(null);
      setUploadProgress(0);
      
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload audio');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (file) => {
    // Estimate duration based on file size (rough estimate for MP3)
    const bitrate = 128000; // 128kbps typical
    const durationSeconds = (file.size * 8) / bitrate;
    const mins = Math.floor(durationSeconds / 60);
    const secs = Math.floor(durationSeconds % 60);
    return `~${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-emerald-600" />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Upload Audio File
          </h3>
          <p className="text-gray-500 mb-4">
            Drag and drop your audio file here, or click to browse
          </p>
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Music className="w-4 h-4 mr-2" />
            Select Audio File
          </Button>
          
          <p className="text-xs text-gray-400 mt-4">
            Supported: MP3, WAV, OGG, M4A, AAC • Max 100MB
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected File Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileAudio className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span>{formatDuration(selectedFile)}</span>
                <span>•</span>
                <span>{selectedFile.type.split('/')[1].toUpperCase()}</span>
              </div>
            </div>
            {!uploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-medium text-emerald-600">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Upload Audio
                </>
              )}
            </Button>
            {!uploading && (
              <Button
                variant="outline"
                onClick={() => setSelectedFile(null)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
