import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  FileText, Edit3, Save, X, Sparkles, Download, Copy, 
  Play, Pause, Clock, ArrowLeft, Loader2, CheckCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export function TranscriptViewer() {
  const { podcastId } = useParams();
  const [podcast, setPodcast] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    loadData();
  }, [podcastId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load podcast
      const podcastRes = await axios.get(`${API_URL}/api/podcasts/${podcastId}`);
      setPodcast(podcastRes.data);
      
      // Try to load transcript
      try {
        const transcriptRes = await axios.get(`${API_URL}/api/ai/transcript/${podcastId}`);
        setTranscript(transcriptRes.data);
        setEditedText(transcriptRes.data.full_text);
      } catch (err) {
        // Transcript doesn't exist yet
        console.log('No transcript found');
      }
      
      // Try to load AI summary
      try {
        const summaryRes = await axios.get(`${API_URL}/api/ai/summary/${podcastId}`);
        setAiSummary(summaryRes.data);
      } catch (err) {
        console.log('No AI summary found');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load podcast data');
    } finally {
      setLoading(false);
    }
  };

  const generateTranscript = async () => {
    try {
      setGenerating(true);
      toast.info('Generating transcript... This may take a few minutes.');
      
      const response = await axios.post(`${API_URL}/api/ai/transcribe/${podcastId}`);
      toast.success('Transcript generated successfully!');
      
      await loadData();
    } catch (error) {
      console.error('Transcription failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate transcript');
    } finally {
      setGenerating(false);
    }
  };

  const generateSummary = async () => {
    if (!transcript) {
      toast.error('Please generate transcript first');
      return;
    }
    
    try {
      setGeneratingSummary(true);
      toast.info('Generating AI summary...');
      
      const response = await axios.post(`${API_URL}/api/ai/summary/${podcastId}`);
      setAiSummary(response.data.summary);
      toast.success('AI summary generated!');
    } catch (error) {
      console.error('Summary generation failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const saveTranscript = async () => {
    try {
      const formData = new FormData();
      formData.append('full_text', editedText);
      
      await axios.put(`${API_URL}/api/ai/transcript/${podcastId}`, formData);
      toast.success('Transcript saved!');
      setIsEditing(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save transcript');
    }
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript?.full_text || '');
    toast.success('Transcript copied to clipboard!');
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript?.full_text || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${podcast?.title || 'podcast'}.txt`;
    a.click();
    toast.success('Transcript downloaded!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center pt-24">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-32">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <Link to={`/podcast/${podcastId}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Podcast
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Transcript</span>
              </h1>
              <p className="text-gray-600">{podcast?.title}</p>
            </div>
            
            {!transcript && (
              <button
                onClick={generateTranscript}
                disabled={generating}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white rounded-2xl font-medium flex items-center gap-2 transition-all"
                data-testid="generate-transcript-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Transcript
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* AI Summary Card */}
        {transcript && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                AI Summary
              </h2>
              {!aiSummary && (
                <button
                  onClick={generateSummary}
                  disabled={generatingSummary}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                  data-testid="generate-summary-btn"
                >
                  {generatingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              )}
            </div>

            {aiSummary ? (
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                  <p className="text-gray-700">{aiSummary.summary}</p>
                </div>

                {/* Key Points */}
                {aiSummary.key_points && aiSummary.key_points.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Key Points</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {aiSummary.key_points.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Topics */}
                {aiSummary.topics && aiSummary.topics.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {aiSummary.topics.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quotes */}
                {aiSummary.quotes && aiSummary.quotes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Notable Quotes</h3>
                    <div className="space-y-2">
                      {aiSummary.quotes.map((quote, i) => (
                        <blockquote key={i} className="pl-4 border-l-4 border-emerald-500 text-gray-700 italic">
                          "{quote}"
                        </blockquote>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sentiment */}
                {aiSummary.sentiment && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Sentiment:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      aiSummary.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                      aiSummary.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {aiSummary.sentiment.charAt(0).toUpperCase() + aiSummary.sentiment.slice(1)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Generate an AI-powered summary to see key insights, topics, and quotes
              </p>
            )}
          </div>
        )}

        {/* Transcript Card */}
        {transcript && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                Full Transcript
              </h2>
              
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    <button
                      onClick={copyTranscript}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy"
                    >
                      <Copy className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={downloadTranscript}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                      data-testid="edit-transcript-btn"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  </>
                )}
                
                {isEditing && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedText(transcript.full_text);
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-medium flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveTranscript}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                      data-testid="save-transcript-btn"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-96 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                data-testid="transcript-textarea"
              />
            ) : (
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {transcript.full_text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* No Transcript Message */}
        {!transcript && !generating && (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transcript Available</h3>
            <p className="text-gray-600 mb-6">
              Generate an AI-powered transcript to make this podcast searchable and accessible
            </p>
            <button
              onClick={generateTranscript}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-medium inline-flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Generate Transcript
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
