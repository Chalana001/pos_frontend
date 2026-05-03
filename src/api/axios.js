import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken, clearAuth, notifyAuthExpired } from '../utils/auth';

let isHandlingUnauthorized = false;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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

    const hostname = window.location.hostname;
    const tenantId = hostname.split('.')[0];

    if (tenantId && tenantId !== 'www' && tenantId !== 'localhost' && tenantId !== '127') {
      config.headers['X-Tenant-ID'] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Network Error! Please check your connection or server.');
      return Promise.reject(error);
    }

    const status = error.response.status;
    const message = error.response.data?.message || error.response.data?.detail || 'Something went wrong!';

    if (status === 401) {
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true;
        toast.error('Session expired. Please log in again.');
        clearAuth();
        notifyAuthExpired();
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
        window.setTimeout(() => {
          isHandlingUnauthorized = false;
        }, 500);
      }
    } else if (status === 403 && !getToken()) {
      if (!isHandlingUnauthorized) {
        isHandlingUnauthorized = true;
        clearAuth();
        notifyAuthExpired();
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
        window.setTimeout(() => {
          isHandlingUnauthorized = false;
        }, 500);
      }
    } else if (status === 402) {
      console.warn('Subscription Expired! Redirecting to plans...');
      toast.error('Subscription Expired! Please renew your plan.');
      if (window.location.pathname !== '/pricing') {
        window.location.href = '/pricing';
      }
    } else if (status === 403) {
      toast.error("Access Denied! You don't have permission to perform this action.");
    } else if (status === 500) {
      toast.error(`Server Error: ${message}`);
    } else if (status !== 400 && status !== 404) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
