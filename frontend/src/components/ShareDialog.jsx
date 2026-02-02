import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Copy, CheckCircle, Code, Link as LinkIcon,
  Twitter, Facebook, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Share Dialog Component
 * Provides various sharing options for content
 */
export const ShareDialog = ({
  open,
  onOpenChange,
  title = 'Share',
  url,
  embedCode,
  showEmbed = true
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCopyEmbed = () => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      toast.success('Embed code copied!');
      setTimeout(() => setEmbedCopied(false), 2000);
    }
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      '_blank'
    );
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareToTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      '_blank'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Share</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Social Share Buttons */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 flex flex-col items-center gap-2 h-auto py-4 hover:bg-blue-50 hover:border-blue-200"
              onClick={shareToTwitter}
            >
              <Twitter className="w-6 h-6 text-blue-400" />
              <span className="text-xs">Twitter</span>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="flex-1 flex flex-col items-center gap-2 h-auto py-4 hover:bg-blue-50 hover:border-blue-200"
              onClick={shareToFacebook}
            >
              <Facebook className="w-6 h-6 text-blue-600" />
              <span className="text-xs">Facebook</span>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="flex-1 flex flex-col items-center gap-2 h-auto py-4 hover:bg-sky-50 hover:border-sky-200"
              onClick={shareToTelegram}
            >
              <MessageCircle className="w-6 h-6 text-sky-500" />
              <span className="text-xs">Telegram</span>
            </Button>
          </div>
          
          {/* Copy Link */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Copy Link
            </label>
            <div className="flex gap-2">
              <Input
                value={url}
                readOnly
                className="flex-1 bg-gray-50 text-sm"
              />
              <Button
                variant={linkCopied ? 'default' : 'outline'}
                onClick={handleCopyLink}
                className={linkCopied ? 'bg-emerald-500' : ''}
              >
                {linkCopied ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Embed Code */}
          {showEmbed && embedCode && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                <Code className="w-4 h-4 inline mr-1" />
                Embed Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={embedCode}
                  readOnly
                  className="flex-1 bg-gray-50 text-xs font-mono"
                />
                <Button
                  variant={embedCopied ? 'default' : 'outline'}
                  onClick={handleCopyEmbed}
                  className={embedCopied ? 'bg-emerald-500' : ''}
                >
                  {embedCopied ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
