import React, { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { hasPermission } from '../utils/permissions';
import { hasPlanFeature } from '../utils/subscriptionFeatures';
import { canOpenPath, moduleForPath } from '../utils/moduleAccess';
import LockedFeatureDialog from '../components/common/LockedFeatureDialog';

const ProtectedRoute = ({ children, permission, feature, requiresOnline = false, skipModuleGate = false }) => {
  const { user, isAuthenticated, loading, planLoading, hasOnlineSession } = useAuth();
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

  // The spinner belongs to the FIRST load only.
  //
  // planLoading goes true again every time the subscription is re-fetched, and reconnecting
  // re-fetches it. Blanking the whole route for that swapped the rendered page out for a
  // spinner and back, which unmounts it — so coming back online destroyed a half-typed
  // purchase just as surely as the old redirect did, only a few seconds later and without
  // anything on screen to explain it.
  //
  // A refresh keeps the plan name it already had, so the gate below still has an answer to
  // work with. Only the genuine cold start — no plan known yet — has to wait.
  if (loading || (planLoading && !user?.planName)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Online-only pages gate on having a SESSION, never on the network being up.
  //
  // Losing the connection deliberately changes nothing here. The page the user is on stays
  // exactly as it is — no redirect, no banner, no dialog — and the failure surfaces the way
  // every other failure in the app does: the axios interceptor's "Backend connection failed"
  // toast, once, deduplicated. A page that is already rendered keeps its state and its
  // contents; a cart, its quantities and its prices are local anyway. The POS is entered by
  // the user clicking POS, which is the only time offline mode should begin.
  //
  // This used to redirect to /pos on `!isOnline`, which put a manager reading a report
  // behind the till because the wifi blinked, and destroyed any half-typed form on the way.
  // Later attempts to soften it — a modal, then a banner — were the same mistake in smaller
  // clothes: they interrupted someone who had asked for nothing. Do not add another.
  //
  // `!hasOnlineSession` is a genuinely different state and still belongs here: an offline
  // PIN unlock has no token at all, these pages were never available to it, and no amount of
  // waiting or retrying will open them. The till is the only thing that works, so that is
  // where it goes.
  if (requiresOnline && !hasOnlineSession) {
    if (hasPermission(user?.role, 'ACCESS_POS')) {
      // Deliberately not `replace`: leaving the entry in history means Back is a way out of
      // an unwanted bounce, rather than a dead key.
      return <Navigate to="/pos" />;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{t("Online Connection Required")}</h1>
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
