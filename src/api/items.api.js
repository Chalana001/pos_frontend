import api from "./axios";

export const itemsAPI = {

  getWithStock: (params = {}) => api.get("/items/with-stock", { params }),
  getAll: (params = {}) => api.get("/items", { params }),

  createWithStocks: (data) => api.post("/items/create-with-stocks", data),

  getByBarcode: (barcode, branchId) =>
    api.get(`/items/barcode/${barcode}`, {
      params: branchId ? { branchId } : {},
    }),

  search: (name, branchId) =>
    api.get("/items/search", {
      params: branchId ? { name, branchId } : { name },
    }),
  
  searchForPrint: (query) => api.get("/items/search-print", { params: { query } }),

  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post("/items", data),
  update: (id, data) => api.put(`/items/${id}`, data),
  createBulk: (payload) => api.post("/items/bulk", payload),

  getRecent: (limit = 50) => api.get("/items/recent", { params: { limit } }),
};
