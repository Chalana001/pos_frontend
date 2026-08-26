import api from "../api/axios";

// A successful server call this recently is proof enough; no need to probe again.
const REACHABLE_CACHE_MS = 10000;
// Long enough for a slow shop connection, short enough that a cashier is not left
// staring at a checkout button while a dead server times out.
const PROBE_TIMEOUT_MS = 2500;

let lastReachableAt = 0;

export const markServerReachable = () => {
  lastReachableAt = Date.now();
};

export const forgetServerReachable = () => {
  lastReachableAt = 0;
};

/**
 * Does the SERVER answer — not merely, is a network cable plugged in.
 *
 * `navigator.onLine` reports whether the machine has a network interface up, which is a
 * different question. A shop whose router is fine but whose ISP, DNS or VPS is down reads
 * as fully online, so checkout went to the server, failed, and the sale was lost to a
 * toast instead of being queued. This is the check that tells those two states apart.
 *
 * Marked background so a 401 here cannot redirect a cashier to the login screen and a
 * failure cannot raise a connection-error toast — the caller decides what to do.
 */
export const isServerReachable = async () => {
  if (Date.now() - lastReachableAt < REACHABLE_CACHE_MS) {
    return true;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    await api.get("/auth/me", { signal: controller.signal, meta: { background: true } });
    markServerReachable();
    return true;
  } catch {
    // Includes an expired session: the server may be up, but this browser cannot bank a
    // sale through it right now, and queueing is better than losing the sale either way.
    return false;
  } finally {
    window.clearTimeout(timer);
  }
};
