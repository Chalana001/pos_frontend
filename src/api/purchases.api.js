import api from "./axios";

export const purchasesAPI = {
  create: (data) => api.post("/purchases", data),
  list: (params) => api.get("/purchases", { params }),
  getById: (id) => api.get(`/purchases/${id}`),

  cancel: (id, payload) => api.post(`/purchases/${id}/cancel`, payload),

  // Cancel this bill and create the corrected one, server-side, in one transaction.
  //
  // The Idempotency-Key matters more here than anywhere else in this file: the request
  // both voids a bill and creates another, so a retry after a lost reply must replay the
  // first result rather than void a second bill. DuplicateRequestFilter's own window is
  // too short to be relied on for an operation this heavy.
  replace: (id, payload) =>
    api.post(`/purchases/${id}/replace`, payload, {
      headers: { "Idempotency-Key": window.crypto.randomUUID() },
    }),

  previewImport: (formData) =>
    api.post("/purchases/import/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  lookupRow: (payload) => api.post("/purchases/import/lookup", payload),
  downloadImportTemplate: () =>
    api.get("/purchases/import/template", {
      responseType: "blob",
    }),
};