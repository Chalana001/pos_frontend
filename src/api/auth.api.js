import api from './axios';

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  
  getCurrentUser: () => api.get('/auth/me'),
};