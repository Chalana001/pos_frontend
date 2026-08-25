import api from './axios';

export const ordersAPI = {
  // idempotencyKey identifies the *checkout attempt*, not the HTTP call. Send
  // the same key for every retry of one checkout and the backend will create
  // one order and replay its response, even if the first reply was lost.
  create: (data, idempotencyKey) =>
    api.post('/orders', data, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined),
  importOfflineSale: (data) => api.post('/orders/offline-import', data),
  importOfflineSalesBulk: (rows) => api.post('/orders/offline-import/bulk', rows),
  
  getAll: (params) => api.get('/orders', { params }),
  
  getById: (id) => api.get(`/orders/${id}`),

  downloadInvoicePdf: (invoiceNo) => api.get(`/orders/${invoiceNo}/invoice.pdf`, { responseType: 'blob' }),
  
  cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
};
