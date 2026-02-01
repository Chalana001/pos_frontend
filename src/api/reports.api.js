import api from './axios';

export const reportsAPI = {
  // 1. Sales Summary
  salesSummary: (params) => api.get('/reports/sales-summary', { params }),
  
  // 2. Top Selling Items
  topSelling: (params) => api.get('/reports/top-selling', { params }),
  
  // 3. Low Stock Alerts
  lowStock: (branchId) => api.get('/reports/low-stock', { params: { branchId } }),
  
  // 4. Credit Due List
  creditDue: () => api.get('/reports/credit-due'),
  
  // 5. Profit Report
  profit: (params) => api.get('/reports/profit', { params }),

  // 6. Sales Trend (Line Chart)
  salesTrend: (params) => api.get("/reports/sales-trend", { params }),

  // 7. 🔥 NEW: Top Customers
  topCustomers: (params) => api.get("/reports/top-customers", { params }),

  // 8. 🔥 NEW: Top Suppliers
  topSuppliers: (params) => api.get("/reports/top-suppliers", { params }),
  
  // (Optional: If you have this endpoint)
  hourlySales: (params) => api.get("/reports/hourly-sales", { params }),
};