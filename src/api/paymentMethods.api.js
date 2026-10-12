import api from "./axios";

export const paymentMethodsAPI = {
  listActive: () => api.get("/payment-methods/active"),
  list: () => api.get("/payment-methods"),
  get: (id) => api.get(`/payment-methods/${id}`),
  create: (data) => api.post("/payment-methods", data),
  update: (id, data) => api.put(`/payment-methods/${id}`, data),
  setActive: (id, active) => api.patch(`/payment-methods/${id}/active`, { active }),
};
