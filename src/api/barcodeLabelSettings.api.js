import api from './axios';

export const barcodeLabelSettingsAPI = {
  getByBranch: (branchId) => api.get(`/branches/${branchId}/barcode-label-settings`),
  updateByBranch: (branchId, payload) => api.put(`/branches/${branchId}/barcode-label-settings`, payload),
};
