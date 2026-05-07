import api from './axios';

export const cashDropsAPI = {
  getAll: (params) => api.get('/cash-drops', { params }),
  getSummary: (params) => api.get('/cash-drops/summary', { params }),
  create: (data) => api.post('/shifts/cashdrop', data),
  createById: (shiftId, data) => api.post(`/shifts/${shiftId}/cashdrop`, data),
};
