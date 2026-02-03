import api from "./axios";

export const shiftsAPI = {
  // =========================
  // ✅ CASHIER
  // =========================
  openMine: (data) => api.post("/shifts/open", data),
  getMine: () => api.get("/shifts/me"),
  closeMine: (data) => api.post("/shifts/close", data),

  addCashDropMine: (data) => api.post("/shifts/cashdrop", data),

  // =========================
  // ✅ ADMIN / MANAGER
  // =========================
  getActiveByBranch: (branchId) =>
    api.get("/shifts/active", { params: { branchId } }),

  // ✅ new endpoints (need backend)
  openByBranch: (branchId, data) =>
    api.post("/shifts/branch/open", data, { params: { branchId } }),

  closeById: (shiftId, data) =>
    api.post(`/shifts/${shiftId}/close`, data),

  cashdropById: (shiftId, data) =>
    api.post(`/shifts/${shiftId}/cashdrop`, data),

  forceCloseByBranch: (branchId, data) =>
    api.post("/shifts/force-close", data, { params: { branchId } }),

  getAll: (filters) => {
    const params = new URLSearchParams();

    if (filters.branchId) params.append("branchId", filters.branchId);
    if (filters.cashierId) params.append("cashierId", filters.cashierId);
    if (filters.status) params.append("status", filters.status);

    if (filters.startDate) {
      params.append("startDate", `${filters.startDate}T00:00:00`);
    }
    if (filters.endDate) {
      params.append("endDate", `${filters.endDate}T23:59:59`);
    }
    return api.get("/shifts/all", { params }); 
  },
};
