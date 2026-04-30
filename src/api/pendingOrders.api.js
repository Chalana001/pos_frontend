import api from './axios';

export const pendingOrdersAPI = {
  listByBranch: (branchId) => api.get('/pending-orders', { params: { branchId } }),
  getByTable: (tableId) => api.get(`/pending-orders/table/${tableId}`),
  saveForTable: (tableId, payload) => api.put(`/pending-orders/table/${tableId}`, payload),
  clearTable: (tableId) => api.delete(`/pending-orders/table/${tableId}`),
};
