import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  MessageCircle, Send, ArrowLeft, Search, Loader2, User
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Messages = () => {
  const { recipientId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  
  const currentUserId = 'demo-user-123';
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/users/${currentUserId}/conversations`);
        setConversations(res.data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, []);
  
  // Load messages when recipient changes
  useEffect(() => {
    if (recipientId) {
      loadMessages(recipientId);
    }
  }, [recipientId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const loadMessages = async (userId) => {
    try {
      // Fetch user info
      const userRes = await axios.get(`${API}/authors/${userId}`);
      setSelectedUser(userRes.data);
      
      // Fetch messages
      const messagesRes = await axios.get(`${API}/messages/${currentUserId}/${userId}`);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    
    try {
      setSendingMessage(true);
      const formData = new FormData();
      formData.append('sender_id', currentUserId);
      formData.append('recipient_id', selectedUser.id);
      formData.append('message', newMessage);
      
      await axios.post(`${API}/messages`, formData);
      
      // Add message locally
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_id: currentUserId,
        recipient_id: selectedUser.id,
        message: newMessage,
        created_at: new Date().toISOString(),
        is_read: false
      }]);
      
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };
  
  const selectConversation = (conv) => {
    navigate(`/messages/${conv.user.id}`);
  };
  
  const filteredConversations = conversations.filter(conv => 
    conv.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pt-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden lg:col-span-1">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10 bg-gray-50 border-gray-200 rounded-xl"
                />
              </div>
            </div>
            
            <div className="h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No conversations yet</p>
                  <p className="text-sm text-gray-400 mt-2">Start chatting with creators!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.user?.id}
                      onClick={() => selectConversation(conv)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUser?.id === conv.user?.id ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={conv.user?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                              {conv.user?.name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {conv.unread_count > 0 && (
                            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full p-0">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {conv.user?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {conv.last_message?.message || 'No messages'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
          
          {/* Chat Area */}
          <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden lg:col-span-2">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                      {selectedUser.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                    <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-sm text-gray-400">Say hello!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            msg.sender_id === currentUserId
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p>{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_id === currentUserId ? 'text-emerald-100' : 'text-gray-400'
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="bg-gray-50 border-gray-200 rounded-xl"
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-emerald-500 hover:bg-emerald-600 rounded-xl px-6"
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a conversation</p>
                  <p className="text-sm text-gray-400">or start a new chat</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
