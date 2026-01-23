import api from "./axios";

export const itemsAPI = {
  // ✅ old
  getAll: () => api.get("/items"),
  getWithStock: (params = {}) => api.get("/items/with-stock", { params }),
  createWithStocks: (data) => api.post("/items/create-with-stocks", data),

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
  createBulk: (payload) => api.post("/items/bulk", payload),
};
