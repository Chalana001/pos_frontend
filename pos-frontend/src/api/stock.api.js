import api from './axios';

export const stockAPI = {
  getByBranch: (branchId) => api.get(`/stock/branch/${branchId}`),
  
  getItem: (branchId, itemId) => api.get('/stock/item', { params: { branchId, itemId } }),
};