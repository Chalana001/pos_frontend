import api from './axios';

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Marked background: a till with no connection must still be able to sign out locally,
  // and a failed revoke there is not something to toast a cashier about.
  logout: () => api.post('/auth/logout', null, { meta: { background: true } }),

  getCurrentUser: () => api.get('/auth/me'),

  getOfflinePinStatus: () => api.get('/auth/offline-pin/status'),

  saveOfflinePin: (payload) => api.put('/auth/offline-pin', payload),
};
