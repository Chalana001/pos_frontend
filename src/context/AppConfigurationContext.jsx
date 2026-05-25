import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { appConfigurationAPI } from '../api/appConfiguration.api';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'app_configuration';

export const DEFAULT_APP_CONFIGURATION = {
  recipeItemsEnabled: true,
  weightItemsEnabled: true,
  servicesEnabled: true,
  tableManagementEnabled: true,
  dineInEnabled: true,
  categoryMode: 'MAIN_AND_SUB',
  stockOverrideMode: 'MANAGER_OVERRIDE',
};

const AppConfigurationContext = createContext(null);

const normalizeConfiguration = (value = {}) => ({
  recipeItemsEnabled: value.recipeItemsEnabled !== false,
  weightItemsEnabled: value.weightItemsEnabled !== false,
  servicesEnabled: value.servicesEnabled !== false,
  tableManagementEnabled: value.tableManagementEnabled !== false,
  dineInEnabled: value.tableManagementEnabled === false ? false : value.dineInEnabled !== false,
  categoryMode: value.categoryMode === 'SINGLE_CATEGORY' ? 'SINGLE_CATEGORY' : 'MAIN_AND_SUB',
  stockOverrideMode: ['BLOCK', 'MANAGER_OVERRIDE', 'ALWAYS_ALLOW'].includes(value.stockOverrideMode)
    ? value.stockOverrideMode
    : 'MANAGER_OVERRIDE',
});

const readCachedConfiguration = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeConfiguration(JSON.parse(raw)) : DEFAULT_APP_CONFIGURATION;
  } catch {
    return DEFAULT_APP_CONFIGURATION;
  }
};

export const AppConfigurationProvider = ({ children }) => {
  const { isAuthenticated, hasOnlineSession, isOnline } = useAuth();
  const [configuration, setConfiguration] = useState(readCachedConfiguration);
  const [loading, setLoading] = useState(false);

  const persistConfiguration = useCallback((value) => {
    const normalized = normalizeConfiguration(value);
    setConfiguration(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }, []);

  const refreshConfiguration = useCallback(async () => {
    if (!isAuthenticated || !hasOnlineSession || !isOnline) {
      return null;
    }

    try {
      setLoading(true);
      const response = await appConfigurationAPI.get();
      return persistConfiguration(response.data);
    } finally {
      setLoading(false);
    }
  }, [hasOnlineSession, isAuthenticated, isOnline, persistConfiguration]);

  useEffect(() => {
    refreshConfiguration().catch(() => {
      setLoading(false);
    });
  }, [refreshConfiguration]);

  const saveConfiguration = useCallback(async (nextConfiguration) => {
    const payload = normalizeConfiguration(nextConfiguration);
    const response = await appConfigurationAPI.update(payload);
    return persistConfiguration(response.data);
  }, [persistConfiguration]);

  const value = useMemo(() => ({
    configuration,
    loading,
    refreshConfiguration,
    saveConfiguration,
  }), [configuration, loading, refreshConfiguration, saveConfiguration]);

  return (
    <AppConfigurationContext.Provider value={value}>
      {children}
    </AppConfigurationContext.Provider>
  );
};

export const useAppConfiguration = () => {
  const context = useContext(AppConfigurationContext);
  if (!context) {
    throw new Error('useAppConfiguration must be used within AppConfigurationProvider');
  }
  return context;
};
