import React, { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { hasPermission } from '../utils/permissions';
import { hasPlanFeature } from '../utils/subscriptionFeatures';
import { canOpenPath, moduleForPath } from '../utils/moduleAccess';
import LockedFeatureDialog from '../components/common/LockedFeatureDialog';

const ProtectedRoute = ({ children, permission, feature, requiresOnline = false, skipModuleGate = false }) => {
  const { user, isAuthenticated, loading, planLoading, isOnline, hasOnlineSession } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  // Which locked path the reader has already dismissed. Stored as the path rather than a
  // boolean so walking to a *different* locked page shows the dialog again instead of
  // silently redirecting — and so no effect is needed to reset it.
  const [dismissedPath, setDismissedPath] = useState(null);

  // Somewhere this user can actually go once they close the dialog. Checked against both
  // role and module, because either can rule a page out, and falling back to "/" would
  // bounce through HomeRedirect straight into /dashboard — which may be the very module
  // they just got blocked on.
  const fallbackPath = useMemo(() => {
    const candidates = [
      hasPermission(user?.role, 'ACCESS_POS') ? '/pos' : null,
      hasPermission(user?.role, 'VIEW_DASHBOARD') ? '/dashboard' : null,
      hasPermission(user?.role, 'VIEW_SALES') ? '/sales' : null,
      hasPermission(user?.role, 'VIEW_ITEMS') ? '/items' : null,
    ].filter(Boolean);
    // Items is a core module and can never be switched off, so this always resolves.
    return candidates.find((path) => canOpenPath(path)) ?? '/items';
  }, [user?.role]);

  if (loading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // An online-only page reached while offline. Anyone who can sell is sent to the POS,
  // which keeps working offline — the message below used to be a dead end with no link
  // and no button, which is exactly the wrong thing to show a cashier mid-outage.
  // /pos is not an online-only route, so this cannot loop.
  if (requiresOnline && (!isOnline || !hasOnlineSession)) {
    if (hasPermission(user?.role, 'ACCESS_POS')) {
      return <Navigate to="/pos" replace />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">{t("Online Connection Required")}</h1>
          <p className="text-slate-600">{t("This page only works with an active online session.")}</p>
        </div>
      </div>
    );
  }

  if (permission && !hasPermission(user.role, permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">{t('Access Denied')}</h1>
          <p className="text-slate-600">{t("You don't have permission to access this page.")}</p>
        </div>
      </div>
    );
  }

  if (feature && !hasPlanFeature(user?.planName, feature)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">{t('Package Restricted')}</h1>
          <p className="text-slate-600">{t('Your current package does not include this feature.')}</p>
        </div>
      </div>
    );
  }

  // Gate on the module that owns this route.
  //
  // The `feature` prop above only covers the handful of keys the old plan matrix knew
  // about — it has no key for the POS screen or the dashboard, so those pages stayed
  // reachable even with their module switched off. This asks the server's own route map
  // instead, so every page the catalog claims is covered without a prop per route.
  //
  // skipModuleGate is set on the instance that wraps <Layout />. That one guards the shell,
  // not a page, but it still sees the child's pathname — so without this it would match
  // /dashboard, decide "blocked", and render the message INSTEAD of the whole app,
  // sidebar included. The per-page instance below it is the one that should answer.
  if (!skipModuleGate && !canOpenPath(location.pathname)) {
    // Someone reached this by typing the URL or following an old link — the sidebar
    // marks these locked rather than letting them through.
    //
    // Closing goes to a page they can use, with replace, so the locked URL leaves the
    // history: navigate(-1) was wrong twice over — it does nothing at all when they
    // arrived by typing the URL, leaving the modal up with the sidebar unclickable
    // behind its backdrop, and when it did work it could land them on another locked
    // page or outside the app entirely.
    if (dismissedPath === location.pathname) {
      return <Navigate to={fallbackPath} replace />;
    }

    return (
      <LockedFeatureDialog
        moduleKey={moduleForPath(location.pathname)}
        open
        onClose={() => setDismissedPath(location.pathname)}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
