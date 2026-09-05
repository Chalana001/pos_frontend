import api from "./axios";

export const promotionsAPI = {
  list: () => api.get("/promotions"),
  create: (payload) => api.post("/promotions", payload),
  update: (id, payload) => api.put(`/promotions/${id}`, payload),
  updateStatus: (id, active) => api.patch(`/promotions/${id}/status`, { active }),
  remove: (id) => api.delete(`/promotions/${id}`),
  preview: (payload) => api.post("/promotions/preview", payload),

  // Margins and warnings for a price list that has not been saved yet. Same rules the
  // save path enforces, so the badges cannot disagree with the eventual refusal.
  priceCheck: (payload) => api.post("/promotions/price-check", payload),
  duplicate: (id) => api.post(`/promotions/${id}/duplicate`),

  history: (params = {}) => api.get("/promotions/history", { params }),
  redemptions: (params = {}) => api.get("/promotions/redemptions", { params }),

  // Promo codes. checkCode answers "would this work?" without consuming anything; the
  // code is only consumed inside the sale's own transaction.
  checkCode: (payload) => api.post("/promotions/check-code", payload),
  listCodes: (promotionId) => api.get(`/promotions/${promotionId}/codes`),
  generateCodes: (promotionId, payload) => api.post(`/promotions/${promotionId}/codes`, payload),
  setCodeActive: (promotionId, codeId, active) =>
    api.patch(`/promotions/${promotionId}/codes/${codeId}/status`, { active }),
};
