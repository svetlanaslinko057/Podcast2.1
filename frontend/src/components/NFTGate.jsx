import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Lock, Unlock, Award } from 'lucide-react';
import { Button } from './ui/button';

export const NFTGate = ({ podcast, hasAccess, onUnlock }) => {
  const requiredNFT = podcast.nft_requirement || 'FOMO Premium NFT';
  
  if (hasAccess) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <Badge className="nft-badge">
          <Unlock className="w-3 h-3" />
          NFT Access
        </Badge>
        <Badge className="nft-badge">
          <Award className="w-3 h-3" />
          Premium Content
        </Badge>
      </div>
    );
  }
  
  return (
    <div className="relative" data-testid="nft-gate">
      {/* Locked Content Overlay */}
      <div className="token-gate-lock">
        <Lock className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Private Podcast</h3>
        <p className="text-gray-400 mb-4">NFT Required for Access</p>
        
        <Card className="bg-[#0F0F0F] border-emerald-200 p-4 mb-4">
          <p className="text-sm text-gray-300 mb-2">Необхідний NFT:</p>
          <p className="font-bold text-emerald-600">{requiredNFT}</p>
        </Card>
        
        <Button
          onClick={onUnlock}
          className="w-full fomo-button"
          data-testid="unlock-button"
        >
          <Award className="w-4 h-4 mr-2" />
          Розблокувати через NFT
        </Button>
        
        <p className="text-xs text-gray-500 mt-3">
          Підключіть гаманець з NFT для доступу
        </p>
      </div>
      
      {/* Blurred Content */}
      <div className="filter blur-xl pointer-events-none opacity-30">
        <div className="h-64 bg-[#0F0F0F] rounded-2xl"></div>
      </div>
    </div>
  );
};