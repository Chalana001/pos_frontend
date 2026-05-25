import api from "./axios";

export const categoriesAPI = {

  getAll: () => api.get("/categories"),

  create: (data) => api.post("/categories", data),

  getSingleParent: () => api.get("/categories/single-parent"),

  getSingleCategories: () => api.get("/categories/single-categories"),

  createSingleCategory: (data) => api.post("/categories/single-categories", data),

  getSubCategories: (categoryId) => api.get(`/categories/${categoryId}/sub-categories`),

  createSubCategory: (data) => api.post("/categories/sub-categories", data),

};
