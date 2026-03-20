import api from './axios';

export const stockAPI = {
  getByBranch: (branchId, params) => api.get(`/stock/branch/${branchId}`, { params }),
  getItem: (branchId, itemId) => api.get('/stock/item', { params: { branchId, itemId } }),
};