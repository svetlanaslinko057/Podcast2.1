import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Loader2, Mail, Lock, User, Eye, EyeOff, ArrowRight,
  Send, Wallet, Headphones, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

export const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, walletLogin } = useAuth();
  const { connectWallet, walletAddress, isConnected } = useWallet();
  
  const defaultTab = searchParams.get('tab') || 'login';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  // Register form
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  
  const [errors, setErrors] = useState({});
  
  const validateRegister = () => {
    const newErrors = {};
    
    if (!registerData.username || registerData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(registerData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
    if (registerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!registerData.password || registerData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(loginData.username, loginData.password);
    
    if (result.success) {
      toast.success(`Welcome back, ${result.user.name || result.user.username}!`);
      navigate('/');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateRegister()) {
      return;
    }
    
    setLoading(true);
    
    const result = await register({
      username: registerData.username,
      email: registerData.email || null,
      password: registerData.password,
      name: registerData.name || registerData.username
    });
    
    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };
  
  const handleWalletLogin = async () => {
    setLoading(true);
    
    try {
      // Connect wallet first if not connected
      if (!isConnected) {
        await connectWallet();
      }
      
      if (walletAddress) {
        // In production, you'd sign a message here
        const result = await walletLogin(walletAddress, 'signature', 'message');
        
        if (result.success) {
          toast.success('Logged in with wallet!');
          navigate('/');
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      toast.error('Failed to connect wallet');
    }
    
    setLoading(false);
  };
  
  const handleTelegramLogin = () => {
    // TODO: Implement Telegram Login Widget
    toast.info('Telegram login coming soon!');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4">
            <Headphones className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FOMO Podcasts</h1>
          <p className="text-gray-500 mt-1">Your decentralized podcast platform</p>
        </div>
        
        <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 gap-0 p-0 bg-gray-100 rounded-none">
              <TabsTrigger 
                value="login" 
                className="rounded-none py-4 text-base data-[state=active]:bg-white data-[state=active]:shadow-none"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="rounded-none py-4 text-base data-[state=active]:bg-white data-[state=active]:shadow-none"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            {/* Login Tab */}
            <TabsContent value="login" className="p-6 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-username">Username or Email</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="login-username"
                      type="text"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      placeholder="Enter username or email"
                      className="pl-10 h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="Enter password"
                      className="pl-10 pr-10 h-12 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-base font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTelegramLogin}
                  className="h-12 rounded-xl"
                >
                  <Send className="w-5 h-5 mr-2 text-blue-500" />
                  Telegram
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleWalletLogin}
                  disabled={loading}
                  className="h-12 rounded-xl"
                >
                  <Wallet className="w-5 h-5 mr-2 text-purple-500" />
                  Wallet
                </Button>
              </div>
            </TabsContent>
            
            {/* Register Tab */}
            <TabsContent value="register" className="p-6 space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="reg-username">Username *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="reg-username"
                      type="text"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      placeholder="Choose a username"
                      className={`pl-10 h-12 rounded-xl ${errors.username ? 'border-red-500' : ''}`}
                      required
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.username}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="reg-name">Display Name</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    placeholder="Your display name"
                    className="mt-1 h-12 rounded-xl"
                  />
                </div>
                
                <div>
                  <Label htmlFor="reg-email">Email (optional)</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="reg-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      placeholder="your@email.com"
                      className={`pl-10 h-12 rounded-xl ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="reg-password">Password *</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      placeholder="Create a password"
                      className={`pl-10 pr-10 h-12 rounded-xl ${errors.password ? 'border-red-500' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="reg-confirm">Confirm Password *</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="reg-confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      placeholder="Confirm your password"
                      className={`pl-10 h-12 rounded-xl ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      required
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-base font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <CheckCircle className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or sign up with</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTelegramLogin}
                  className="h-12 rounded-xl"
                >
                  <Send className="w-5 h-5 mr-2 text-blue-500" />
                  Telegram
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleWalletLogin}
                  disabled={loading}
                  className="h-12 rounded-xl"
                >
                  <Wallet className="w-5 h-5 mr-2 text-purple-500" />
                  Wallet
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
        
        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-emerald-600 hover:underline">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
};
