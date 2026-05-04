import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Bell, Wifi, WifiOff, KeyRound, UploadCloud } from 'lucide-react';
import BranchSelector from './BranchSelector';
import { canAccessAllBranches } from '../../utils/permissions';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../../context/LanguageContext';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { getOfflineSalesCount, OFFLINE_EVENTS } from '../../offline/db';

const formatPlanName = (name) => {
  const labels = {
    MONTHLY_LITE: 'Lite Monthly',
    YEARLY_LITE: 'Lite Yearly',
    MONTHLY_PRO: 'Pro Monthly',
    YEARLY_PRO: 'Pro Yearly',
    MONTHLY_DEMO: 'Demo',
  };
  return labels[name] || name || 'No Package';
};

const Header = () => {
  const { user, logout, isOnline, saveOfflinePin, hasOnlineSession } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [savingPin, setSavingPin] = useState(false);
  const wasOnlineRef = useRef(isOnline);

  const validUntilLabel = user?.subscriptionValidUntil
    ? new Date(user.subscriptionValidUntil).toLocaleDateString()
    : null;

  useEffect(() => {
    const loadQueueCount = async () => {
      setOfflineQueueCount(await getOfflineSalesCount());
    };

    loadQueueCount();
    const handler = () => loadQueueCount();
    window.addEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);

    return () => window.removeEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);
  }, []);

  useEffect(() => {
    if (!wasOnlineRef.current && isOnline && offlineQueueCount > 0) {
      toast.success(`Connection restored. ${offlineQueueCount} offline sale(s) are ready to import.`);
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, offlineQueueCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSavePin = async () => {
    if (!pinForm.newPin || pinForm.newPin.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      toast.error('PIN confirmation does not match');
      return;
    }

    setSavingPin(true);
    try {
      await saveOfflinePin({
        currentPin: pinForm.currentPin,
        newPin: pinForm.newPin,
      });
      toast.success('Offline PIN updated for this device');
      setPinModalOpen(false);
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update offline PIN');
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {canAccessAllBranches(user.role) && <BranchSelector />}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSelector compact />

          <Link
            to="/offline-sales"
            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <UploadCloud size={16} />
            Offline Queue
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {offlineQueueCount}
            </span>
          </Link>

          <div className={`hidden md:inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {validUntilLabel && (
            <div className="hidden lg:flex flex-col rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {t(formatPlanName(user?.planName))}
              </div>
              <div className="text-xs text-emerald-800">
                {t(`Valid until ${validUntilLabel}`)}
              </div>
            </div>
          )}

          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
            <Bell size={20} className="text-slate-600" />
            {offlineQueueCount > 0 ? (
              <span className="absolute top-1 right-1 min-w-[0.5rem] h-2 rounded-full bg-blue-500" />
            ) : (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                <User size={18} className="text-white" />
              </div>

              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium text-slate-800 leading-tight">{user.username}</div>
                <div className="text-xs text-slate-500">{t(user.role)}</div>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
                  {validUntilLabel && (
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-semibold text-slate-700">{t(formatPlanName(user?.planName))}</div>
                      <div className="text-xs text-slate-500">{t(`Valid until ${validUntilLabel}`)}</div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/offline-sales');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <UploadCloud size={16} />
                      Offline Queue
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{offlineQueueCount}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setPinModalOpen(true);
                    }}
                    disabled={!hasOnlineSession}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <KeyRound size={16} />
                    Offline PIN
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <LogOut size={16} />
                    {t('Logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <Modal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} title="Offline PIN" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Set or update the PIN used to unlock this device when the system is offline.
          </p>
          <Input
            label="Current PIN"
            type="password"
            inputMode="numeric"
            value={pinForm.currentPin}
            onChange={(event) => setPinForm((prev) => ({ ...prev, currentPin: event.target.value }))}
            placeholder="Required if a PIN already exists"
          />
          <Input
            label="New PIN"
            type="password"
            inputMode="numeric"
            value={pinForm.newPin}
            onChange={(event) => setPinForm((prev) => ({ ...prev, newPin: event.target.value }))}
            placeholder="4 to 8 digits"
          />
          <Input
            label="Confirm PIN"
            type="password"
            inputMode="numeric"
            value={pinForm.confirmPin}
            onChange={(event) => setPinForm((prev) => ({ ...prev, confirmPin: event.target.value }))}
            placeholder="Re-enter the new PIN"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPinModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSavePin} disabled={savingPin}>
              {savingPin ? 'Saving...' : 'Save PIN'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Header;
