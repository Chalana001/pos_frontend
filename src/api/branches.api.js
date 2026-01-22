import api from './axios';

export const branchesAPI = {

  // getAll: () => api.get("/branches"),

  getAll: (activeOnly) =>
    api.get("/branches", { params: activeOnly !== undefined ? { activeOnly } : {} }),

  getById: (id) => api.get(`/branches/${id}`),

  create: (payload) => api.post("/branches", payload),

  update: (id, payload) => api.put(`/branches/${id}`, payload),

  deactivate: (id) => api.delete(`/branches/${id}`),
};
