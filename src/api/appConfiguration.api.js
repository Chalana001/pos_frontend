import api from './axios';

export const appConfigurationAPI = {
  get: (branchId) =>
    api.get('/app-configuration', {
      params: branchId ? { branchId } : {},
    }),
  update: (payload, branchId) =>
    api.put('/app-configuration', payload, {
      params: branchId ? { branchId } : {},
    }),
  // Static starting-point templates for the scale barcode fields. Same list
  // for every branch; see ScaleBarcodeFormatPresets on the backend.
  getScalePresets: () => api.get('/app-configuration/scale-barcode-presets'),
};
