import api from "./axios";

export const warrantyTemplatesAPI = {
  list: () => api.get("/warranty-templates"),
  listActive: () => api.get("/warranty-templates/active"),
  create: (data) => api.post("/warranty-templates", data),
  update: (id, data) => api.put(`/warranty-templates/${id}`, data),
  remove: (id) => api.delete(`/warranty-templates/${id}`),
};
