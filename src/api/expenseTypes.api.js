import api from "./axios";

export const expenseTypesAPI = {
  list: () => api.get("/expense-types"),
  listActive: () => api.get("/expense-types/active"),
  create: (data) => api.post("/expense-types", data),
  update: (id, data) => api.put(`/expense-types/${id}`, data),
  remove: (id) => api.delete(`/expense-types/${id}`),
};
