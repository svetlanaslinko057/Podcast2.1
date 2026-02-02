import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const { walletLogin, logout, isAuthenticated } = useAuth();
  
  const isConnected = !!walletAddress;
  
  // Sign message for authentication
  const signMessage = async (address) => {
    try {
      const message = `Sign this message to authenticate with FOMO Podcasts.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });
      return { message, signature };
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };
  
  // Auto-reconnect wallet on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window.ethereum === 'undefined') return;
      
      const savedAddress = localStorage.getItem('wallet_address');
      const savedConnected = localStorage.getItem('wallet_connected');
      
      if (savedAddress && savedConnected === 'true') {
        try {
          // Check if wallet is still connected in MetaMask
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
            setWalletAddress(accounts[0]);
            console.log('Wallet auto-reconnected:', accounts[0]);
          } else {
            // Wallet disconnected in MetaMask, clear localStorage
            localStorage.removeItem('wallet_address');
            localStorage.removeItem('wallet_connected');
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
          localStorage.removeItem('wallet_address');
          localStorage.removeItem('wallet_connected');
        }
      }
    };
    
    autoConnect();
  }, []);
  
  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }
    
    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        
        // Save to localStorage for persistence
        localStorage.setItem('wallet_address', address);
        localStorage.setItem('wallet_connected', 'true');
        
        // Sign message and authenticate with backend
        try {
          const { message, signature } = await signMessage(address);
          const result = await walletLogin(address, signature, message);
          
          if (result.success) {
            console.log('Wallet authenticated successfully');
          } else {
            console.error('Wallet authentication failed:', result.error);
          }
        } catch (authError) {
          console.error('Authentication error:', authError);
          // Keep wallet connected even if auth fails
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_connected');
    } finally {
      setIsConnecting(false);
    }
  }, [walletLogin]);
  
  const disconnect = useCallback(() => {
    setWalletAddress('');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_connected');
    
    // Also logout from backend
    if (isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, logout]);
  
  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          // User disconnected wallet in MetaMask
          setWalletAddress('');
          localStorage.removeItem('wallet_address');
          localStorage.removeItem('wallet_connected');
          if (isAuthenticated) {
            logout();
          }
        } else if (accounts[0] !== walletAddress) {
          // User switched accounts
          const newAddress = accounts[0];
          setWalletAddress(newAddress);
          localStorage.setItem('wallet_address', newAddress);
          
          // Re-authenticate with new account
          try {
            const { message, signature } = await signMessage(newAddress);
            await walletLogin(newAddress, signature, message);
          } catch (error) {
            console.error('Failed to authenticate new account:', error);
          }
        }
      };
      
      const handleChainChanged = () => {
        // Reload page on network change
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [walletAddress, isAuthenticated, logout, walletLogin]);
  
  const value = {
    walletAddress,
    isConnected,
    isConnecting,
    connect,
    disconnect
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
