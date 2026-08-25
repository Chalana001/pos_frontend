import api from './axios';

export const cashDropsAPI = {
  getAll: (params) => api.get('/cash-drops', { params }),
  getSummary: (params) => api.get('/cash-drops/summary', { params }),
  create: (data) => api.post('/shifts/cashdrop', data),
  createById: (shiftId, data) => api.post(`/shifts/${shiftId}/cashdrop`, data),

  // Recorded outside any shift — e.g. banking already-collected cash after
  // every shift for the day is closed. Admin/Manager only.
  createOutsideShift: (data) => api.post('/cash-drops/outside', data),
};
