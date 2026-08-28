// Support-session handoff.
//
// A super admin can open this shop from the control panel without the owner's password.
// The panel passes the token in the URL *fragment* (`#support-token=…`), not the query
// string: fragments are never sent to the server, so the token does not land in access
// logs, proxy logs or the Referer header the way `?token=` would.
//
// The token is consumed once and the fragment is scrubbed from the address bar immediately,
// so a screenshot or a shared URL does not carry a live session with it.

const SUPPORT_KEY = 'pos_support_session';

const readFragment = () => {
  const raw = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const token = params.get('support-token');
  if (!token) return null;
  return { token, tenantId: params.get('tenant') || null };
};

const scrubFragment = () => {
  try {
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState({}, document.title, url.toString());
  } catch {
    // A browser that refuses replaceState is not worth failing the sign-in over.
  }
};

/**
 * Pulls a support token out of the URL if one is there, stores it, and cleans the address bar.
 * Returns the session so the caller can sign in with it, or null for a normal visit.
 */
export const consumeSupportSessionFromUrl = () => {
  const found = readFragment();
  if (!found) return null;
  scrubFragment();

  const session = {
    token: found.token,
    tenantId: found.tenantId,
    startedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(SUPPORT_KEY, JSON.stringify(session));
  } catch {
    // Private mode with storage blocked — the in-memory return value still works
    // for this tab, it just will not survive a reload.
  }
  return session;
};

/** sessionStorage, not localStorage: a support session must die with the tab. */
export const getSupportSession = () => {
  try {
    const raw = sessionStorage.getItem(SUPPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isSupportSession = () => Boolean(getSupportSession());

export const clearSupportSession = () => {
  try {
    sessionStorage.removeItem(SUPPORT_KEY);
  } catch {
    // Nothing to do.
  }
};

/**
 * The server echoes who is inside on every response. Reading it from the headers rather than
 * trusting the stored flag means the banner is right even if the tab was restored or the
 * token came from somewhere unexpected.
 */
export const readSupportHeaders = (response) => {
  const by = response?.headers?.['x-impersonated-by'];
  if (!by) return null;
  return {
    impersonatedBy: by,
    readOnly: String(response.headers['x-impersonation-read-only']) === 'true',
  };
};
