import api from './axios';

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  
  getAll: (params) => api.get('/orders', { params }),
  
  getById: (id) => api.get(`/orders/${id}`),
  
  cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
};