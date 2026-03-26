import axios from 'axios';
import toast from 'react-hot-toast'; 
import { getToken, clearAuth } from '../utils/auth';

const currentHost = window.location.hostname; 

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${currentHost}:8080`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error("Network Error! Please check your connection or server.");
      return Promise.reject(error);
    }

    const status = error.response.status;
    const message = error.response.data?.message || error.response.data?.detail || "Something went wrong!";

    if (status === 401) {
      // Token Expire වෙලා නම්
      toast.error("Session expired. Please log in again.");
      clearAuth();
      window.location.href = '/login';
    } 
    else if (status === 402) {
      console.warn("Subscription Expired! Redirecting to plans...");
      toast.error("Subscription Expired! Please renew your plan.");
      if (window.location.pathname !== '/pricing') {
        window.location.href = '/pricing'; 
      }
    }
    else if (status === 403) {
      // Permission නැත්නම්
      toast.error("Access Denied! You don't have permission to perform this action.");
    }
    else if (status === 500) {
      // Backend එකේ කෝඩ් එක කැඩුනොත්
      toast.error("Server Error: " + message);
    }
    else if (status !== 400 && status !== 404) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;