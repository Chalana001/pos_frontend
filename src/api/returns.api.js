// src/api/returns.api.js
import api from "./axios";

export const returnsAPI = {
  /** POST /orders/{invoiceNo}/returns — process a partial return */
  processReturn: async (invoiceNo, data) =>
    api.post(`/orders/${invoiceNo}/returns`, data),

  /** GET /orders/{invoiceNo}/returns — list all returns for an invoice */
  listByInvoice: async (invoiceNo) =>
    api.get(`/orders/${invoiceNo}/returns`),

  /** GET /returns/{returnNo} — fetch a single return (reprint) */
  getByReturnNo: async (returnNo) =>
    api.get(`/returns/${returnNo}`),
};
