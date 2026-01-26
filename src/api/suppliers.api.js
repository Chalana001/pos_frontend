import api from "./axios";

export const suppliersAPI = {
  list: (params) => api.get("/suppliers", { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post("/suppliers", data),
  quickCreate: (data) => api.post("/suppliers/quick", data),
};