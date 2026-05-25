import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  History,
  KeyRound,
  LogOut,
  PackageX,
  RotateCcw,
  ShieldAlert,
  UploadCloud,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import BranchSelector from './BranchSelector';
import { canAccessAllBranches } from '../../utils/permissions';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../../context/LanguageContext';
import { useBranch } from '../../context/BranchContext';
import { useShift } from '../../context/ShiftContext';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { customersAPI } from '../../api/customers.api';
import { stockAPI } from '../../api/stock.api';
import { getOfflineSales, getOfflineSalesCount, OFFLINE_EVENTS } from '../../offline/db';
import { APP_VERSION } from '../../data/versionHistory';
import { isSingleBranchPlan } from '../../utils/subscriptionFeatures';

const formatPlanName = (name) => {
  const labels = {
    FREE: 'Free',
    STANDARD: 'Standard',
    PRO: 'Pro',
    MONTHLY_LITE: 'Lite Monthly',
    YEARLY_LITE: 'Lite Yearly',
    MONTHLY_PRO: 'Pro Monthly',
    YEARLY_PRO: 'Pro Yearly',
    MONTHLY_DEMO: 'Demo',
  };
  return labels[name] || name || 'No Package';
};

const hasOpenShift = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value));

const getDismissedNotificationStorageKey = (user) =>
  `pos-dismissed-notifications:${user?.tenantId || 'tenant'}:${user?.username || 'user'}`;

const Header = () => {
  const { user, logout, isOnline, saveOfflinePin, hasOnlineSession } = useAuth();
  const { t } = useLanguage();
  const { selectedBranchId } = useBranch();
  const { activeShift, loadingShift } = useShift();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [failedImportCount, setFailedImportCount] = useState(0);
  const [stockConflictCount, setStockConflictCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [creditWarningCount, setCreditWarningCount] = useState(0);
  const [connectionRestored, setConnectionRestored] = useState(false);
  const [dismissedNotificationKeys, setDismissedNotificationKeys] = useState(() => new Set());
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [savingPin, setSavingPin] = useState(false);
  const wasOnlineRef = useRef(isOnline);
  const notificationRef = useRef(null);
  const dismissedNotificationStorageKey = getDismissedNotificationStorageKey(user);

  const validUntilLabel = user?.subscriptionValidUntil
    ? new Date(user.subscriptionValidUntil).toLocaleDateString()
    : null;

  const planNameLabel = formatPlanName(user?.planName);
  const hasShiftAlert = isOnline && hasOnlineSession && !loadingShift && selectedBranchId !== 0 && !hasOpenShift(activeShift);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(dismissedNotificationStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setDismissedNotificationKeys(new Set(Array.isArray(parsed) ? parsed : []));
    } catch {
      setDismissedNotificationKeys(new Set());
    }
  }, [dismissedNotificationStorageKey]);

  useEffect(() => {
    const loadQueueCount = async () => {
      const [count, rows] = await Promise.all([getOfflineSalesCount(), getOfflineSales()]);
      const failedRows = rows.filter((row) => row.lastError);
      const stockRows = rows.filter((row) => /stock|batch|item/i.test(String(row.lastError || '')));
      setOfflineQueueCount(count);
      setFailedImportCount(failedRows.length);
      setStockConflictCount(stockRows.length);
    };

    loadQueueCount();
    const handler = () => loadQueueCount();
    window.addEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);

    return () => window.removeEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);
  }, []);

  useEffect(() => {
    if (!wasOnlineRef.current && isOnline && offlineQueueCount > 0) {
      setConnectionRestored(true);
      toast.success(`Connection restored. ${offlineQueueCount} offline sale(s) are ready to import.`);
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, offlineQueueCount]);

  useEffect(() => {
    if (!isOnline || !hasOnlineSession || !selectedBranchId || selectedBranchId === 0) {
      setLowStockCount(0);
      return;
    }

    let cancelled = false;

    const loadStockAlerts = async () => {
      try {
        const response = await stockAPI.lowStock(selectedBranchId);
        if (cancelled) return;
        setLowStockCount(Array.isArray(response.data) ? response.data.length : 0);
      } catch {
        if (!cancelled) setLowStockCount(0);
      }
    };

    loadStockAlerts();
    return () => {
      cancelled = true;
    };
  }, [hasOnlineSession, isOnline, selectedBranchId]);

  useEffect(() => {
    if (!isOnline || !hasOnlineSession) {
      setCreditWarningCount(0);
      return;
    }

    let cancelled = false;

    const loadCreditWarnings = async () => {
      try {
        const response = await customersAPI.getAll();
        if (cancelled) return;
        const customers = Array.isArray(response.data) ? response.data : [];
        setCreditWarningCount(
          customers.filter((customer) => {
            const creditLimit = Number(customer.creditLimit || 0);
            const dueAmount = Number(customer.dueAmount || 0);
            return creditLimit > 0 && dueAmount >= creditLimit * 0.8;
          }).length
        );
      } catch {
        if (!cancelled) setCreditWarningCount(0);
      }
    };

    loadCreditWarnings();
    return () => {
      cancelled = true;
    };
  }, [hasOnlineSession, isOnline]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const toolbarItemClass =
    'inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50';
  const hideBranchSelector = location.pathname.startsWith('/purchases');
  const shouldHideBranchSelectorForPlan = isSingleBranchPlan(user?.planName);

  const getNotificationDismissKey = (notification) => `${notification.id}:${notification.message}`;

  const persistDismissedNotificationKeys = (nextKeys) => {
    localStorage.setItem(dismissedNotificationStorageKey, JSON.stringify(Array.from(nextKeys)));
  };

  const rawNotifications = [
    offlineQueueCount > 0 && {
      id: 'offline-queue',
      title: 'Offline Queue',
      message: `${offlineQueueCount} sales pending`,
      icon: UploadCloud,
      tone: 'blue',
      action: () => navigate('/offline-sales'),
    },
    lowStockCount > 0 && {
      id: 'stock-alert',
      title: 'Stock Alert',
      message: `${lowStockCount} items low stock`,
      icon: PackageX,
      tone: 'amber',
      action: () => navigate('/stock?status=REORDER'),
    },
    hasShiftAlert && {
      id: 'shift-alert',
      title: 'Shift Alert',
      message: 'No open shift',
      icon: AlertTriangle,
      tone: 'amber',
      action: () => navigate('/shifts'),
    },
    validUntilLabel && {
      id: 'subscription',
      title: 'Subscription',
      message: `${planNameLabel} expires on ${validUntilLabel}`,
      icon: CheckCircle2,
      tone: 'emerald',
      action: () => navigate('/pricing'),
    },
    connectionRestored && {
      id: 'connection-restored',
      title: 'Connection Restored',
      message: offlineQueueCount > 0 ? `${offlineQueueCount} offline sales ready to import` : 'System is back online',
      icon: Wifi,
      tone: 'emerald',
      action: () => navigate('/offline-sales'),
    },
    failedImportCount > 0 && {
      id: 'import-failed',
      title: 'Import Failed',
      message: `${failedImportCount} offline sales need retry`,
      icon: RotateCcw,
      tone: 'red',
      action: () => navigate('/offline-sales'),
    },
    stockConflictCount > 0 && {
      id: 'stock-conflicts',
      title: 'Pending Offline Stock Conflicts',
      message: `${stockConflictCount} queued sales have stock or batch issues`,
      icon: ShieldAlert,
      tone: 'red',
      action: () => navigate('/offline-sales'),
    },
    creditWarningCount > 0 && {
      id: 'credit-limit-warning',
      title: 'Credit Limit Warning',
      message: `${creditWarningCount} customers near credit limit`,
      icon: CreditCard,
      tone: 'amber',
      action: () => navigate('/customers'),
    },
  ].filter(Boolean);

  const notifications = rawNotifications.filter(
    (notification) => !dismissedNotificationKeys.has(getNotificationDismissKey(notification))
  );

  const notificationCount = notifications.length;

  const clearNotifications = () => {
    const nextKeys = new Set(dismissedNotificationKeys);
    rawNotifications.forEach((notification) => {
      nextKeys.add(getNotificationDismissKey(notification));
    });
    setDismissedNotificationKeys(nextKeys);
    persistDismissedNotificationKeys(nextKeys);
    setConnectionRestored(false);
  };

  const getNotificationToneClass = (tone) => {
    if (tone === 'red') return 'bg-red-50 text-red-700';
    if (tone === 'amber') return 'bg-amber-50 text-amber-700';
    if (tone === 'emerald') return 'bg-emerald-50 text-emerald-700';
    return 'bg-blue-50 text-blue-700';
  };

  return (
    <>
      <header className="shell-header-enter relative z-40 flex h-16 items-center justify-between gap-4 overflow-visible border-b border-slate-200 bg-white/75 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {canAccessAllBranches(user.role) && !hideBranchSelector && !shouldHideBranchSelectorForPlan && <BranchSelector />}
        </div>

        <div className="page-section-enter flex min-w-0 items-center gap-2" style={{ animationDelay: '120ms' }}>
          <LanguageSelector compact />

          <Link
            to="/offline-sales"
            className={`${toolbarItemClass} shell-panel-hover hidden gap-2 md:inline-flex`}
          >
            <UploadCloud size={16} />
            <span className="whitespace-nowrap">Offline Queue</span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-50 px-1.5 text-xs font-bold text-blue-700">
              {offlineQueueCount}
            </span>
          </Link>

          <div className={`shell-panel-hover hidden h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold shadow-sm md:inline-flex ${isOnline ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {validUntilLabel && (
            <div className="shell-panel-hover hidden h-11 min-w-[142px] flex-col justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-right shadow-sm lg:flex">
              <div className="text-[11px] font-bold uppercase leading-4 text-emerald-700">
                {t(formatPlanName(user?.planName))}
              </div>
              <div className="text-[11px] leading-4 text-emerald-800">
                {t(`Valid until ${validUntilLabel}`)}
              </div>
            </div>
          )}

          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications((open) => !open);
                if (!showNotifications) setConnectionRestored(false);
              }}
              className="shell-panel-hover relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Bell size={19} />
              {notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notificationCount}
                </span>
              ) : null}
            </button>

            {showNotifications && (
              <div className="modal-panel-enter absolute right-0 z-30 mt-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Notifications</div>
                    <div className="text-xs text-slate-500">{notificationCount} active alerts</div>
                  </div>
                  <button
                    type="button"
                    onClick={clearNotifications}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-800">No active notifications</div>
                    <div className="mt-1 text-xs text-slate-500">System checks are clear.</div>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto py-2">
                    {notifications.map((notification) => {
                      const Icon = notification.icon;
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            notification.action?.();
                          }}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getNotificationToneClass(notification.tone)}`}>
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900">{notification.title}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-500">{notification.message}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="shell-panel-hover flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm transition hover:bg-slate-50 sm:min-w-[150px]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                <User size={18} className="text-white" />
              </div>

              <div className="hidden min-w-0 text-left sm:block">
                <div className="truncate text-sm font-semibold leading-4 text-slate-800">{user.username}</div>
                <div className="truncate text-[11px] leading-4 text-slate-500">{t(user.role)}</div>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="modal-panel-enter absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
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
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/version-history');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <History size={16} />
                      Version History
                    </span>
                    <span className="text-xs font-semibold text-slate-500">v{APP_VERSION}</span>
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
