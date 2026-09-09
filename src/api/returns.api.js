// src/api/returns.api.js
import api from "./axios";

export const returnsAPI = {
  /**
   * POST /orders/{invoiceNo}/returns — process a partial return.
   *
   * The key tells DuplicateRequestFilter which requests are the *same* return. Without it the
   * filter falls back to the request bytes, and two genuine returns of the same sale seconds
   * apart - same lines, same reason - look like one double-click: the second is answered with
   * the first's receipt and nothing happens. Same pattern as ordersAPI.create.
   */
  processReturn: async (invoiceNo, data, idempotencyKey) =>
    api.post(`/orders/${invoiceNo}/returns`, data,
      idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : undefined),

  /** GET /orders/{invoiceNo}/returns — list all returns for an invoice */
  listByInvoice: async (invoiceNo) =>
    api.get(`/orders/${invoiceNo}/returns`),

  /** GET /returns/{returnNo} — fetch a single return (reprint) */
  getByReturnNo: async (returnNo) =>
    api.get(`/returns/${returnNo}`),
};
