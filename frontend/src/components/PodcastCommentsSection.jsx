import React, { useState, useCallback, memo } from 'react';
import { 
  MessageCircle, ChevronUp, ChevronDown, Send, ThumbsUp, Reply
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';

// Memoized single comment to prevent unnecessary re-renders
const CommentItem = memo(({ 
  comment, 
  currentUserId,
  replyTo,
  replyText,
  onSetReplyTo,
  onSetReplyText,
  onLike,
  onReply
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="group">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={comment.user_avatar} />
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
            {comment.username?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">{comment.username}</span>
              <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
              {comment.is_pinned && (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">Pinned</Badge>
              )}
            </div>
            <p className="text-gray-700">{comment.text}</p>
          </div>
          
          {/* Comment Actions */}
          <div className="flex items-center gap-4 mt-2 ml-2">
            <button 
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-sm ${
                comment.liked_by?.includes(currentUserId) 
                  ? 'text-emerald-600' 
                  : 'text-gray-500 hover:text-emerald-600'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              {comment.likes_count > 0 && comment.likes_count}
            </button>
            
            {/* Emoji Reactions */}
            {comment.reactions && Object.keys(comment.reactions).length > 0 && (
              <div className="flex items-center gap-2">
                {comment.reactions.fire > 0 && <span className="text-sm">🔥 {comment.reactions.fire}</span>}
                {comment.reactions.heart > 0 && <span className="text-sm">❤️ {comment.reactions.heart}</span>}
                {comment.reactions.mind_blown > 0 && <span className="text-sm">🤯 {comment.reactions.mind_blown}</span>}
                {comment.reactions.clap > 0 && <span className="text-sm">👏 {comment.reactions.clap}</span>}
              </div>
            )}
            
            <button 
              onClick={() => onSetReplyTo(replyTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
          </div>
          
          {/* Reply Input */}
          {replyTo === comment.id && (
            <div className="mt-3 ml-4 flex gap-2">
              <Textarea
                placeholder={`Reply to ${comment.username}...`}
                value={replyText}
                onChange={(e) => onSetReplyText(e.target.value)}
                className="flex-1 bg-gray-50 border-gray-200 text-gray-900 rounded-xl min-h-[60px]"
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => onReply(comment.id)}
                  disabled={!replyText.trim()}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => { onSetReplyTo(null); onSetReplyText(''); }}
                  size="sm"
                  variant="ghost"
                  className="text-gray-500"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {/* Replies */}
          {comment.replies?.length > 0 && (
            <div className="mt-4 ml-4 space-y-3 border-l-2 border-gray-100 pl-4">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-xs">
                      {reply.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900">{reply.username}</span>
                        <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{reply.text}</p>
                    </div>
                    <button 
                      onClick={() => onLike(reply.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 mt-1 ml-2"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      {reply.likes_count > 0 && reply.likes_count}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

/**
 * Podcast Comments Section Component
 * Collapsible comments with replies, reactions, and real-time updates
 */
export const PodcastCommentsSection = ({
  comments = [],
  currentUserId,
  walletAddress,
  isConnected,
  onAddComment,
  onLikeComment,
  initiallyOpen = false
}) => {
  const [showComments, setShowComments] = useState(initiallyOpen);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Use callbacks to prevent recreation on each render
  const handleSetReplyTo = useCallback((id) => {
    setReplyTo(id);
  }, []);

  const handleSetReplyText = useCallback((text) => {
    setReplyText(text);
  }, []);

  const handleSubmitComment = useCallback(() => {
    if (!newComment.trim()) return;
    onAddComment(newComment, null);
    setNewComment('');
  }, [newComment, onAddComment]);

  const handleSubmitReply = useCallback((parentId) => {
    if (!replyText.trim()) return;
    onAddComment(replyText, parentId);
    setReplyText('');
    setReplyTo(null);
  }, [replyText, onAddComment]);

  const userInitials = walletAddress?.slice(2, 4).toUpperCase() || 'DU';

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header - Clickable toggle */}
      <button
        onClick={() => setShowComments(!showComments)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comments ({comments.length})
        </h2>
        {showComments ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      
      {/* Content - Collapsible */}
      {showComments && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {/* Add Comment Input */}
          <div className="mt-6 mb-6">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-3 bg-gray-50 border-gray-200 text-gray-900 rounded-xl min-h-[80px]"
                  data-testid="comment-input"
                />
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    className="bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl px-6"
                    data-testid="submit-comment-button"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Comment
                  </Button>
                  {!isConnected && (
                    <span className="text-xs text-gray-400">Posting as Demo User</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Comments List */}
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                replyTo={replyTo}
                replyText={replyText}
                onSetReplyTo={handleSetReplyTo}
                onSetReplyText={handleSetReplyText}
                onLike={onLikeComment}
                onReply={handleSubmitReply}
              />
            ))}
            
            {comments.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No comments yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PodcastCommentsSection;
