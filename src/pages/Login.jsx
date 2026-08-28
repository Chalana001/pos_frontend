import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Lock, User, Eye, EyeOff, CloudOff } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { ROLES } from '../utils/permissions';
import LanguageSelector from '../components/layout/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import { BRAND_NAME } from '../utils/branding';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [offlinePin, setOfflinePin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();
  
  const { login, unlockOffline, isOnline, canUnlockOffline, offlineCandidate, offlineCandidates } = useAuth();
  const navigate = useNavigate();

  // Defaults to whoever synced most recently, which is almost always the person standing
  // at the till; the picker only appears when more than one user enrolled on this device.
  const [offlineUserId, setOfflineUserId] = useState('');
  useEffect(() => {
    if (offlineUserId) return;
    const fallback = offlineCandidate?.userId ?? offlineCandidates[0]?.userId;
    if (fallback) setOfflineUserId(String(fallback));
  }, [offlineCandidate?.userId, offlineCandidates, offlineUserId]);

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
      const offlineUser = await unlockOffline(offlinePin, offlineUserId || null);
      toast.success(t(`Offline access ready for ${offlineUser.username}`));
      navigate('/pos', { replace: true });
    } catch (error) {
      toast.error(t(error.message || 'Offline PIN is invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen flex min-h-screen items-center justify-center p-4">
      <div className="fixed right-4 top-4 z-10">
        <LanguageSelector />
      </div>
      <div className="auth-panel-enter w-full max-w-md" style={{ animationDelay: '90ms' }}>
        <div className="page-section-enter mb-8 text-center" style={{ animationDelay: '180ms' }}>
          <div className="shell-chip mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-blue-900">
            POS Workspace
          </div>
          <h1 className="mb-2 text-4xl font-bold text-white">{BRAND_NAME}</h1>
          <p className="text-blue-100/95">
            {isOnline ? t('Sign in to your account') : t('Offline access to POS')}
          </p>
        </div>

        <div className="auth-card rounded-2xl p-8">
          {isOnline ? (
            <form onSubmit={handleSubmit} className="page-section-enter space-y-6" style={{ animationDelay: '260ms' }}>
              <div>
                <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-2">
                  {t('Username')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-600" size={20} />
                  <input id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('Enter username')}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-2">
                  {t('Password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-600" size={20} />
                  <input id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input w-full rounded-lg border border-slate-300 py-3 pl-10 pr-12 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                    placeholder={t('Enter password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-3 text-lg shadow-lg shadow-blue-600/20 hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? t('Signing in...') : t('Sign In')}
              </Button>
            </form>
          ) : (
            <div className="page-section-enter space-y-6" style={{ animationDelay: '260ms' }}>
              <div className="shell-kpi-glow rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-medium">
                  <CloudOff size={18} />
                  {t('Offline mode')}
                </div>
                <p className="mt-2">
                  {canUnlockOffline
                    ? t('Unlock POS with the PIN you set on this device.')
                    : t('Nobody has set an offline PIN on this device yet. Go online, sign in, and set one from the user menu.')}
                </p>
              </div>

              {canUnlockOffline && (
                <form onSubmit={handleOfflineUnlock} className="space-y-4">
                  {/* A PIN record only exists on the device where that PIN was set, so this
                      lists who enrolled here — not everyone who has an account. */}
                  {offlineCandidates.length > 1 ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="offline-user">
                        {t('User')}
                      </label>
                      <select
                        id="offline-user"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={offlineUserId}
                        onChange={(e) => setOfflineUserId(e.target.value)}
                      >
                        {offlineCandidates.map((candidate) => (
                          <option key={candidate.userId} value={candidate.userId}>
                            {candidate.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
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
                    className="w-full py-3 text-lg shadow-lg shadow-blue-600/20 hover:-translate-y-0.5"
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
