import React from 'react';
import { useWallet } from '../context/WalletContext';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export const ConnectWalletButton = ({ className = '' }) => {
  const { isConnected, isConnecting, walletAddress, connect, disconnect } = useWallet();
  
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden md:block text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all ${className}`}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:block text-sm font-medium">Disconnect</span>
        </button>
      </div>
    );
  }
  
  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 ${className}`}
    >
      {isConnecting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Wallet className="w-4 h-4" />
      )}
      <span className="text-sm font-semibold">
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </span>
    </button>
  );
};

export default ConnectWalletButton;
