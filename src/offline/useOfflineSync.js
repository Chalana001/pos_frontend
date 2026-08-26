import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useShift } from "../context/ShiftContext";
import { isServerReachable } from "../utils/serverReachability";
import { getOfflineSalesCount, OFFLINE_EVENTS } from "./db";
import { evaluateQueue, pushRows } from "./sync";

// The browser fires `online` when a network interface comes up, not when the server is
// reachable — DHCP, DNS and VPN are still settling for seconds after a router reboot.
// Attempting inside that window stamps every row with a lastError and hands the cashier
// a queue full of red text for a problem that fixed itself.
const SETTLE_AFTER_RECONNECT_MS = 15000;
// A fresh page load has nothing to settle; the network is already whatever it is.
const SETTLE_ON_MOUNT_MS = 3000;

const BACKOFF_STEPS_MS = [30000, 60000, 120000, 300000];

/**
 * Pushes the offline queue on its own, so nobody has to remember to.
 *
 * Queued sales used to sit in IndexedDB until a human opened /offline-sales and pressed a
 * button — and those rows are the only copy of themselves, so the longer they sit the
 * more chances there are to lose them.
 *
 * Deliberately conservative about what it sends: only rows that are ready, and never one
 * a human has already watched fail. Silently retrying a failure churns without making
 * progress. The point is to be invisible when it works and quiet when it cannot.
 */
export const useOfflineSync = () => {
  const { user, isOnline, hasOnlineSession, isOfflineSession, loading } = useAuth();
  const { activeShift, loadingShift } = useShift();

  const [status, setStatus] = useState("idle");

  const timerRef = useRef(null);
  const backoffIndexRef = useRef(0);
  const runningRef = useRef(false);
  const hasAttemptedRef = useRef(false);
  // Lets the timer call the latest attempt without scheduleAttempt depending on it,
  // which would otherwise be a cycle: attempt -> backoff -> schedule -> attempt.
  const attemptRef = useRef(null);

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  // Auth re-bootstraps on reconnect and the shift refetches with it. Evaluating before
  // those settle resolves every row as "no open shift" and reports a false blockage.
  const canSync =
    !loading && !loadingShift && isOnline && hasOnlineSession && !isOfflineSession && !!user;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAttempt = useCallback((delayMs) => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      attemptRef.current?.();
    }, delayMs);
  }, [clearTimer]);

  const scheduleBackoff = useCallback(() => {
    const index = Math.min(backoffIndexRef.current, BACKOFF_STEPS_MS.length - 1);
    backoffIndexRef.current = index + 1;
    setStatus("backoff");
    scheduleAttempt(BACKOFF_STEPS_MS[index]);
  }, [scheduleAttempt]);

  const attempt = useCallback(async () => {
    if (runningRef.current) return;
    if (!canSync) {
      setStatus("waiting");
      return;
    }

    const queuedCount = await getOfflineSalesCount();
    if (queuedCount === 0) {
      backoffIndexRef.current = 0;
      setStatus("idle");
      return;
    }

    runningRef.current = true;
    try {
      setStatus("probing");
      if (!(await isServerReachable())) {
        // Nothing is touched: no row is marked failed merely because the server is down.
        scheduleBackoff();
        return;
      }

      setStatus("evaluating");
      const { rows, readyRows } = await evaluateQueue({
        online: true,
        isAdminOrManager,
        activeShift,
        currentUserId: user?.userId,
      });

      const autoPushableRows = readyRows.filter((row) => !row.lastError);
      if (autoPushableRows.length === 0) {
        backoffIndexRef.current = 0;
        // Rows are here but none can go unattended: they need a shift opened, or a human
        // to look at a failure. The queue page and the header badge already say so.
        setStatus(rows.length > 0 ? "blocked" : "idle");
        return;
      }

      setStatus("pushing");
      const { imported, failed } = await pushRows(autoPushableRows);
      backoffIndexRef.current = 0;

      if (imported > 0) {
        toast.success(`${imported} offline sale${imported === 1 ? "" : "s"} synced automatically.`);
      }
      setStatus(failed > 0 ? "blocked" : "idle");
    } catch (error) {
      console.error("Automatic offline sync failed", error);
      scheduleBackoff();
    } finally {
      runningRef.current = false;
    }
  }, [activeShift, canSync, isAdminOrManager, scheduleBackoff, user?.userId]);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  // Becoming able to sync is the trigger: a fresh mount with a queue left over, a
  // reconnection, or signing back in after a PIN session.
  useEffect(() => {
    if (!canSync) {
      clearTimer();
      setStatus("waiting");
      return;
    }

    const delayMs = hasAttemptedRef.current ? SETTLE_AFTER_RECONNECT_MS : SETTLE_ON_MOUNT_MS;
    hasAttemptedRef.current = true;
    backoffIndexRef.current = 0;
    scheduleAttempt(delayMs);
  }, [canSync, clearTimer, scheduleAttempt]);

  // A sale queued while the server happens to be up should not wait for the next trigger.
  useEffect(() => {
    const handler = () => {
      if (canSync) scheduleAttempt(SETTLE_ON_MOUNT_MS);
    };
    window.addEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);
    return () => window.removeEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);
  }, [canSync, scheduleAttempt]);

  useEffect(() => clearTimer, [clearTimer]);

  return { status };
};

export default useOfflineSync;
