import api from './axios';

export const cashDropsAPI = {
  create: (data) => api.post('/cash-drops', data),
  
  getAll: (params) => api.get('/cash-drops', { params }),
};