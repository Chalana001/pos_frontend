import api from './axios';

export const customersAPI = {
  getAll: () => api.get('/customers'),
  
  search: (query) => api.get('/customers/search', { params: { query } }),
  
  create: (data) => api.post('/customers', data),
  
  update: (id, data) => api.put(`/customers/${id}`, data),
  
  toggleActive: (id) => api.put(`/customers/${id}/active`),
};