const TOKEN_KEY = 'pos_token';
const USER_KEY = 'pos_user';
const OFFLINE_USER_KEY = 'pos_offline_session_user';
export const AUTH_EXPIRED_EVENT = 'pos:auth-expired';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export const getUser = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));

export const getOfflineSessionUser = () => {
  const user = localStorage.getItem(OFFLINE_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const setOfflineSessionUser = (user) =>
  localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const clearOfflineSession = () => {
  localStorage.removeItem(OFFLINE_USER_KEY);
};

export const isAuthenticated = () => !!getToken();

export const notifyAuthExpired = () => {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
};
