import api from './axios';

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  
  getAll: (params) => api.get('/orders', { params }),
  
  getById: (id) => api.get(`/orders/${id}`),

  downloadInvoicePdf: (invoiceNo) => api.get(`/orders/${invoiceNo}/invoice.pdf`, { responseType: 'blob' }),
  
  cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
};
