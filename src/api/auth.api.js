import api from './axios';

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  
  getCurrentUser: () => api.get('/auth/me'),

  getOfflinePinStatus: () => api.get('/auth/offline-pin/status'),

  saveOfflinePin: (payload) => api.put('/auth/offline-pin', payload),
};
