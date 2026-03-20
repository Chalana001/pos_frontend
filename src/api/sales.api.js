// src/api/sales.api.js
import api from "./axios";

export const salesAPI = {
  // Sales list (orders list)
  list: async (params) => {
    return await api.get("/orders", { params });
  },

  // Get single sale/order details
  getById: async (id) => {
    return await api.get(`/orders/${id}`);
  },

  // Create new order (POS)
  create: async (data) => {
    return await api.post("/orders", data);
  },

  // Cancel order 
  cancel: async (invoiceNo, data) => {
    return await api.post(`/orders/${invoiceNo}/cancel`, data);
  }
};