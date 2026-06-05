import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { appConfigurationAPI } from '../api/appConfiguration.api';
import { useAuth } from './AuthContext';
import { useBranch } from './BranchContext';

const getStorageKey = (branchId) => `app_configuration:${branchId || 'default'}`;

export const DEFAULT_APP_CONFIGURATION = {
  recipeItemsEnabled: true,
  weightItemsEnabled: true,
  servicesEnabled: true,
  tableManagementEnabled: true,
  dineInEnabled: true,
  categoryMode: 'MAIN_AND_SUB',
  stockOverrideMode: 'MANAGER_OVERRIDE',
  adminStockOverrideAllowed: true,
  managerStockOverrideAllowed: true,
  cashierStockOverrideAllowed: false,
  warrantyEnabled: true,
  kotEnabled: true,
  printReceiptAfterCheckout: true,
  adminWarrantyAllowed: true,
  managerWarrantyAllowed: true,
  cashierWarrantyAllowed: false,
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
  adminStockOverrideAllowed: value.adminStockOverrideAllowed !== false,
  managerStockOverrideAllowed: value.managerStockOverrideAllowed !== false,
  cashierStockOverrideAllowed: value.cashierStockOverrideAllowed === true,
  warrantyEnabled: value.warrantyEnabled !== false,
  kotEnabled: value.kotEnabled !== false,
  printReceiptAfterCheckout: value.printReceiptAfterCheckout !== false,
  adminWarrantyAllowed: value.adminWarrantyAllowed !== false,
  managerWarrantyAllowed: value.managerWarrantyAllowed !== false,
  cashierWarrantyAllowed: value.cashierWarrantyAllowed === true,
});

const readCachedConfiguration = () => {
  try {
    const raw = localStorage.getItem(getStorageKey(null));
    return raw ? normalizeConfiguration(JSON.parse(raw)) : DEFAULT_APP_CONFIGURATION;
  } catch {
    return DEFAULT_APP_CONFIGURATION;
  }
};

const readCachedConfigurationForBranch = (branchId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(branchId));
    return raw ? normalizeConfiguration(JSON.parse(raw)) : DEFAULT_APP_CONFIGURATION;
  } catch {
    return DEFAULT_APP_CONFIGURATION;
  }
};

export const AppConfigurationProvider = ({ children }) => {
  const { user, isAuthenticated, hasOnlineSession, isOnline } = useAuth();
  const { selectedBranchId } = useBranch();
  const activeBranchId = useMemo(() => {
    if (user?.role === 'ADMIN') {
      return selectedBranchId && Number(selectedBranchId) > 0 ? Number(selectedBranchId) : null;
    }
    return user?.branchId ? Number(user.branchId) : null;
  }, [selectedBranchId, user?.branchId, user?.role]);
  const [configuration, setConfiguration] = useState(() => readCachedConfigurationForBranch(activeBranchId));
  const [loading, setLoading] = useState(false);

  const persistConfiguration = useCallback((value, branchId = activeBranchId) => {
    const normalized = normalizeConfiguration(value);
    setConfiguration(normalized);
    localStorage.setItem(getStorageKey(branchId), JSON.stringify(normalized));
    return normalized;
  }, [activeBranchId]);

  useEffect(() => {
    setConfiguration(readCachedConfigurationForBranch(activeBranchId));
  }, [activeBranchId]);

  const refreshConfiguration = useCallback(async () => {
    if (!isAuthenticated || !hasOnlineSession || !isOnline) {
      return null;
    }

    try {
      setLoading(true);
      const response = await appConfigurationAPI.get(activeBranchId);
      return persistConfiguration(response.data, activeBranchId);
    } finally {
      setLoading(false);
    }
  }, [activeBranchId, hasOnlineSession, isAuthenticated, isOnline, persistConfiguration]);

  useEffect(() => {
    refreshConfiguration().catch(() => {
      setLoading(false);
    });
  }, [refreshConfiguration]);

  const saveConfiguration = useCallback(async (nextConfiguration) => {
    if (user?.role === 'ADMIN' && !activeBranchId) {
      throw new Error('Select a branch before saving app configuration');
    }
    const payload = normalizeConfiguration(nextConfiguration);
    const response = await appConfigurationAPI.update(payload, activeBranchId);
    return persistConfiguration({
      ...payload,
      ...(response.data || {}),
    }, activeBranchId);
  }, [activeBranchId, persistConfiguration, user?.role]);

  const value = useMemo(() => ({
    configuration,
    loading,
    activeBranchId,
    refreshConfiguration,
    saveConfiguration,
  }), [activeBranchId, configuration, loading, refreshConfiguration, saveConfiguration]);

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
