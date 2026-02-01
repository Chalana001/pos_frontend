import api from './axios';

export const reportsAPI = {
  salesSummary: (params) => api.get('/reports/sales-summary', { params }),
  topSelling: (params) => api.get('/reports/top-selling', { params }),
  lowStock: (branchId) => api.get('/reports/low-stock', { params: { branchId } }),
  creditDue: () => api.get('/reports/credit-due'),
  profit: (params) => api.get('/reports/profit', { params }),
  
  // 🔥 මෙන්න මේක අනිවාර්යයෙන්ම එකතු කරන්න:
  profitSummary: (params) => api.get('/reports/profit-summary', { params }),

  salesTrend: (params) => api.get("/reports/sales-trend", { params }),
  topCustomers: (params) => api.get("/reports/top-customers", { params }),
  topSuppliers: (params) => api.get("/reports/top-suppliers", { params }),
};