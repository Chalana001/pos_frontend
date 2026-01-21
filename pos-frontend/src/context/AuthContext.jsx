import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, setUser, getToken, setToken, clearAuth } from '../utils/auth';
import { authAPI } from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = getUser();
    if (currentUser) {
      setUserState(currentUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { token, username, role, branchId } = response.data;
    
    const userData = { username, role, branchId };
    setToken(token);
    setUser(userData);
    setUserState(userData);
    
    return userData;
  };

  const logout = () => {
    clearAuth();
    setUserState(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
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