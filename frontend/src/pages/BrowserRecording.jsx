import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Mic, Square, Pause, Play, Save, X, Settings, Volume2,
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export function BrowserRecording() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Setup audio level monitoring
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Monitor audio levels
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!isRecording) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(Math.min(100, (average / 255) * 200));
        requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Setup MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start(1000); // Collect chunks every second

      // Create recording session
      const formData = new FormData();
      formData.append('author_id', 'demo-author-123');
      formData.append('title', 'Untitled Recording');

      const response = await axios.post(`${API_URL}/api/recording/start`, formData);
      setSessionId(response.data.session_id);

      setIsRecording(true);
      toast.success('Recording started!');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      toast.info('Recording paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      toast.success('Recording resumed');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      setShowSaveDialog(true);
    }
  };

  const discardRecording = async () => {
    if (sessionId) {
      try {
        await axios.post(`${API_URL}/api/recording/${sessionId}/stop`);
      } catch (error) {
        console.error('Failed to stop session:', error);
      }
    }
    
    chunksRef.current = [];
    setDuration(0);
    setSessionId(null);
    setShowSaveDialog(false);
    toast.info('Recording discarded');
  };

  const saveRecording = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      setSaving(true);

      // Stop session
      if (sessionId) {
        await axios.post(`${API_URL}/api/recording/${sessionId}/stop`);
      }

      // Create audio blob
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      // Save as podcast
      const response = await axios.post(`${API_URL}/api/recording/${sessionId}/save`, {
        title,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      });

      toast.success('Recording saved as podcast!');
      navigate(`/podcast/${response.data.podcast_id}`);
    } catch (error) {
      console.error('Failed to save recording:', error);
      toast.error('Failed to save recording');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-700 text-sm font-medium mb-6">
            <Mic className="w-4 h-4" />
            Browser Recording
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Record Your <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">Podcast</span>
          </h1>
          <p className="text-gray-600">
            Record directly in your browser with professional quality audio
          </p>
        </div>

        {/* Recording Interface */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          {/* Status Display */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-4 ${
              isRecording
                ? isPaused
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {isRecording && !isPaused && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
              <span className="text-2xl font-bold">{formatTime(duration)}</span>
            </div>

            <p className="text-sm text-gray-600">
              {isRecording 
                ? isPaused 
                  ? 'Recording paused' 
                  : 'Recording in progress...'
                : 'Ready to record'
              }
            </p>
          </div>

          {/* Audio Level Meter */}
          {isRecording && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Volume2 className="w-5 h-5 text-gray-600" />
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600 w-12 text-right">
                  {Math.round(audioLevel)}%
                </span>
              </div>
            </div>
          )}

          {/* Recording Controls */}
          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold flex items-center gap-3 transition-all shadow-lg shadow-red-500/30"
                data-testid="start-recording-btn"
              >
                <Mic className="w-6 h-6" />
                Start Recording
              </button>
            ) : (
              <>
                {!isPaused ? (
                  <button
                    onClick={pauseRecording}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-medium flex items-center gap-2"
                    data-testid="pause-recording-btn"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={resumeRecording}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-medium flex items-center gap-2"
                    data-testid="resume-recording-btn"
                  >
                    <Play className="w-5 h-5" />
                    Resume
                  </button>
                )}

                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-medium flex items-center gap-2"
                  data-testid="stop-recording-btn"
                >
                  <Square className="w-5 h-5" />
                  Stop & Save
                </button>
              </>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            Recording Settings
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded" defaultChecked />
              <span className="text-sm font-medium text-gray-700">Echo Cancellation</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded" defaultChecked />
              <span className="text-sm font-medium text-gray-700">Noise Suppression</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded" defaultChecked />
              <span className="text-sm font-medium text-gray-700">Auto Gain Control</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded" />
              <span className="text-sm font-medium text-gray-700">Stereo Mode</span>
            </label>
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Save Recording</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter podcast title"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    data-testid="recording-title-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your podcast"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={discardRecording}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2"
                  data-testid="discard-recording-btn"
                >
                  <X className="w-5 h-5" />
                  Discard
                </button>
                <button
                  onClick={saveRecording}
                  disabled={saving || !title.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  data-testid="save-recording-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
