import api from './axios';

export const dashboardAPI = {
  getKPIs: (branchId) => api.get('/dashboard/kpis', { params: { branchId } }),
  
  getDailyChart: (params) => api.get('/dashboard/charts/daily', { params }),
  
  getMonthlyChart: (params) => api.get('/dashboard/charts/monthly', { params }),
};