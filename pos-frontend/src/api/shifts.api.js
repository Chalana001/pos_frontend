import api from "./axios";

export const shiftsAPI = {
  // =========================
  // ✅ CASHIER
  // =========================
  openMine: (data) => api.post("/shifts/open", data),
  getMine: () => api.get("/shifts/me"),
  closeMine: (data) => api.post("/shifts/close", data),

  addExpenseMine: (data) => api.post("/shifts/expense", data),
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

  expenseById: (shiftId, data) =>
    api.post(`/shifts/${shiftId}/expense`, data),

  cashdropById: (shiftId, data) =>
    api.post(`/shifts/${shiftId}/cashdrop`, data),

  forceCloseByBranch: (branchId, data) =>
    api.post("/shifts/force-close", data, { params: { branchId } }),
};
