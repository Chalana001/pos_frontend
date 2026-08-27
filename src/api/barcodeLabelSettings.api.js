import api from './axios';

export const barcodeLabelSettingsAPI = {
  getByBranch: (branchId) => api.get(`/branches/${branchId}/barcode-label-settings`),
  updateByBranch: (branchId, payload) => api.put(`/branches/${branchId}/barcode-label-settings`, payload),
  // Static starting-point templates for the scale-barcode format fields. branchId
  // is required in the path (module-covered prefix) but the list is the same for
  // every branch — see ScaleBarcodeFormatPresets on the backend.
  getScalePresets: (branchId) => api.get(`/branches/${branchId}/barcode-label-settings/scale-presets`),
};
