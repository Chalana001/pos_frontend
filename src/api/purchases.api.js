import api from "./axios";

export const purchasesAPI = {
  create: (data) => api.post("/grn", data), 
  list: (params) => api.get("/grn", { params }),
  getById: (id) => api.get(`/grn/${id}`),
};