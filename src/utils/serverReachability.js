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
 * Does the SERVER answer, not merely, is a network cable plugged in.
 *
 * `navigator.onLine` reports whether the machine has a network interface up, which is a
 * different question. A shop whose router is fine but whose ISP, DNS or VPS is down reads
 * as fully online, so checkout went to the server, failed, and the sale was lost to a
 * toast instead of being queued. This is the check that tells those two states apart.
 *
 * Marked background so a 401 here cannot redirect a cashier to the login screen and a
 * failure cannot raise a connection-error toast, the caller decides what to do.
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

/**
 * Is the SERVER up, a different question from the one above, and the one navigation needs.
 *
 * `isServerReachable` deliberately folds "not authenticated" into "unreachable", because for
 * a checkout those are the same answer: queue the sale either way. That is the wrong
 * question for the online/offline flag, which has to stay correct on the login screen and
 * for a session that has expired. Asking /auth/me there gets a 401 or 403 from a perfectly
 * healthy server, and treating that as "down" latches the whole app offline until reload.
 *
 * So this asks /health, and, the important part, counts ANY HTTP reply as proof of life.
 * A 401, a 403, even a 500 means something answered. Only a request that dies with no
 * response at all, or one that outlives the timeout, means the server is genuinely gone.
 *
 * Deliberately does not read or write the reachability cache above: that cache is the
 * till's, and its meaning is not this one.
 */
export const isServerResponding = async () => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    await api.get("/health", { signal: controller.signal, meta: { background: true } });
    // NOT markServerReachable(). /health answering proves the server is up, but it proves
    // nothing about this browser's session, and the till reads that cache to decide it can
    // skip its own probe before a checkout. Marking here would let a checkout on an expired
    // session go to the server, fail, and lose the sale instead of queueing it, which is the
    // exact failure isServerReachable was written to prevent.
    return true;
  } catch (error) {
    // A response of any status proves the server answered.
    if (error?.response && error.response.status !== 0) {
      return true;
    }
    return false;
  } finally {
    window.clearTimeout(timer);
  }
};
