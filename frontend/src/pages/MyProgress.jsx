import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Award, Clock, Mic, ThumbsUp, Zap, Star, Users, CheckCircle, Shield, Lightbulb, Handshake, Radio, Timer, Hand, Heart, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Info Tooltip Component
const InfoTooltip = ({ title, description, formula, status }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="bg-gray-900 text-white p-4 rounded-xl max-w-xs shadow-xl border-0"
      >
        <div className="space-y-2">
          <h4 className="font-semibold text-white text-sm">{title}</h4>
          <p className="text-gray-300 text-xs leading-relaxed">{description}</p>
          {formula && (
            <div className="bg-gray-800 rounded-lg p-2 mt-2">
              <p className="text-xs text-gray-400 font-mono">{formula}</p>
            </div>
          )}
          {status && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
              <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-emerald-500' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">{status.text}</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const MyProgress = () => {
  const { user } = useAuth();
  const { walletAddress } = useWallet();
  const [progress, setProgress] = useState(null);
  const [badges, setBadges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current user ID - prioritize wallet address
  const userId = walletAddress || user?.id;

  useEffect(() => {
    if (userId) {
      fetchProgress(userId);
    } else {
      setError('Connect your wallet to see your progress');
      setLoading(false);
    }
  }, [userId]);

  const fetchProgress = async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const [progressRes, badgesRes] = await Promise.all([
        axios.get(`${API}/xp/${id}/progress`),
        axios.get(`${API}/users/${id}/badges`)
      ]);
      
      setProgress(progressRes.data);
      setBadges(badgesRes.data);
      setLoading(false);
    } catch (err) {
      // Try with lowercase wallet
      try {
        const lowerId = id.toLowerCase();
        const [progressRes, badgesRes] = await Promise.all([
          axios.get(`${API}/xp/${lowerId}/progress`),
          axios.get(`${API}/users/${lowerId}/badges`)
        ]);
        
        setProgress(progressRes.data);
        setBadges(badgesRes.data);
        setLoading(false);
      } catch (err2) {
        setError('Could not load progress. Please connect your wallet.');
        setLoading(false);
      }
    }
  };

  const getLevelName = (level) => {
    const names = { 1: 'Observer', 2: 'Active', 3: 'Contributor', 4: 'Speaker', 5: 'Core Voice' };
    return names[level] || 'Observer';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20" data-testid="progress-loading">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading your progress...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <TrendingUp className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">{error || 'Connect wallet to see your progress'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20" data-testid="progress-page">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-900">My Progress</h1>
            <InfoTooltip
              title="My Progress"
              description="Track your journey in the club. Level and XP determine your status and priority in the speaking queue."
              formula="Level = f(Total XP)"
              status={{ active: true, text: 'Updates automatically' }}
            />
          </div>
          <p className="text-sm text-gray-500">Track your journey in the club</p>
        </div>

        {/* Level Card - Strict Style */}
        <div className="bg-gray-900 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Level</div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white text-gray-900 font-bold text-2xl">
                  {progress.current_level}
                </span>
                <div>
                  <div className="text-xl font-semibold">{getLevelName(progress.current_level)}</div>
                  <div className="text-sm text-gray-400">{progress.xp_total.toLocaleString()} XP total</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{progress.progress_percent}%</div>
              <div className="text-xs text-gray-400">to Level {progress.next_level}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.progress_percent}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {progress.xp_to_next_level} XP needed for {progress.next_level_name}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Engagement</span>
              <InfoTooltip
                title="Engagement Score"
                description="Your activity level in the club. Calculated based on listening time, live session attendance, hand raises, and interactions."
                formula="Score = (Listening × 0.3) + (Attendance × 0.3) + (Raises × 0.2) + (Interactions × 0.2)"
                status={{ active: progress.engagement_score > 0, text: progress.engagement_score > 50 ? 'Highly engaged' : 'Keep participating!' }}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900">{progress.engagement_score.toFixed(1)}</div>
            <div className="text-xs text-gray-400">out of 100</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Priority Score</span>
              <InfoTooltip
                title="Priority Score"
                description="Your position in the hand raise queue during live sessions. Higher score means you get called to speak earlier."
                formula="Priority = (Level × 20) + (XP × 0.3) + (Engagement × 0.5)"
                status={{ active: true, text: progress.priority_score >= 50 ? 'Good priority' : 'Increase with activity' }}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900">{progress.priority_score.toFixed(1)}</div>
            <div className="text-xs text-gray-400">hand raise queue</div>
          </div>
        </div>

        {/* XP Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center">
            <h3 className="font-semibold text-gray-900">XP Breakdown</h3>
            <InfoTooltip
              title="XP Breakdown"
              description="Detailed breakdown of your experience sources. XP is awarded for various activities in the club."
              formula="Total XP = Listening + Attendance + Raises + Speeches + Support"
              status={{ active: true, text: 'XP awarded automatically' }}
            />
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { icon: Clock, label: 'Listening Time', value: progress.xp_breakdown.listening_time },
              { icon: Mic, label: 'Live Attendance', value: progress.xp_breakdown.live_attendance },
              { label: 'Hand Raises', value: progress.xp_breakdown.hand_raises, emoji: '✋' },
              { label: 'Speeches Given', value: progress.xp_breakdown.speeches_given, emoji: '🎤' },
              { icon: ThumbsUp, label: 'Support Received', value: progress.xp_breakdown.support_received },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.icon ? (
                    <item.icon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <span className="text-sm">{item.emoji}</span>
                  )}
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value} XP</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        {badges && badges.total_badges > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center">
                <h3 className="font-semibold text-gray-900">Badges</h3>
                <InfoTooltip
                  title="Badges"
                  description="Achievements for activity in the club. Badges are awarded automatically when certain conditions are met or manually by an administrator."
                  formula="3 categories: Participation, Contribution, Authority"
                  status={{ active: true, text: `${badges.total_badges} of 14 earned` }}
                />
              </div>
              <span className="text-sm text-gray-500">{badges.total_badges} earned</span>
            </div>
            
            <div className="divide-y divide-gray-50">
              {badges.all_badges?.map((badge, idx) => {
                // Map badge keys to Lucide icons
                const getIcon = (key) => {
                  const iconMap = {
                    'early_member': Star,
                    'first_speaker': Mic,
                    'first_time_speaker': Mic,
                    '10_sessions': Radio,
                    '10_sessions_attended': Radio,
                    '100_hours': Timer,
                    'active_raiser': Hand,
                    'active_hand_raiser': Hand,
                    'supporter': Heart,
                    'community_supporter': Heart,
                    'insightful_speaker': Lightbulb,
                    'community_helper': Handshake,
                    'moderator_trusted': Shield,
                    'signal_provider': Radio,
                    'core_member': Star,
                    'verified_expert': CheckCircle,
                    'club_council': Users,
                    'long_term_holder': Award
                  };
                  return iconMap[key] || Award;
                };
                
                const IconComponent = getIcon(badge.key);
                
                return (
                  <div key={idx} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-700">{badge.name}</span>
                        <span className="text-xs text-gray-400 ml-2">• {badge.type}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{badge.description}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty Badges State */}
        {(!badges || badges.total_badges === 0) && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No badges yet</h3>
            <p className="text-sm text-gray-500">Participate in the club to earn badges</p>
          </div>
        )}
      </div>
    </div>
  );
};
