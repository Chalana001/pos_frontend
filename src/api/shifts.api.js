import api from "./axios";

export const shiftsAPI = {
  // =========================
  // ✅ CASHIER (Common Actions)
  // =========================
  openMine: (data) => api.post("/shifts/open", data),
  getMine: () => api.get("/shifts/me"),
  closeMine: (data) => api.post("/shifts/close", data),
  addCashDropMine: (data) => api.post("/shifts/cashdrop", data),

  // =========================
  // ✅ ADMIN / MANAGER
  // =========================
  
  // 🔴 1. අලුතින්ම එකතු කරපු එක: POS එකේදී Admin ගේ Shift එක ගන්න
  getAdminCurrent: (branchId) => 
    api.get("/shifts/admin-current", { params: { branchId } }),

  // 2. Branch එකක තියෙන ඔක්කොම Active Shifts බලන්න (Dashboard එකට)
  getActiveByBranch: (branchId) =>
    api.get("/shifts/active", { params: { branchId } }),

  // 3. Admin විසින් වෙනත් කෙනෙකුට Shift එකක් Open කර දීම
  openByBranch: (branchId, data) =>
    api.post("/shifts/branch/open", data, { params: { branchId } }),

  // 4. Shift ID එකෙන් Close කිරීම
  closeById: (shiftId, data) =>
    api.post(`/shifts/${shiftId}/close`, data),

  // 5. Shift ID එකෙන් Cash Drop එකක් දැමීම
  cashdropById: (shiftId, data) =>
    api.post(`/shifts/${shiftId}/cashdrop`, data),

  // 6. බලහත්කාරයෙන් Shift එකක් වසා දැමීම
  forceCloseByBranch: (branchId, data) =>
    api.post("/shifts/force-close", data, { params: { branchId } }),

  // 7. Filters පාවිච්චි කරලා ඔක්කොම Shifts (History) බැලීම
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