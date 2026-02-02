import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessageCircle, Plus, Edit, Trash2, TestTube2 } from 'lucide-react';

export const TelegramBotsTab = ({ bots, onAdd, onTest, onEdit, onDelete }) => {
  if (bots.length === 0) {
    return (
      <Card className="bg-white rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Telegram Bots</h2>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Bot
          </Button>
        </div>
        
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No bots configured</p>
          <p className="text-sm text-gray-400 mb-4">
            Add Telegram bots for quick access when creating podcasts
          </p>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Your First Bot
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Telegram Bots</h2>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add Bot
        </Button>
      </div>
      
      <div className="grid gap-4">
        {bots.map(bot => (
          <Card key={bot.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">{bot.name}</h3>
                  <Badge variant={bot.is_active ? 'default' : 'secondary'}>
                    {bot.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {bot.description && (
                  <p className="text-sm text-gray-600 mb-2">{bot.description}</p>
                )}
                <p className="text-xs text-gray-400 font-mono mb-3">
                  Chat ID: {bot.chat_id}
                </p>
                
                {/* Stats */}
                <div className="flex gap-4 mb-3 text-xs text-gray-500">
                  <span>📤 {bot.total_messages_sent} messages</span>
                  {bot.last_used_at && (
                    <span>🕐 Last: {new Date(bot.last_used_at).toLocaleDateString()}</span>
                  )}
                </div>
                
                {/* Settings */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={bot.auto_notify_new_podcast}
                      readOnly
                      className="rounded"
                    />
                    <span className="text-gray-600">Auto-notify podcasts</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={bot.auto_notify_live_start}
                      readOnly
                      className="rounded"
                    />
                    <span className="text-gray-600">Auto-notify lives</span>
                  </label>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onTest(bot.id)}
                  data-testid="test-bot-button"
                >
                  <TestTube2 className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onEdit(bot)}
                  data-testid="edit-bot-button"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onDelete(bot.id)}
                  data-testid="delete-bot-button"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
};