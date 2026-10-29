import api from "./axios";

export const categoriesAPI = {

  getAll: () => api.get("/categories"),

  create: (data) => api.post("/categories", data),

  getSingleParent: () => api.get("/categories/single-parent"),

  getSingleCategories: () => api.get("/categories/single-categories"),

  createSingleCategory: (data) => api.post("/categories/single-categories", data),

  getSubCategories: (categoryId) => api.get(`/categories/${categoryId}/sub-categories`),

  createSubCategory: (data) => api.post("/categories/sub-categories", data),

  // Category management screen: the tree with per-row item counts, then rename and delete.
  usage: () => api.get("/categories/usage"),

  update: (categoryId, data) => api.put(`/categories/${categoryId}`, data),

  remove: (categoryId) => api.delete(`/categories/${categoryId}`),

  updateSubCategory: (subCategoryId, data) => api.put(`/categories/sub-categories/${subCategoryId}`, data),

  removeSubCategory: (subCategoryId) => api.delete(`/categories/sub-categories/${subCategoryId}`),

};