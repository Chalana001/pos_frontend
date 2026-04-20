import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell } from 'lucide-react';
import BranchSelector from './BranchSelector';
import { canAccessAllBranches } from '../../utils/permissions';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const validUntilLabel = user?.subscriptionValidUntil
    ? new Date(user.subscriptionValidUntil).toLocaleDateString()
    : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {canAccessAllBranches(user.role) && <BranchSelector />}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {validUntilLabel && (
          <div className="hidden lg:flex flex-col rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {formatPlanName(user?.planName)}
            </div>
            <div className="text-xs text-emerald-800">
              Valid until {validUntilLabel}
            </div>
          </div>
        )}

        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
          <Bell size={20} className="text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
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
              <div className="text-xs text-slate-500">{user.role}</div>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
                {validUntilLabel && (
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-700">{formatPlanName(user?.planName)}</div>
                    <div className="text-xs text-slate-500">Valid until {validUntilLabel}</div>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
