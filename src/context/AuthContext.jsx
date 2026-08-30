import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_EXPIRED_EVENT,
  clearAuth,
  clearOfflineSession,
  getOfflineSessionUser,
  getToken,
  getUser,
  setOfflineSessionUser,
  setToken,
  setUser,
} from "../utils/auth";
import { authAPI } from "../api/auth.api";
import api from "../api/axios";
import {
  clearFreeLocalSalesIfNewDay,
  getCachedUserById,
  getCachedUsersWithPin,
  getLastCachedUser,
  saveCachedUser,
} from "../offline/db";
import { createLocalPinRecord, isLegacyPinRecord, verifyLocalPin } from "../offline/pin";
import useNetworkStatus from "../hooks/useNetworkStatus";
import { clearModules, hydrateModulesFromCache, setModules } from "../utils/moduleAccess";
import { clearSupportSession, consumeSupportSessionFromUrl } from "../utils/supportSession";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const isOnline = useNetworkStatus();
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [offlineCandidate, setOfflineCandidate] = useState(null);
  const [offlineCandidates, setOfflineCandidates] = useState([]);

  const refreshOfflineCandidate = useCallback(async () => {
    const [cachedUser, enrolledUsers] = await Promise.all([
      getLastCachedUser(),
      getCachedUsersWithPin(),
    ]);
    setOfflineCandidate(cachedUser);
    setOfflineCandidates(enrolledUsers);
  }, []);

  // Keep an existing offline-session snapshot in step with the live user record. The
  // snapshot is frozen at the moment it was created, while pos_user is refreshed on every
  // online bootstrap — so a changed role, branch or plan never reached the offline session.
  // Only refresh a snapshot that is already there and belongs to this same user: login()
  // clears it on purpose, so a new user must never inherit the previous one's.
  const refreshOfflineSessionSnapshot = useCallback((freshUser) => {
    const existing = getOfflineSessionUser();
    if (existing && existing.userId === freshUser?.userId) {
      setOfflineSessionUser(freshUser);
    }
  }, []);

  const syncCachedUser = useCallback(async (baseUser) => {
    if (!baseUser?.userId) return;
    await saveCachedUser(baseUser);
    refreshOfflineSessionSnapshot(baseUser);
    await refreshOfflineCandidate();
  }, [refreshOfflineCandidate, refreshOfflineSessionSnapshot]);

  // The shop's module set is resolved server-side (plan template + per-shop overrides) and
  // cached locally, so an offline start still knows which menu items to draw.
  const refreshModules = useCallback(async () => {
    try {
      // Marked background: this call has a working fallback (the cached set, then the
      // plan tier), so a backend that is down or not yet migrated must not throw a
      // "Server Error" toast at a cashier mid-sale over something the app recovers from.
      const response = await api.get("/api/saas/my-modules", { meta: { background: true } });
      setModules(response.data);
      return response.data;
    } catch {
      // Fall back to whatever was cached from the last successful fetch. If there is
      // nothing cached, subscriptionFeatures.js falls back to the plan tier.
      hydrateModulesFromCache(null);
      return null;
    }
  }, []);

  const fetchAndStoreSubscription = useCallback(async (baseUser) => {
    if (!baseUser) return baseUser;
    try {
      setPlanLoading(true);
      const response = await api.get("/api/saas/my-subscription");
      const planName = response.data?.plan?.name ?? null;
      const subscriptionValidUntil = response.data?.validUntil ?? null;
      const planBillingCycle = response.data?.plan?.billingCycle ?? null;
      const updatedUser = { ...baseUser, planName, subscriptionValidUntil, planBillingCycle };
      setUser(updatedUser);
      setUserState(updatedUser);
      if (planName === "FREE" || planName === "MONTHLY_DEMO") {
        await clearFreeLocalSalesIfNewDay();
      }
      await syncCachedUser(updatedUser);
      await refreshModules();
      return updatedUser;
    } catch {
      const updatedUser = {
        ...baseUser,
        planName: null,
        subscriptionValidUntil: null,
        planBillingCycle: null,
      };
      setUser(updatedUser);
      setUserState(updatedUser);
      await syncCachedUser(updatedUser);
      // The subscription call failed, so do not touch the cached module set — a network
      // blip must not silently strip the shop's package down to the fallback tier.
      hydrateModulesFromCache(null);
      return updatedUser;
    } finally {
      setPlanLoading(false);
    }
  }, [refreshModules, syncCachedUser]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      // A support session arrives as a token in the URL fragment. Take it before anything
      // else looks at storage, so the operator lands signed in as the shop rather than on
      // whatever session this browser happened to have.
      const support = consumeSupportSessionFromUrl();
      if (support?.token) {
        setToken(support.token);
        clearOfflineSession();
        try {
          const me = await authAPI.getCurrentUser();
          const supportUser = {
            id: me.data.userId,
            userId: me.data.userId,
            username: me.data.username,
            role: me.data.role,
            branchId: me.data.branchId,
            shopName: me.data.shopName,
            hasOfflinePin: me.data.hasOfflinePin,
            planName: null,
            subscriptionValidUntil: null,
            planBillingCycle: null,
          };
          setUser(supportUser);
          setUserState(supportUser);
          setAuthMode("online");
          await fetchAndStoreSubscription(supportUser);
        } catch {
          // Expired or already-revoked token — fall through to the normal paths below
          // so the operator sees the login screen rather than a blank app.
          clearSupportSession();
          clearAuth();
        }
        setLoading(false);
        return;
      }

      const currentUser = getUser();
      const token = getToken();
      const offlineSessionUser = getOfflineSessionUser();

      await refreshOfflineCandidate();
      // Draw the correct menu on first paint, before the network call returns.
      hydrateModulesFromCache(null);

      if (isOnline) {
        if (currentUser && token) {
          setAuthMode("online");
          setUserState(currentUser);
          await fetchAndStoreSubscription(currentUser);
        } else if (offlineSessionUser) {
          if (offlineSessionUser.planName === "FREE" || offlineSessionUser.planName === "MONTHLY_DEMO") {
            await clearFreeLocalSalesIfNewDay();
          }
          setUserState(offlineSessionUser);
          setAuthMode("offline");
        } else if (currentUser || token) {
          clearAuth();
          setUserState(null);
          setAuthMode(null);
        } else {
          setUserState(null);
          setAuthMode(null);
        }
      } else if (offlineSessionUser) {
        if (offlineSessionUser.planName === "FREE" || offlineSessionUser.planName === "MONTHLY_DEMO") {
          await clearFreeLocalSalesIfNewDay();
        }
        setUserState(offlineSessionUser);
        setAuthMode("offline");
      } else if (currentUser && token) {
        // The connection dropped on a session that is still signed in — the stored user
        // and token are untouched, the device has not changed, and this session was
        // already unlocked. Nulling the user here threw the cashier onto the PIN screen
        // with a live cart open. Downgrade the mode and keep them working; the PIN keeps
        // its real job of unlocking a browser reloaded with no session at all.
        setOfflineSessionUser(currentUser);
        if (currentUser.planName === "FREE" || currentUser.planName === "MONTHLY_DEMO") {
          await clearFreeLocalSalesIfNewDay();
        }
        setUserState(currentUser);
        setAuthMode("offline");
      } else {
        setUserState(null);
        setAuthMode(null);
      }

      setLoading(false);
    };

    bootstrapAuth();
  }, [fetchAndStoreSubscription, isOnline, refreshOfflineCandidate]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUserState(null);
      setPlanLoading(false);
      setLoading(false);
      setAuthMode(null);
      clearOfflineSession();
    };

    const handleStorage = (event) => {
      if (event.key === "pos_token" || event.key === "pos_user" || event.key === "pos_offline_session_user") {
        if (!getToken() && !getOfflineSessionUser()) {
          handleAuthExpired();
        }
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { userId, token, username, role, branchId, shopName, hasOfflinePin } = response.data;

    const userData = {
      id: userId,
      userId,
      username,
      role,
      branchId,
      shopName,
      hasOfflinePin,
      planName: null,
      subscriptionValidUntil: null,
      planBillingCycle: null,
    };

    setToken(token);
    setUser(userData);
    clearOfflineSession();
    setAuthMode("online");
    setUserState(userData);
    await syncCachedUser(userData);
    await fetchAndStoreSubscription(userData);

    return userData;
  };

  const unlockOffline = async (pin, requestedUserId = null) => {
    // Any user enrolled on this device may unlock it, not only the one who synced last.
    const cachedUser = requestedUserId
      ? await getCachedUserById(Number(requestedUserId))
      : await getLastCachedUser();

    if (!cachedUser) {
      throw new Error("No offline user is available on this device");
    }
    const valid = await verifyLocalPin(pin, cachedUser);
    if (!valid) {
      throw new Error("Invalid offline PIN");
    }

    // A successful unlock is the only moment the plaintext PIN is in hand, so it is the
    // only moment a pre-PBKDF2 record can be re-derived without making the user reset it.
    if (isLegacyPinRecord(cachedUser)) {
      try {
        await saveCachedUser({ ...cachedUser, ...(await createLocalPinRecord(pin)) });
      } catch (error) {
        console.error("Could not upgrade the stored offline PIN hash", error);
      }
    }

    const offlineUser = {
      id: cachedUser.userId,
      userId: cachedUser.userId,
      username: cachedUser.username,
      role: cachedUser.role,
      branchId: cachedUser.branchId,
      shopName: cachedUser.shopName,
      hasOfflinePin: true,
      planName: cachedUser.planName ?? null,
      subscriptionValidUntil: cachedUser.subscriptionValidUntil ?? null,
      planBillingCycle: cachedUser.planBillingCycle ?? null,
    };

    setOfflineSessionUser(offlineUser);
    if (offlineUser.planName === "FREE" || offlineUser.planName === "MONTHLY_DEMO") {
      await clearFreeLocalSalesIfNewDay();
    }
    setUserState(offlineUser);
    setAuthMode("offline");
    return offlineUser;
  };

  const saveOfflinePin = async ({ currentPin, newPin }) => {
    if (!getToken()) {
      throw new Error("You need an online session to update the offline PIN");
    }

    await authAPI.saveOfflinePin({ currentPin, newPin });
    const pinRecord = await createLocalPinRecord(newPin);
    const updatedUser = { ...user, hasOfflinePin: true };
    setUserState(updatedUser);
    setUser(updatedUser);
    await saveCachedUser({
      ...updatedUser,
      ...pinRecord,
    });
    await refreshOfflineCandidate();
    return true;
  };

  const logout = () => {
    // Tell the server first — clearAuth() drops the token the request needs to identify
    // which session to end. Deliberately not awaited: local sign-out must not wait on, or
    // be blocked by, a network round trip.
    if (getToken()) {
      authAPI.logout().catch(() => {
        // Offline, or the token had already expired. The session dies with the token either
        // way; the point of the call is to kill it sooner, not to gate signing out on it.
      });
    }

    clearAuth();
    clearOfflineSession();
    // Never leave one shop's package behind on a shared device.
    clearModules();
    clearSupportSession();
    setUserState(null);
    setPlanLoading(false);
    setAuthMode(null);
  };

  const value = useMemo(() => ({
    user,
    login,
    logout,
    unlockOffline,
    saveOfflinePin,
    isAuthenticated: !!user && (authMode === "offline" || !!getToken()),
    hasOnlineSession: !!getUser() && !!getToken(),
    isOfflineSession: authMode === "offline",
    isOnline,
    loading,
    planLoading,
    offlineCandidate,
    offlineCandidates,
    canUnlockOffline: offlineCandidates.length > 0,
  }), [authMode, isOnline, loading, offlineCandidate, offlineCandidates, planLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
