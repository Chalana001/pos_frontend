import { SERVER_UNREACHABLE_EVENT } from "./networkEvents";
import { isServerResponding } from "./serverReachability";

// Is the SERVER answering — as opposed to "is a network interface up", which is the only
// question navigator.onLine can answer.
//
// navigator.onLine flips to false on a Wi-Fi roam between access points, a cable reseat, a
// VPN reconnect or a USB tether handover: blips of well under a second during which the
// server was answering the whole time. It also reports true when the router is fine but the
// ISP or the VPS is down. Treating it as the verdict is what once threw a cashier off a
// half-typed 40-line purchase and onto /pos, with the form unmounted and its state gone.
//
// Here it is only ever a SUSPICION. So is a request that died with no response — which is
// the case navigator misses entirely, and the stronger signal of the two.
//
//   suspicion -> probe -> (fail) -> wait -> probe -> (fail) -> offline   ~10s
//   any probe that succeeds, at any point                    -> online   immediately
//
// Slow to declare offline, immediate to declare online. Two probes rather than one long
// timer because a single 2.5s-timeout probe can fail on a link that is slow but alive.
//
// Deliberately NOT the check the till uses. POS.jsx calls isServerReachable() itself at the
// moment of checkout and must not wait on this grace window — a sale needs the answer now,
// and queueing beats losing it. This flag is only an indicator: the Offline chip in the
// header, and the POS deciding to queue. It never moves anyone off a page or interrupts
// them, so being ten seconds late costs nothing. Keep the two separate.

/** Gap between the first failed probe and the confirming one. */
const OFFLINE_CONFIRM_DELAY_MS = 5000;
/** How often to re-check while offline, so recovery is noticed without a page reload. */
const RECOVERY_POLL_MS = 5000;

const state = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
};

const listeners = new Set();

let confirmTimer = null;
let recoveryTimer = null;
let probing = false;
let started = false;

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(state.online);
    } catch {
      // One broken subscriber must not stop the others from being told.
    }
  });
};

const stopRecoveryPoll = () => {
  if (recoveryTimer) {
    window.clearInterval(recoveryTimer);
    recoveryTimer = null;
  }
};

const startRecoveryPoll = () => {
  if (recoveryTimer || typeof window === "undefined") return;
  recoveryTimer = window.setInterval(() => {
    probe();
  }, RECOVERY_POLL_MS);
};

const clearConfirmTimer = () => {
  if (confirmTimer) {
    window.clearTimeout(confirmTimer);
    confirmTimer = null;
  }
};

const setOnline = (next) => {
  if (state.online === next) return;
  state.online = next;
  if (next) {
    stopRecoveryPoll();
  } else {
    startRecoveryPoll();
  }
  notify();
};

/**
 * Ask the server whether it is alive. A success flips the app back online from wherever it
 * had got to in the sequence.
 *
 * Uses isServerResponding, NOT isServerReachable. The latter answers "can this browser bank
 * a sale right now" and deliberately reports an unauthenticated or expired session as
 * unreachable — correct for the till, wrong here. Asking it on the login screen gets a 403
 * from a perfectly healthy server, and the app latches offline for the whole session with
 * no way back short of a reload. Any HTTP reply at all is proof of life for this flag.
 */
const probe = async () => {
  if (probing) return state.online;
  probing = true;
  try {
    const responding = await isServerResponding();
    if (responding) {
      clearConfirmTimer();
      setOnline(true);
    }
    return responding;
  } finally {
    probing = false;
  }
};

/**
 * Something suggests the connection is gone. Confirm it before believing it.
 *
 * Safe to call as often as the app likes: while already offline the recovery poll owns the
 * question, and while a confirmation is already running a second suspicion changes nothing.
 *
 * Exported for the event handlers below and for tests; nothing else should need to call it,
 * because every real suspicion already arrives as a window event.
 */
export const suspectOffline = async () => {
  if (!state.online) return;
  if (confirmTimer) return;

  if (await probe()) return;

  // Still online as far as the app is concerned — one failure is not enough.
  confirmTimer = window.setTimeout(async () => {
    confirmTimer = null;
    if (await probe()) return;
    setOnline(false);
  }, OFFLINE_CONFIRM_DELAY_MS);
};


const handleBrowserOnline = () => {
  // navigator saying "up" is no more authoritative than it saying "down", but it is a good
  // moment to look: probe at once rather than waiting for the next poll tick.
  probe();
};

const handleBrowserOffline = () => {
  suspectOffline();
};

const start = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("online", handleBrowserOnline);
  window.addEventListener("offline", handleBrowserOffline);
  window.addEventListener(SERVER_UNREACHABLE_EVENT, handleBrowserOffline);

  // A cold start while navigator already reads offline: believe it for now, but keep
  // checking, because it may be lying in this direction too.
  if (!state.online) {
    startRecoveryPoll();
    probe();
  }
};

export const isOnlineNow = () => state.online;

/**
 * Subscribe to changes. Returns an unsubscribe function.
 *
 * The probe loop is a module-level singleton, so any number of subscribers share one
 * timer and one in-flight probe rather than each running their own.
 */
export const subscribeToNetworkStatus = (listener) => {
  start();
  listeners.add(listener);
  listener(state.online);
  return () => listeners.delete(listener);
};
