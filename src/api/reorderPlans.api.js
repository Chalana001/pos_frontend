import api from './axios';
export const reorderPlansAPI = {
  list: () => api.get('/reorder-plans'), create: (data) => api.post('/reorder-plans', data),
  get: (id) => api.get(`/reorder-plans/${id}`), updateLine: (id, lineId, data) => api.patch(`/reorder-plans/${id}/lines/${lineId}`, data),
  submit: (id) => api.post(`/reorder-plans/${id}/submit`), approve: (id) => api.post(`/reorder-plans/${id}/approve`),
  reject: (id, reason) => api.post(`/reorder-plans/${id}/reject`, null, { params: { reason } }),
  purchaseDrafts: (id) => api.get(`/reorder-plans/${id}/purchase-drafts`), markConverted: (id, reference) => api.post(`/reorder-plans/${id}/mark-handoff-complete`, { reference }),
};
