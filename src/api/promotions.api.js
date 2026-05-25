import api from "./axios";

export const promotionsAPI = {
  list: () => api.get("/promotions"),
  create: (payload) => api.post("/promotions", payload),
  update: (id, payload) => api.put(`/promotions/${id}`, payload),
  updateStatus: (id, active) => api.patch(`/promotions/${id}/status`, { active }),
  remove: (id) => api.delete(`/promotions/${id}`),
  preview: (payload) => api.post("/promotions/preview", payload),
};
