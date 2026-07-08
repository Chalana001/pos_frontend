import api from "./axios";

export const purchasesAPI = {
  create: (data) => api.post("/purchases", data),
  list: (params) => api.get("/purchases", { params }),
  getById: (id) => api.get(`/purchases/${id}`),

  cancel: (id, payload) => api.post(`/purchases/${id}/cancel`, payload),

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