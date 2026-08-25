import api from "./axios";

export const bankAccountsAPI = {
  list: () => api.get("/bank-accounts"),
  listActive: () => api.get("/bank-accounts/active"),
  getById: (id) => api.get(`/bank-accounts/${id}`),
  create: (data) => api.post("/bank-accounts", data),
  update: (id, data) => api.put(`/bank-accounts/${id}`, data),
  remove: (id) => api.delete(`/bank-accounts/${id}`),
};
