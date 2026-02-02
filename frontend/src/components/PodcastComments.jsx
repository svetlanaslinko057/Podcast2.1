import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card } from './ui/card';
import { 
  MessageCircle, Reply, ThumbsUp, Send, Loader2,
  ChevronDown, ChevronUp
} from 'lucide-react';

// Helper function for time formatting
const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
};

// Separate CommentItem component
const CommentItem = ({ 
  comment, 
  isReply = false, 
  replyTo, 
  setReplyTo, 
  replyText, 
  setReplyText, 
  handleSubmitReply, 
  onLikeComment, 
  submitting 
}) => (
  <div className={`${isReply ? 'ml-12 mt-3' : ''}`}>
    <div className="flex gap-3">
      <Avatar className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} flex-shrink-0`}>
        <AvatarImage src={comment.user_avatar} />
        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs">
          {comment.user_name?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 text-sm">
              {comment.user_name || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-400">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
        
        {/* Comment Actions */}
        <div className="flex items-center gap-4 mt-2 ml-2">
          <button
            onClick={() => onLikeComment && onLikeComment(comment.id)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              comment.liked_by_user 
                ? 'text-emerald-600' 
                : 'text-gray-500 hover:text-emerald-600'
            }`}
          >
            <ThumbsUp className="w-3 h-3" fill={comment.liked_by_user ? 'currentColor' : 'none'} />
            <span>{comment.likes_count || 0}</span>
          </button>
          
          {!isReply && setReplyTo && (
            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}
        </div>
        
        {/* Reply Input */}
        {replyTo === comment.id && (
          <div className="mt-3 flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 min-h-[60px] text-sm rounded-xl resize-none"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => handleSubmitReply(comment.id)}
                disabled={!replyText.trim() || submitting}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setReplyTo(null); setReplyText(''); }}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 mt-3">
            {comment.replies.map((reply) => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                isReply={true}
                onLikeComment={onLikeComment}
                submitting={submitting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

/**
 * Podcast Comments Component
 * Displays and manages comments section
 */
export const PodcastComments = ({
  comments = [],
  currentUserId,
  onSubmitComment,
  onSubmitReply,
  onLikeComment,
  loading = false,
  maxInitialComments = 5
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      await onSubmitComment(newComment);
      setNewComment('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      await onSubmitReply(parentId, replyText);
      setReplyText('');
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const visibleComments = showAllComments 
    ? comments 
    : comments.slice(0, maxInitialComments);

  return (
    <Card className="bg-white rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-emerald-500" />
        <h3 className="text-lg font-bold text-gray-900">
          Comments ({comments.length})
        </h3>
      </div>
      
      {/* New Comment Input */}
      <div className="flex gap-3 mb-6">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            U
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="min-h-[80px] rounded-xl resize-none mb-2"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Post Comment
            </Button>
          </div>
        </div>
      </div>
      
      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No comments yet</p>
          <p className="text-sm text-gray-400">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {visibleComments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyText={replyText}
                setReplyText={setReplyText}
                handleSubmitReply={handleSubmitReply}
                onLikeComment={onLikeComment}
                submitting={submitting}
              />
            ))}
          </div>
          
          {/* Show More/Less Button */}
          {comments.length > maxInitialComments && (
            <div className="text-center mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowAllComments(!showAllComments)}
                className="text-emerald-600 hover:text-emerald-700"
              >
                {showAllComments ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show {comments.length - maxInitialComments} More Comments
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default PodcastComments;
