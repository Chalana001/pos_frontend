import api from './axios';

export const appConfigurationAPI = {
  get: (branchId) =>
    api.get('/app-configuration', {
      params: branchId ? { branchId } : {},
    }),
  update: (payload, branchId) =>
    api.put('/app-configuration', payload, {
      params: branchId ? { branchId } : {},
    }),
};
