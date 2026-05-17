import api from "./axios";

export const warrantiesAPI = {
  list: (params) => api.get("/warranties", { params }),
  listClaimQueue: (params) => api.get("/warranties/claims", { params }),
  getById: (id) => api.get(`/warranties/${id}`),
  listClaims: (id) => api.get(`/warranties/${id}/claims`),
  createClaim: (id, payload) => api.post(`/warranties/${id}/claims`, payload),
  updateClaim: (id, claimId, payload) => api.put(`/warranties/${id}/claims/${claimId}`, payload),
};
