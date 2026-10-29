import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, CloudOff, ArrowRight, KeyRound, Lock, ShieldCheck, Cpu, Printer } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { ROLES } from '../utils/permissions';
import LanguageSelector from '../components/layout/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import { BRAND_NAME, BRAND_MARK } from '../utils/branding';
import CustomSelect from '../components/common/CustomSelect';
import { APP_VERSION } from '../data/versionHistory';

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

  // Show the PIN form when the server is unreachable OR the user explicitly picked the
  // secondary action while online (matches the Stitch "Unlock with Offline PIN" button).
  const [pinOpen, setPinOpen] = useState(false);
  const showPinForm = !isOnline || pinOpen;

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      {/* LEFT PANEL: brand hub, always dark navy in both themes (mirrors the Stitch split). */}
      <section className="relative flex w-full flex-col justify-between overflow-hidden bg-[rgb(var(--c-sidebar))] p-8 text-white md:min-h-screen md:w-1/2 lg:p-14">
        {/* Technical grid, same faint white lines as the design. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 login-grid-pattern" />

        {/* Top telemetry strip */}
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] tracking-wider text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-200">{t('STATION ACTIVE')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{t('NET: LAN')}</span>
            <span className="text-slate-600">•</span>
            <span className="font-medium text-emerald-400">{isOnline ? t('ONLINE') : t('OFFLINE')}</span>
          </div>
        </header>

        {/* Center brand anchor */}
        <div className="relative z-10 my-auto max-w-md py-12">
          <div className="mb-6 flex items-center gap-3.5">
            <img
              src={BRAND_MARK}
              alt={`${BRAND_NAME} mark`}
              className="sidebar-logo-spin h-12 w-12 shrink-0 rounded-full object-contain"
            />
            <div className="flex flex-col">
              <h1 className="font-headline text-3xl font-bold leading-none tracking-tight text-white">
                {BRAND_NAME}
              </h1>
              <span className="mt-1 text-[10px] font-semibold tracking-[0.25em] text-cyan-400">
                {t('POINT OF SALE')}
              </span>
            </div>
          </div>
          <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-300">
            {t('Industrial-grade transaction processing. Built for continuous desktop till operations.')}
          </p>
          {/* Telemetry badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="inline-flex items-center gap-1.5 rounded border border-slate-700/60 bg-slate-800/80 px-2.5 py-1 font-mono text-[11px] text-slate-300">
              <Cpu size={14} className="text-slate-400" />
              <span>{t('ENGINE READY')}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded border border-slate-700/60 bg-slate-800/80 px-2.5 py-1 font-mono text-[11px] text-slate-300">
              <Printer size={14} className="text-slate-400" />
              <span>{t('RECEIPT FEED: ONLINE')}</span>
            </div>
          </div>
        </div>

        {/* Bottom metadata + TLS seal */}
        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6 font-mono text-[11px] text-slate-400">
          <div>{t('ZenSys Core Engine')} v{APP_VERSION}</div>
          <div className="flex items-center gap-1.5 rounded border border-slate-700/50 bg-slate-800/60 px-2 py-0.5 text-slate-300">
            <Lock size={13} className="text-emerald-400" />
            <span>{t('Secure session')}</span>
          </div>
        </footer>
      </section>

      {/* RIGHT PANEL: auth workspace, follows the theme surface. */}
      <section className="flex w-full flex-col items-center justify-center bg-surface-2 p-6 md:min-h-screen md:w-1/2 md:p-12">
        <div className="w-full max-w-[400px]">
          <div className="auth-panel-enter" style={{ animationDelay: '90ms' }}>
            <div className="rounded-xl border border-border bg-surface p-8 shadow-sm transition-all">
              <header className="mb-6">
                <h2 className="text-[28px] font-semibold leading-tight text-text">
                  {isOnline ? t('Sign in') : t('Offline access')}
                </h2>
                <p className="mt-1.5 text-sm text-text-muted">
                  {isOnline
                    ? t('Enter your credentials to continue')
                    : t('Unlock the POS with the PIN set on this device')}
                </p>
              </header>

              {isOnline && !showPinForm ? (
                <form onSubmit={handleSubmit} className="page-section-enter space-y-4" style={{ animationDelay: '200ms' }}>
                  <div>
                    <label htmlFor="login-username" className="mb-1.5 block text-xs font-medium text-text">
                      {t('Username')}
                    </label>
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="auth-input w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-text placeholder-text-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder={t('cashier id or email')}
                      autoFocus
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="login-password" className="block text-xs font-medium text-text">
                        {t('Password')}
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input w-full rounded-lg border border-border-strong bg-surface py-2.5 pl-3.5 pr-10 text-sm text-text placeholder-text-subtle transition-colors [tabular-nums] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('Hide password') : t('Show password')}
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-subtle transition-colors hover:text-text focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1.5">
                    <Button
                      type="submit"
                      className="w-full gap-2 py-3 text-sm font-medium"
                      disabled={loading}
                    >
                      <span>{loading ? t('Signing in...') : t('Sign in')}</span>
                      {!loading && <ArrowRight size={17} />}
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div aria-hidden="true" className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-wider">
                      <span className="bg-surface px-2.5 text-text-muted">{t('OR')}</span>
                    </div>
                  </div>

                  {/* Secondary: offline PIN */}
                  <button
                    type="button"
                    onClick={() => setPinOpen(true)}
                    disabled={!canUnlockOffline}
                    title={canUnlockOffline ? undefined : t('No offline PIN set on this device yet')}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-2 focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <KeyRound size={17} className="text-text-muted" />
                    <span>{t('Unlock with Offline PIN')}</span>
                  </button>
                </form>
              ) : (
                <div className="page-section-enter space-y-4" style={{ animationDelay: '200ms' }}>
                  {!isOnline && (
                    <div className="rounded-lg border border-warning-border bg-warning-soft p-3.5 text-sm text-warning">
                      <div className="flex items-center gap-2 font-medium">
                        <CloudOff size={17} />
                        {t('Offline mode')}
                      </div>
                      <p className="mt-1.5">
                        {canUnlockOffline
                          ? t('Unlock POS with the PIN you set on this device.')
                          : t('Nobody has set an offline PIN on this device yet. Go online, sign in, and set one from the user menu.')}
                      </p>
                    </div>
                  )}

                  {canUnlockOffline && (
                    <form onSubmit={handleOfflineUnlock} className="space-y-4">
                      {/* A PIN record only exists on the device where that PIN was set, so this
                          lists who enrolled here, not everyone who has an account. */}
                      {offlineCandidates.length > 1 ? (
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-text">
                            {t('User')}
                          </label>
                          <CustomSelect
                            value={offlineUserId}
                            onChange={setOfflineUserId}
                            options={offlineCandidates}
                            valueKey="userId"
                            labelKey="username"
                            buttonClassName="py-2.5 px-3"
                          />
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
                        className="w-full gap-2 py-3 text-sm font-medium"
                        disabled={loading}
                      >
                        <KeyRound size={17} />
                        <span>{loading ? t('Unlocking...') : t('Unlock POS')}</span>
                      </Button>
                    </form>
                  )}

                  {isOnline && (
                    <button
                      type="button"
                      onClick={() => setPinOpen(false)}
                      className="w-full text-center text-xs font-medium text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
                    >
                      {t('Back to sign in')}
                    </button>
                  )}
                </div>
              )}

              {/* Card footer: version + language */}
              <div className="mt-7 flex items-center justify-between border-t border-border pt-4 text-xs text-text-muted">
                <span className="font-mono text-[11px]">v{APP_VERSION}</span>
                <LanguageSelector />
              </div>
            </div>

            {/* Status badge below card */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-text-muted">
              <ShieldCheck size={16} className="text-success" />
              <span>{isOnline ? t('Terminal ready') : t('Running offline')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
