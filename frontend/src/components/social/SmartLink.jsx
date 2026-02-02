import React, { useState } from 'react';
import { Link2, Clock, Copy, Check, Twitter, Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';

export const SmartLink = ({ 
  podcastId, 
  podcastTitle,
  currentTime,
  duration
}) => {
  const [copied, setCopied] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getShareUrl = () => {
    const base = `${window.location.origin}/podcast/${podcastId}`;
    if (includeTimestamp && currentTime > 0) {
      return `${base}?t=${Math.floor(currentTime)}`;
    }
    return base;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const url = getShareUrl();
    const text = includeTimestamp && currentTime > 0
      ? `Check out this moment at ${formatTime(currentTime)} in "${podcastTitle}"`
      : `Check out "${podcastTitle}"`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2">
          <Link2 className="w-4 h-4" />
          Share Link
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Smart Link
            </h4>
            <p className="text-sm text-gray-500">Share this episode with a timestamp</p>
          </div>

          {/* Timestamp toggle */}
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">Start at {formatTime(currentTime)}</span>
            </div>
            <input
              type="checkbox"
              checked={includeTimestamp}
              onChange={(e) => setIncludeTimestamp(e.target.checked)}
              className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
            />
          </label>

          {/* Generated URL */}
          <div className="flex gap-2">
            <Input
              value={getShareUrl()}
              readOnly
              className="bg-gray-50 text-sm font-mono"
            />
            <Button onClick={copyLink} variant="outline">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={shareToTwitter}
              className="flex-1 bg-[#1DA1F2] hover:bg-[#1a8cd8]"
            >
              <Twitter className="w-4 h-4 mr-2" />
              Twitter
            </Button>
            <Button 
              onClick={copyLink}
              variant="outline"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>

          {includeTimestamp && currentTime > 0 && (
            <Badge variant="secondary" className="w-full justify-center">
              Link will start playback at {formatTime(currentTime)}
            </Badge>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SmartLink;
