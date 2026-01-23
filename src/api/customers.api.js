import api from './axios';

export const customersAPI = {
  getAll: () => api.get('/customers'),
  
  search: (query) => api.get('/customers/search', { params: { query } }),

  getById: (id) => api.get(`/customers/${id}`),
  
  create: (data) => api.post('/customers', data),
  
  update: (id, data) => api.put(`/customers/${id}`, data),
  
  toggleActive: (id) => api.put(`/customers/${id}/active`),

  // ✅ Notes
  getNotes: (customerId, params = {}) =>
    api.get(`/customers/${customerId}/notes`, { params }),

  createNote: (customerId, data) =>
    api.post(`/customers/${customerId}/notes`, data),

  updateNote: (noteId, data) => api.put(`/customer-notes/${noteId}`, data),

  deleteNote: (noteId) => api.delete(`/customer-notes/${noteId}`),

  // ✅ Orders
  getOrders: (customerId, params = {}) =>
    api.get(`/customers/${customerId}/orders`, { params }),
  
};