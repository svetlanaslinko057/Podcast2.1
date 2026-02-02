import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Copy, Check, Code } from 'lucide-react';
import { toast } from 'sonner';

export const EmbedShare = ({ podcastId, title }) => {
  const [copied, setCopied] = useState(false);
  
  const embedCode = `<iframe src="${process.env.REACT_APP_BACKEND_URL?.replace('/api', '')}/embed/${podcastId}" width="100%" height="200" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  
  const publicUrl = `${window.location.origin}/podcast/${podcastId}`;
  
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${type} скопійовано!`);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card className="glass-card p-6" data-testid="embed-share">
      <div className="flex items-center gap-2 mb-4">
        <Code className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-bold text-white">Share Podcast</h3>
      </div>
      
      {/* Public Link */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-400 mb-2 block">Public Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 bg-[#0F0F0F] border border-[#00FF00]/20 rounded px-3 py-2 text-white text-sm"
          />
          <Button
            onClick={() => copyToClipboard(publicUrl, 'Посилання')}
            className="bg-gray-900 hover:bg-gray-800 text-black"
            data-testid="copy-link-button"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      {/* Embed Code */}
      <div>
        <label className="text-sm font-semibold text-gray-400 mb-2 block">Embed code for your website</label>
        <div className="embed-code mb-3">
          {embedCode}
        </div>
        <Button
          onClick={() => copyToClipboard(embedCode, 'Код')}
          variant="outline"
          className="w-full border-emerald-200 text-emerald-600 hover:bg-gray-900/10"
          data-testid="copy-embed-button"
        >
          <Copy className="w-4 h-4 mr-2" />
          Скопіювати embed код
        </Button>
      </div>
    </Card>
  );
};