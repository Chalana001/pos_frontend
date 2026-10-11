import api from "./axios";

export const promotionsAPI = {
  bundle: (branchId) => api.get("/promotions/bundle", {
    params: (branchId !== undefined && branchId !== null) ? { branchId } : {},
  }),
  // The campaign board, one page at a time. Search and branch filtering belong in the
  // request so the page is the server's page, not a slice of the whole shop afterwards.
  list: (params = {}) => api.get("/promotions", { params }),
  // The board's summary read. Bounded on purpose: the KPI strip needs more than one page of
  // context but must not reintroduce the unbounded whole-list response.
  summary: () => api.get("/promotions", { params: { page: 0, size: 100 } }),
  // One campaign with its item targets resolved; the edit screen's single read.
  get: (id) => api.get(`/promotions/${id}`),
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

  // Lifecycle. Draft -> (pending approval) -> active <-> paused. Approve needs an admin who is
  // not the submitter; the backend enforces that, the UI only hides what cannot succeed.
  settings: () => api.get("/promotions/settings"),
  updateSettings: (payload) => api.put("/promotions/settings", payload),
  submit: (id) => api.post(`/promotions/${id}/submit`),
  approve: (id, note) => api.post(`/promotions/${id}/approve`, { note: note || null }),
  reject: (id, note) => api.post(`/promotions/${id}/reject`, { note: note || null }),
  pause: (id, note) => api.post(`/promotions/${id}/pause`, { note: note || null }),
  resume: (id) => api.post(`/promotions/${id}/resume`),
  audit: (id) => api.get(`/promotions/${id}/audit`),

  // Rule-based customer segments, what a promotion means by "our best customers".
  segments: () => api.get("/customer-segments"),
  createSegment: (payload) => api.post("/customer-segments", payload),
  updateSegment: (id, payload) => api.put(`/customer-segments/${id}`, payload),
  deleteSegment: (id) => api.delete(`/customer-segments/${id}`),
  recomputeSegment: (id) => api.post(`/customer-segments/${id}/recompute`),
  recomputeSegments: () => api.post("/customer-segments/recompute"),

  // What an unsaved promotion would have cost over recent real sales, and what it collides with.
  simulate: (payload) => api.post("/promotions/simulate", payload),
  check: (payload, excludeId) =>
    api.post("/promotions/check", payload, { params: excludeId ? { excludeId } : {} }),
};
