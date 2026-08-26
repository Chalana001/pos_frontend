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
      return updatedUser;
    } finally {
      setPlanLoading(false);
    }
  }, [syncCachedUser]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const currentUser = getUser();
      const token = getToken();
      const offlineSessionUser = getOfflineSessionUser();

      await refreshOfflineCandidate();

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
    clearAuth();
    clearOfflineSession();
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
