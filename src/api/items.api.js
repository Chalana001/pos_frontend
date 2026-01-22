import api from "./axios";

export const itemsAPI = {
  // ✅ old
  getAll: () => api.get("/items"),

  // ✅ NEW: items with stock (branch optional)
  // Admin:
  //   - All branches => itemsAPI.getWithStock()
  //   - Branch selected => itemsAPI.getWithStock({ branchId })
  // Cashier:
  //   - always itemsAPI.getWithStock()
  // (backend will force cashier branch)
  getWithStock: (params = {}) => api.get("/items/with-stock", { params }),

  // ✅ get by barcode (with branch)
  getByBarcode: (barcode, branchId) =>
    api.get(`/items/barcode/${barcode}`, {
      params: branchId ? { branchId } : {},
    }),

  // ✅ search by name (with branch)
  search: (name, branchId) =>
    api.get("/items/search", {
      params: branchId ? { name, branchId } : { name },
    }),

  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post("/items", data),
  update: (id, data) => api.put(`/items/${id}`, data),
};
