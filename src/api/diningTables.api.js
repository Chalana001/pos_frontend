import api from './axios';

export const diningTablesAPI = {
  listByBranch: (branchId) => api.get('/dining-tables', { params: { branchId } }),
  getById: (id) => api.get(`/dining-tables/${id}`),
  create: (payload) => api.post('/dining-tables', payload),
  update: (id, payload) => api.put(`/dining-tables/${id}`, payload),
  remove: (id) => api.delete(`/dining-tables/${id}`),
};
