// src/api/purchaseReturns.api.js
import api from "./axios";

export const purchaseReturnsAPI = {
  /** POST /purchases/{purchaseId}/returns */
  processReturn: async (purchaseId, data) =>
    api.post(`/purchases/${purchaseId}/returns`, data),

  /** GET /purchases/{purchaseId}/returns */
  listByPurchase: async (purchaseId) =>
    api.get(`/purchases/${purchaseId}/returns`),

  /** GET /purchase-returns/{debitNoteNo} */
  getByDebitNoteNo: async (debitNoteNo) =>
    api.get(`/purchase-returns/${debitNoteNo}`),
};
