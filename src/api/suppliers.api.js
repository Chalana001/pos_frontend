import api from "./axios";

export const suppliersAPI = {
  list: (params) => api.get("/suppliers", { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post("/suppliers", data),
  quickCreate: (data) => api.post("/suppliers/quick", data),
  recordPayment: (id, data) => api.post(`/suppliers/${id}/payments`, data),
  paymentHistory: (id) => api.get(`/suppliers/${id}/payments`),
};
