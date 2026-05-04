import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Lock, User, Eye, EyeOff, CloudOff } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { ROLES } from '../utils/permissions';
import LanguageSelector from '../components/layout/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [offlinePin, setOfflinePin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();
  
  const { login, unlockOffline, isOnline, canUnlockOffline, offlineCandidate } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error(t('Please enter username and password'));
      return;
    }

    setLoading(true);
    try {
      const user = await login({ username, password });
      
      toast.success(t(`Welcome back, ${user.username}!`));
      
      // Redirect based on role
      if (user.role === ROLES.CASHIER) {
        navigate('/pos');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(t(error.response?.data?.message || 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineUnlock = async (e) => {
    e.preventDefault();
    if (!offlinePin) {
      toast.error(t('Enter your offline PIN'));
      return;
    }

    setLoading(true);
    try {
      const offlineUser = await unlockOffline(offlinePin);
      toast.success(t(`Offline access ready for ${offlineUser.username}`));
      navigate('/pos');
    } catch (error) {
      toast.error(t(error.message || 'Offline PIN is invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="fixed right-4 top-4 z-10">
        <LanguageSelector />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg">
            <ShoppingCart className="text-blue-600" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('POS System')}</h1>
          <p className="text-blue-100">
            {isOnline ? t('Sign in to your account') : t('Offline access to POS')}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {isOnline ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('Username')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('Enter username')}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('Password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                    placeholder={t('Enter password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-3 text-lg"
                disabled={loading}
              >
                {loading ? t('Signing in...') : t('Sign In')}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-medium">
                  <CloudOff size={18} />
                  {t('Offline mode')}
                </div>
                <p className="mt-2">
                  {canUnlockOffline
                    ? t(`Unlock POS for ${offlineCandidate?.username || 'cached user'} with your device PIN.`)
                    : t('This device does not have an offline PIN setup yet. Go online and sign in first.')}
                </p>
              </div>

              {canUnlockOffline && (
                <form onSubmit={handleOfflineUnlock} className="space-y-4">
                  <Input
                    label={t('Offline PIN')}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={offlinePin}
                    onChange={(e) => setOfflinePin(e.target.value)}
                    placeholder={t('Enter offline PIN')}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full py-3 text-lg"
                    disabled={loading}
                  >
                    {loading ? t('Unlocking...') : t('Unlock POS')}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
