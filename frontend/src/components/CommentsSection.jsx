import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageCircle, Send, Heart, Reply, MoreHorizontal, Smile, 
  ChevronDown, ChevronUp, Trash2, Edit2, X, Check
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useWallet } from '../context/WalletContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '👏', '🎯', '💯'];

// Simplified emoji list for picker
const EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🥰', '😍', '🤩', '😘',
  '👍', '👎', '👊', '✊', '👏', '🙌', '🤝', '🙏', '✌️', '💪', '👋',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💕', '💖',
  '🎯', '💯', '🔥', '⭐', '✨', '🎉', '🏆', '🎁', '💎', '👑', '💡'
];

// Simple Emoji Picker Component
const EmojiPicker = ({ onSelect, onClose }) => (
  <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-64 p-2">
    <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-lg"
        >
          {emoji}
        </button>
      ))}
    </div>
  </div>
);

// Format relative time
const formatTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
};

// Single Comment Component
const Comment = ({ 
  comment, 
  currentUserId, 
  onReply, 
  onLike, 
  onReaction, 
  onDelete,
  onEdit,
  depth = 0 
}) => {
  const [showReplies, setShowReplies] = useState(depth < 2);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  
  const isOwner = currentUserId === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const isLiked = comment.liked_by?.includes(currentUserId);
  
  const handleEdit = () => {
    if (editText.trim() && editText !== comment.text) {
      onEdit(comment.id, editText);
    }
    setIsEditing(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-100' : ''}`}>
      <div className="group py-3">
        {/* Quoted/Reply to */}
        {comment.reply_to_text && (
          <div className="mb-2 pl-3 border-l-2 border-gray-300 text-sm text-gray-500 italic">
            "{comment.reply_to_text.slice(0, 100)}{comment.reply_to_text.length > 100 ? '...' : ''}"
          </div>
        )}
        
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
              {comment.username?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 text-sm">{comment.username}</span>
              <span className="text-xs text-gray-400">{formatTime(comment.created_at)}</span>
              {comment.is_edited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
            
            {/* Content */}
            {isEditing ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleEdit}>
                  <Check className="w-4 h-4 text-emerald-500" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            ) : (
              <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{comment.text}</p>
            )}
            
            {/* Reactions Display */}
            {comment.reactions && Object.keys(comment.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(comment.reactions).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    onClick={() => onReaction(comment.id, emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                      comment.reaction_users?.[emoji]?.includes(currentUserId)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Like */}
              <button
                onClick={() => onLike(comment.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
              </button>
              
              {/* Reply */}
              <button
                onClick={() => onReply(comment)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
              
              {/* Reactions */}
              <div className="relative">
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                
                {showReactions && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 flex gap-0.5 z-10">
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReaction(comment.id, emoji);
                          setShowReactions(false);
                        }}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Owner Menu */}
              {isOwner && (
                <div className="relative ml-auto">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[100px]">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onDelete(comment.id);
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Replies */}
      {hasReplies && (
        <div>
          {!showReplies ? (
            <button
              onClick={() => setShowReplies(true)}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 ml-11 mb-2"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowReplies(false)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-600 ml-11 mb-2"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Hide replies
              </button>
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onLike={onLike}
                  onReaction={onReaction}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  depth={depth + 1}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Main Comments Component
export const CommentsSection = ({ podcastId }) => {
  const { walletAddress } = useWallet();
  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);
  
  const currentUserId = walletAddress || 'anonymous';
  const currentUsername = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Anonymous';

  // Fetch comments
  useEffect(() => {
    fetchComments();
  }, [podcastId]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/podcasts/${podcastId}/comments`);
      setComments(response.data.comments || []);
      setTotalComments(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Submit comment
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      const data = {
        user_id: currentUserId,
        username: currentUsername,
        text: newComment,
        wallet_address: walletAddress,
        parent_id: replyTo?.id || null,
        reply_to_id: replyTo?.id || null,
        reply_to_text: replyTo?.text || null
      };
      
      const response = await axios.post(`${API}/podcasts/${podcastId}/comments`, data);
      
      // Refresh comments to get updated tree
      fetchComments();
      setNewComment('');
      setReplyTo(null);
      toast.success('Comment posted!');
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  // Like comment
  const handleLike = async (commentId) => {
    try {
      await axios.post(`${API}/podcasts/comments/${commentId}/like`, { user_id: currentUserId });
      fetchComments();
    } catch (error) {
      toast.error('Failed to like comment');
    }
  };

  // Add reaction
  const handleReaction = async (commentId, emoji) => {
    try {
      await axios.post(`${API}/podcasts/comments/${commentId}/reaction`, {
        user_id: currentUserId,
        emoji
      });
      fetchComments();
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  // Delete comment
  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    
    try {
      await axios.delete(`${API}/podcasts/comments/${commentId}?user_id=${currentUserId}`);
      fetchComments();
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  // Edit comment
  const handleEdit = async (commentId, newText) => {
    try {
      await axios.put(`${API}/podcasts/comments/${commentId}`, {
        user_id: currentUserId,
        text: newText
      });
      fetchComments();
      toast.success('Comment updated');
    } catch (error) {
      toast.error('Failed to edit comment');
    }
  };

  // Reply to comment
  const handleReply = (comment) => {
    setReplyTo(comment);
    inputRef.current?.focus();
  };

  // Add emoji to comment
  const addEmoji = (emoji) => {
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading comments...
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Discussion</h3>
          <span className="text-sm text-gray-500">({totalComments})</span>
        </div>
      </div>

      {/* Comment Input */}
      <div className="px-6 py-4 border-b border-gray-100">
        {/* Reply indicator */}
        {replyTo && (
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Replying to</span>
            <span className="font-medium text-gray-700">{replyTo.username}</span>
            <span className="text-gray-400 truncate max-w-[200px]">"{replyTo.text}"</span>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xs">
              {currentUsername.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? "Write a reply..." : "Join the discussion..."}
              className="w-full px-4 py-2.5 pr-20 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Emoji Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <Smile className="w-5 h-5" />
                </button>
                
                {showEmojiPicker && (
                  <EmojiPicker 
                    onSelect={addEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              
              {/* Send */}
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="p-1.5 text-emerald-500 hover:text-emerald-600 disabled:text-gray-300 rounded-full hover:bg-emerald-50 disabled:hover:bg-transparent"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="px-6 divide-y divide-gray-50">
        {comments.length === 0 ? (
          <div className="py-12 text-center">
            <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-400">Be the first to start the discussion!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onReply={handleReply}
              onLike={handleLike}
              onReaction={handleReaction}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
