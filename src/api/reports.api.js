import api from './axios';

export const reportsAPI = {
  salesSummary: (params) => api.get('/reports/sales-summary', { params }),
  topSelling: (params) => api.get('/reports/top-selling', { params }),
  
  // 🚀 මෙතන branchId වෙනුවට අනිත් ඒවා වගේම params කියලා වෙනස් කළා
  lowStock: (params) => api.get('/reports/low-stock', { params }),
  
  creditDue: () => api.get('/reports/credit-due'),
  profit: (params) => api.get('/reports/profit', { params }),
  profitSummary: (params) => api.get('/reports/profit-summary', { params }),
  salesTrend: (params) => api.get("/reports/sales-trend", { params }),
  topCustomers: (params) => api.get("/reports/top-customers", { params }),
  topSuppliers: (params) => api.get("/reports/top-suppliers", { params }),
};