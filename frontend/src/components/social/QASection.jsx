import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { HelpCircle, ChevronUp, MessageCircle, Clock, Check, Send } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export const QASection = ({ 
  podcastId, 
  userId, 
  username,
  currentTime,
  isAuthor = false,
  onSeek 
}) => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [answeringId, setAnsweringId] = useState(null);
  const [answerText, setAnswerText] = useState('');

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/social/podcasts/${podcastId}/questions`);
      setQuestions(res.data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const submitQuestion = async () => {
    if (!newQuestion.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('username', username || 'Anonymous');
      formData.append('text', newQuestion);
      if (includeTimestamp) {
        formData.append('timestamp', Math.floor(currentTime));
      }
      
      await axios.post(`${API}/api/social/podcasts/${podcastId}/questions`, formData);
      toast.success('Question submitted!');
      setNewQuestion('');
      setIncludeTimestamp(false);
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to submit question');
    }
  };

  const upvoteQuestion = async (questionId) => {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      
      const res = await axios.post(`${API}/api/social/questions/${questionId}/upvote`, formData);
      toast.success(res.data.upvoted ? 'Upvoted!' : 'Upvote removed');
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to upvote');
    }
  };

  const submitAnswer = async (questionId) => {
    if (!answerText.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append('answer', answerText);
      formData.append('answered_by', username || 'Host');
      
      await axios.post(`${API}/api/social/questions/${questionId}/answer`, formData);
      toast.success('Answer posted!');
      setAnsweringId(null);
      setAnswerText('');
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to post answer');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-purple-500" />
        Q&A ({questions.length})
      </h3>

      {/* Ask question */}
      <div className="mb-6">
        <Textarea
          placeholder="Ask a question about this episode..."
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          className="mb-3 bg-gray-50 border-gray-200 rounded-xl"
          rows={2}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTimestamp}
              onChange={(e) => setIncludeTimestamp(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Clock className="w-4 h-4" />
            Reference current timestamp ({formatTime(Math.floor(currentTime))})
          </label>
          <Button
            onClick={submitQuestion}
            disabled={!newQuestion.trim()}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Send className="w-4 h-4 mr-2" />
            Ask
          </Button>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-gray-50 rounded-xl p-4">
            <div className="flex gap-3">
              {/* Upvote */}
              <button
                onClick={() => upvoteQuestion(q.id)}
                className={`flex flex-col items-center p-2 rounded-lg hover:bg-gray-200 transition-colors ${
                  q.upvoted_by?.includes(userId) ? 'text-purple-600' : 'text-gray-400'
                }`}
              >
                <ChevronUp className="w-5 h-5" />
                <span className="text-sm font-semibold">{q.upvotes || 0}</span>
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{q.username}</span>
                  {q.timestamp && (
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-purple-100"
                      onClick={() => onSeek && onSeek(q.timestamp)}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(q.timestamp)}
                    </Badge>
                  )}
                  {q.is_featured && (
                    <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                  )}
                </div>
                <p className="text-gray-700 mb-2">{q.text}</p>

                {/* Answer */}
                {q.answer ? (
                  <div className="mt-3 pl-4 border-l-2 border-purple-300">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="font-semibold text-gray-900">{q.answered_by}</span>
                      <Badge variant="outline" className="text-xs">Host</Badge>
                    </div>
                    <p className="text-gray-600">{q.answer}</p>
                  </div>
                ) : isAuthor && (
                  answeringId === q.id ? (
                    <div className="mt-3">
                      <Textarea
                        placeholder="Write your answer..."
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        className="mb-2 bg-white border-gray-200 rounded-xl"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => submitAnswer(q.id)} size="sm" className="bg-purple-500 hover:bg-purple-600">
                          Post Answer
                        </Button>
                        <Button onClick={() => setAnsweringId(null)} size="sm" variant="ghost">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setAnsweringId(q.id)}
                      size="sm"
                      variant="outline"
                      className="mt-2"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Answer
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No questions yet. Be the first to ask!</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default QASection;
