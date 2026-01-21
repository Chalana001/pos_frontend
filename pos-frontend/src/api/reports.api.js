import api from './axios';

export const reportsAPI = {
  salesSummary: (params) => api.get('/reports/sales-summary', { params }),
  
  topSelling: (params) => api.get('/reports/top-selling', { params }),
  
  lowStock: (branchId) => api.get('/reports/low-stock', { params: { branchId } }),
  
  creditDue: () => api.get('/reports/credit-due'),
  
  profit: (params) => api.get('/reports/profit', { params }),
};