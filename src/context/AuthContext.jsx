import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUser, setUser, getToken, setToken, clearAuth } from '../utils/auth';
import { authAPI } from '../api/auth.api';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);

  const fetchAndStoreSubscription = useCallback(async (baseUser) => {
    if (!baseUser) return;
    try {
      setPlanLoading(true);
      const response = await api.get('/api/saas/my-subscription');
      const planName = response.data?.plan?.name ?? null;
      const subscriptionValidUntil = response.data?.validUntil ?? null;
      const planBillingCycle = response.data?.plan?.billingCycle ?? null;
      const updatedUser = { ...baseUser, planName, subscriptionValidUntil, planBillingCycle };
      setUser(updatedUser);
      setUserState(updatedUser);
    } catch {
      const updatedUser = { ...baseUser, planName: null, subscriptionValidUntil: null, planBillingCycle: null };
      setUser(updatedUser);
      setUserState(updatedUser);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = getUser();
    if (currentUser) {
      setUserState(currentUser);
      if (getToken()) {
        fetchAndStoreSubscription(currentUser);
      }
    }
    setLoading(false);
  }, [fetchAndStoreSubscription]);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    
    const { token, username, role, branchId, shopName } = response.data; 
    
    const userData = { username, role, branchId, shopName, planName: null, subscriptionValidUntil: null, planBillingCycle: null }; 
    
    setToken(token);
    setUser(userData);
    setUserState(userData);
    await fetchAndStoreSubscription(userData);
    
    return userData;
  };

  const logout = () => {
    clearAuth();
    setUserState(null);
    setPlanLoading(false);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
    planLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
