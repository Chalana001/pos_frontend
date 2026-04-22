import api from './axios';

export const receiptSettingsAPI = {
  getByBranch: (branchId, templateType = 'THERMAL') =>
    api.get(`/branches/${branchId}/receipt-settings`, { params: { templateType } }),

  updateByBranch: (branchId, payload, templateType = 'THERMAL') =>
    api.put(`/branches/${branchId}/receipt-settings`, payload, { params: { templateType } }),
};
