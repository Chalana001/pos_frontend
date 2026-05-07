import api from './axios';

export const customersAPI = {
  getAll: (params = {}) => api.get('/customers/page', { params }),
  getList: (params = {}) => api.get('/customers', { params }),
  
  search: (name) => api.get('/customers/search', { params: { name } }),

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

  recordPayment: (id, data) => api.post(`/customers/${id}/payments`, data),
};
