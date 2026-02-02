import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart2, Plus, Check, Users } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

const API = process.env.REACT_APP_BACKEND_URL;

export const PollsSection = ({ 
  podcastId, 
  userId,
  isAuthor = false 
}) => {
  const [polls, setPolls] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newPoll, setNewPoll] = useState({ question: '', options: '' });

  const fetchPolls = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/social/podcasts/${podcastId}/polls`);
      setPolls(res.data);
    } catch (error) {
      console.error('Failed to fetch polls:', error);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const createPoll = async () => {
    if (!newPoll.question.trim() || !newPoll.options.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append('creator_id', userId);
      formData.append('question', newPoll.question);
      formData.append('options', newPoll.options);
      
      await axios.post(`${API}/api/social/podcasts/${podcastId}/polls`, formData);
      toast.success('Poll created!');
      setShowCreate(false);
      setNewPoll({ question: '', options: '' });
      fetchPolls();
    } catch (error) {
      toast.error('Failed to create poll');
    }
  };

  const votePoll = async (pollId, optionIndex) => {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('option_index', optionIndex);
      
      await axios.post(`${API}/api/social/polls/${pollId}/vote`, formData);
      toast.success('Vote recorded!');
      fetchPolls();
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-500" />
          Polls ({polls.length})
        </h3>
        
        {isAuthor && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-1" />
                Create Poll
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Poll</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Question</label>
                  <Input
                    placeholder="What do you think about...?"
                    value={newPoll.question}
                    onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Options (comma-separated)</label>
                  <Input
                    placeholder="Yes, No, Maybe"
                    value={newPoll.options}
                    onChange={(e) => setNewPoll({ ...newPoll, options: e.target.value })}
                    className="bg-gray-50"
                  />
                </div>
                <Button onClick={createPoll} className="w-full bg-blue-500 hover:bg-blue-600">
                  Create Poll
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Polls list */}
      <div className="space-y-4">
        {polls.map((poll) => {
          const userVote = poll.voters?.[userId];
          const hasVoted = userVote !== undefined;
          
          return (
            <div key={poll.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{poll.question}</h4>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {poll.total_votes || 0} votes
                </Badge>
              </div>
              
              <div className="space-y-2">
                {poll.options.map((option, idx) => {
                  const percent = poll.total_votes > 0 
                    ? Math.round((option.votes / poll.total_votes) * 100) 
                    : 0;
                  const isSelected = userVote === idx;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => votePoll(poll.id, idx)}
                      disabled={!poll.is_active}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white hover:bg-gray-50 text-gray-700'
                      } ${!poll.is_active && 'opacity-50 cursor-not-allowed'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium flex items-center gap-2">
                          {isSelected && <Check className="w-4 h-4" />}
                          {option.text}
                        </span>
                        {hasVoted && <span className="text-sm">{percent}%</span>}
                      </div>
                      {hasVoted && (
                        <Progress 
                          value={percent} 
                          className={`h-1.5 ${isSelected ? 'bg-blue-200' : 'bg-gray-200'}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              
              {!poll.is_active && (
                <Badge variant="outline" className="mt-2">Poll Closed</Badge>
              )}
            </div>
          );
        })}

        {polls.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BarChart2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No polls yet</p>
            {isAuthor && <p className="text-sm">Create one to engage your audience!</p>}
          </div>
        )}
      </div>
    </Card>
  );
};

export default PollsSection;
