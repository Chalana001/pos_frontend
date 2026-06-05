import api from "./axios";

export const itemsAPI = {
  getWithStock: (params = {}) => api.get("/items/with-stock", { params }),
  getAll: (params = {}) => api.get("/items", { params }),

  createWithStocks: (data) => api.post("/items/create-with-stocks", data),

  getByBarcode: (barcode, branchId) =>
    api.get(`/items/barcode/${barcode}`, {
      params: (branchId !== undefined && branchId !== null) ? { branchId } : {},
    }),

  search: (name, branchId) =>
    api.get("/items/search", {
      params: (branchId !== undefined && branchId !== null) ? { name, branchId } : { name },
    }),

  searchForPurchase: (name, branchId) =>
    api.get("/items/searchForPurchase", {
      params: (branchId !== undefined && branchId !== null) ? { name, branchId } : { name },
    }),

  searchForPos: (name, branchId) =>
    api.get("/items/searchForPos", {
      params: (branchId !== undefined && branchId !== null) ? { name, branchId } : { name },
    }),

  searchForPrint: (query) => api.get("/items/search-print", { params: { query } }),

  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post("/items", data),
  update: (id, data) => api.put(`/items/${id}`, data),
  deleteCheck: (id) => api.get(`/items/${id}/delete-check`),
  delete: (id) => api.delete(`/items/${id}`),
  deactivate: (id) => api.post(`/items/${id}/deactivate`),
  createBulk: (payload) => api.post("/items/bulk", payload),
  previewImport: (formData) =>
    api.post("/items/import/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  commitImport: (payload) => api.post("/items/import/commit", payload),
  previewRecipeIngredientsImport: (formData) =>
    api.post("/items/import/recipe-ingredients/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  commitRecipeIngredientsImport: (payload) => api.post("/items/import/recipe-ingredients/commit", payload),
  importRecipeIngredientsFromFile: (formData) =>
    api.post("/items/import/recipe-ingredients", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  importFromFile: (formData) =>
    api.post("/items/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  downloadImportTemplate: () =>
    api.get("/items/import/template", {
      responseType: "blob",
    }),
  downloadRecipeIngredientsTemplate: () =>
    api.get("/items/import/recipe-ingredients/template", {
      responseType: "blob",
    }),

  getRecent: (limit = 50) => api.get("/items/recent", { params: { limit } }),
};
