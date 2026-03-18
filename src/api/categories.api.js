import api from "./axios";

export const categoriesAPI = {

  getAll: () => api.get("/categories"),

  create: (data) => api.post("/categories", data),

  getSubCategories: (categoryId) => api.get(`/categories/${categoryId}/sub-categories`),

  createSubCategory: (data) => api.post("/categories/sub-categories", data),

};