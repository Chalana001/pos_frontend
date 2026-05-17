import api from './axios';

export const appConfigurationAPI = {
  get: () => api.get('/app-configuration'),
  update: (payload) => api.put('/app-configuration', payload),
};
