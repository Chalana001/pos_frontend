import api from "./axios";

export const purchasesAPI = {
  create: (data) => api.post("/purchases", data), 
  list: (params) => api.get("/purchases", { params }),
  getById: (id) => api.get(`/purchases/${id}`),

  cancel: (id, payload) => api.post(`/purchases/${id}/cancel`, payload),
};