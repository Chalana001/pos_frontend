import { useEffect, useRef } from 'react';

/**
 * Binds a window-level keyboard shortcut.
 *
 * `enabled` gates the listener itself, not just the callback. That distinction is
 * the whole point: a binding that registers but declines to act still calls
 * preventDefault, so it silently cancels the key for the rest of the page. Enter
 * is the case that bites — a barcode scanner sends it to terminate a scan, and a
 * checkout shortcut that swallows it page-wide drops the scan.
 *
 * Function keys stay bound unconditionally on purpose: preventDefault is what
 * stops F1 from opening the browser's help window over the till.
 */
export const useKeyboard = (key, callback, options = {}) => {
  const { enabled = true } = options;

  // Callers pass inline arrows, so the callback identity changes every render.
  // Holding it in a ref keeps the listener attached instead of tearing it down
  // and re-adding it on each pass, and still calls the current closure.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;

    const handler = (event) => {
      if (event.key !== key) return;
      event.preventDefault();
      callbackRef.current(event);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, enabled]);
};
