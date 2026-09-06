import api from "./axios";

/**
 * Loyalty points. The account endpoint is available to cashiers because the till needs the
 * balance to offer a redemption; everything that changes the scheme is admin-only.
 */
export const loyaltyAPI = {
  account: (customerId) => api.get(`/loyalty/customers/${customerId}`),
  history: (customerId) => api.get(`/loyalty/customers/${customerId}/history`),
  adjust: (customerId, payload) => api.post(`/loyalty/customers/${customerId}/adjust`, payload),

  settings: () => api.get("/loyalty/settings"),
  updateSettings: (payload) => api.put("/loyalty/settings", payload),

  tiers: () => api.get("/loyalty/tiers"),
  createTier: (payload) => api.post("/loyalty/tiers", payload),
  updateTier: (id, payload) => api.put(`/loyalty/tiers/${id}`, payload),
  deleteTier: (id) => api.delete(`/loyalty/tiers/${id}`),
};
