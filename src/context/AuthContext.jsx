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
import { getLastCachedUser, saveCachedUser } from "../offline/db";
import { createLocalPinRecord, verifyLocalPin } from "../offline/pin";
import useNetworkStatus from "../hooks/useNetworkStatus";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const isOnline = useNetworkStatus();
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [offlineCandidate, setOfflineCandidate] = useState(null);

  const refreshOfflineCandidate = useCallback(async () => {
    const cachedUser = await getLastCachedUser();
    setOfflineCandidate(cachedUser);
  }, []);

  const syncCachedUser = useCallback(async (baseUser) => {
    if (!baseUser?.userId) return;
    await saveCachedUser(baseUser);
    await refreshOfflineCandidate();
  }, [refreshOfflineCandidate]);

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
        } else if (currentUser || token) {
          clearAuth();
          setUserState(null);
          setAuthMode(null);
        } else {
          setUserState(null);
          setAuthMode(null);
        }
      } else if (offlineSessionUser) {
        setUserState(offlineSessionUser);
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

  const unlockOffline = async (pin) => {
    const cachedUser = await getLastCachedUser();
    if (!cachedUser) {
      throw new Error("No offline user is available on this device");
    }
    const valid = await verifyLocalPin(pin, cachedUser);
    if (!valid) {
      throw new Error("Invalid offline PIN");
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
    canUnlockOffline: !!offlineCandidate?.pinHash && !!offlineCandidate?.pinSalt,
  }), [authMode, isOnline, loading, offlineCandidate, planLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
