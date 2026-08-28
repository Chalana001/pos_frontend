import axios from 'axios';
import toast from 'react-hot-toast';
import { getToken, clearAuth, notifyAuthExpired } from '../utils/auth';
import { clearSupportSession, isSupportSession } from '../utils/supportSession';

let isHandlingUnauthorized = false;
const BACKEND_CONNECTION_ERROR_MESSAGE = 'Backend connection failed. Please check whether the server is running.';
const TOAST_DEDUPE_MS = 3000;
const recentErrorToasts = new Map();
const originalToastError = toast.error.bind(toast);
let lastBackendConnectionErrorAt = 0;

toast.error = (message, options = {}) => {
  const normalizedMessage = typeof message === 'string' ? message : String(message || 'Something went wrong!');
  const dedupeKey = options.id || normalizedMessage;
  const now = Date.now();

  if (
    lastBackendConnectionErrorAt &&
    now - lastBackendConnectionErrorAt < TOAST_DEDUPE_MS &&
    normalizedMessage !== BACKEND_CONNECTION_ERROR_MESSAGE
  ) {
    return dedupeKey;
  }

  if (normalizedMessage === BACKEND_CONNECTION_ERROR_MESSAGE || options.id === 'backend-connection-error') {
    lastBackendConnectionErrorAt = now;
  }

  const lastShownAt = recentErrorToasts.get(dedupeKey) || 0;

  if (now - lastShownAt < TOAST_DEDUPE_MS) {
    return dedupeKey;
  }

  recentErrorToasts.set(dedupeKey, now);
  return originalToastError(normalizedMessage, {
    ...options,
    id: options.id || dedupeKey,
  });
};

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

    // A support-session token already names its tenant, and TenantFilter rejects a
    // request whose header disagrees with the token — so on those, let the token decide.
    if (!isSupportSession()) {
      const hostname = window.location.hostname;
      const tenantId = hostname.split('.')[0];

      if (tenantId && tenantId !== 'www' && tenantId !== 'localhost' && tenantId !== '127') {
        config.headers['X-Tenant-ID'] = tenantId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * In-flight de-duplication for write requests.
 *
 * Cashiers double-click buttons out of Windows habit, and a `setLoading(true)`
 * guard does not stop them: React state updates are asynchronous, so both
 * clicks run the handler before the button ever re-renders as disabled. Two
 * identical POSTs go out and two rows are created.
 *
 * While a write request is in flight, an identical one (same method, URL,
 * query params and body) is not sent again — the caller is handed the *same*
 * promise, so the second click resolves with the first click's response and the
 * UI behaves exactly as if the user clicked once.
 *
 * This is in-flight only, with no time window, so it has no false positives: a
 * genuinely repeated action later still goes to the server. Clicks that land
 * after the first response has already arrived are caught by the backend's
 * DuplicateRequestFilter instead.
 */
const inFlightWrites = new Map();

const canFingerprint = (data) =>
  data === undefined ||
  data === null ||
  typeof data === 'string' ||
  typeof data === 'number' ||
  typeof data === 'boolean' ||
  (typeof data === 'object' &&
    !(data instanceof FormData) &&
    !(data instanceof Blob) &&
    !(data instanceof ArrayBuffer) &&
    !(data instanceof URLSearchParams));

const fingerprint = (method, url, data, config) => {
  try {
    return [
      method,
      url,
      JSON.stringify(config?.params ?? null),
      typeof data === 'string' ? data : JSON.stringify(data ?? null),
    ].join('|');
  } catch {
    // Circular or otherwise non-serialisable payload — do not de-duplicate.
    return null;
  }
};

const shareInFlight = (key, send) => {
  if (!key) return send();

  const existing = inFlightWrites.get(key);
  if (existing) return existing;

  const pending = send().finally(() => {
    inFlightWrites.delete(key);
  });

  inFlightWrites.set(key, pending);
  return pending;
};

// (url, data, config)
['post', 'put', 'patch'].forEach((method) => {
  const send = api[method].bind(api);
  api[method] = (url, data, config) =>
    shareInFlight(
      canFingerprint(data) ? fingerprint(method, url, data, config) : null,
      () => send(url, data, config)
    );
});

// (url, config)
const sendDelete = api.delete.bind(api);
api.delete = (url, config) =>
  shareInFlight(fingerprint('delete', url, null, config), () => sendDelete(url, config));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Requests marked background — reachability probes, automatic queue pushes — must
    // never hijack the UI. A probe that meets an expired token would otherwise throw a
    // cashier onto the login screen in the middle of a checkout, and a probe that fails
    // on purpose would toast a connection error every time it ran.
    const isBackgroundRequest = error.config?.meta?.background === true;

    if (!error.response) {
      error.isBackendConnectionError = true;
      error.response = {
        status: 0,
        data: {
          message: BACKEND_CONNECTION_ERROR_MESSAGE,
        },
      };
      if (!isBackgroundRequest) {
        toast.error(BACKEND_CONNECTION_ERROR_MESSAGE, { id: 'backend-connection-error' });
      }
      return Promise.reject(error);
    }

    if (isBackgroundRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const message = error.response.data?.message || error.response.data?.detail || 'Something went wrong!';
    const code = error.response.data?.code;

    // A revoked or read-only support session is not the shop's problem — say so plainly
    // instead of telling the operator their own session expired.
    if (code === 'SUPPORT_SESSION_ENDED') {
      toast.error('This support session has ended. Open a new one from the control panel.');
      clearSupportSession();
      clearAuth();
      notifyAuthExpired();
      return Promise.reject(error);
    }
    if (code === 'SUPPORT_SESSION_READ_ONLY') {
      toast.error('Read-only support session — this change was not saved.');
      return Promise.reject(error);
    }

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
