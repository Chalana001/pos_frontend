import api from './axios';

export const stockAPI = {
  getByBranch: (branchId, params) => api.get(`/stock/branch/${branchId}`, { params }),
  getValue: (branchId, params) => api.get(`/stock/branch/${branchId}/value`, { params }),
  getItem: (branchId, itemId) => api.get(`/stock/branch/${branchId}/item/${itemId}`),
  getItemPurchases: (branchId, itemId, params = {}) => api.get(`/stock/branch/${branchId}/item/${itemId}/purchases`, { params }),
  lowStock: (branchId) => api.get('/stock/low', { params: { branchId } }),
  processingSources: (params = {}) => api.get('/stock-processing/sources', { params }),
  processingOutputs: (sourceItemId) => api.get(`/stock-processing/sources/${sourceItemId}/outputs`),
  createProcessing: (payload) => api.post('/stock-processing', payload),
  processingHistory: (params = {}) => api.get('/stock-processing', { params }),
};
