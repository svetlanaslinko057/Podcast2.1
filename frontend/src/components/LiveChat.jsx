import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, MessageCircle } from 'lucide-react';

export const LiveChat = ({ podcastId, isLive }) => {
  const [messages, setMessages] = useState([
    { id: 1, username: 'cryptoking', text: 'Чудовий подкаст! 🔥', timestamp: new Date() },
    { id: 2, username: 'blockchainfan', text: 'Коли буде наступний випуск?', timestamp: new Date() },
  ]);
  const [newMessage, setNewMessage] = useState('');
  
  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now(),
      username: 'guest_user',
      text: newMessage,
      timestamp: new Date()
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
  };
  
  return (
    <Card className="glass-card p-6" data-testid="live-chat">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-bold text-white">Чат {isLive && <span className="text-red-500">● LIVE</span>}</h3>
      </div>
      
      {/* Messages */}
      <div className="live-chat mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className="live-chat-message">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-emerald-600 text-sm">{msg.username}</span>
              <span className="text-xs text-gray-500">
                {msg.timestamp.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-white text-sm">{msg.text}</p>
          </div>
        ))}
      </div>
      
      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Написати повідомлення..."
          className="flex-1 bg-[#0F0F0F] border-[#00FF00]/20 text-white"
          data-testid="chat-input"
        />
        <Button
          onClick={handleSend}
          className="bg-gray-900 hover:bg-gray-800 text-black"
          data-testid="send-message-button"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};