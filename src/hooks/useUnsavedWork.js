import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  buildDraftId,
  deleteFormDraft,
  getFormDraft,
  getOrCreateDeviceId,
  purgeExpiredFormDrafts,
  saveFormDraft,
} from "../offline/db";
import { getDeviceLabel } from "../utils/deviceLabel";
import { hasModule } from "../utils/moduleAccess";

/**
 * Keep a long form's work alive across anything that unmounts the page.
 *
 * Opt-in, one call per page, because a blanket version is not actually available: a page's
 * state lives inside its own useState hooks and nothing above it can reach in and serialise
 * `cartItems` or `branchInputs`. Serialising DOM inputs would not rebuild those arrays, and
 * lifting every long form's state into a shared store is a rewrite of three files of ~1000
 * lines each. Opt-in also lets each page choose what a draft *is*. See the payload note.
 *
 * The page supplies the payload; this hook owns when it is written and when it is offered
 * back.
 *
 * What the payload must NOT contain: search text, dropdown or modal open state, panel
 * widths, validation errors, and above all fetched reference data, supplier and branch
 * lists, search results. Store ids and typed values, and let the page re-fetch reference
 * data on restore, or a resumed draft shows a supplier deleted yesterday at yesterday's
 * prices.
 *
 * @param kind          stable slug for the screen, e.g. 'purchase'
 * @param entityId      the record being edited, or null for a new one. Part of the key:
 *                      without it, opening promotion 7 would be offered promotion 5's draft
 * @param schemaVersion bump when the payload shape changes, so an old draft is discarded
 *                      rather than fed to a form that can no longer read it
 * @param isDirty       does this page currently hold work worth keeping
 * @param payload       the serialisable state; build it with useMemo so its identity
 *                      changes exactly when the form does
 */
const AUTOSAVE_DEBOUNCE_MS = 500;

const useUnsavedWork = ({ kind, entityId = null, schemaVersion = 1, isDirty, payload }) => {
  const { user } = useAuth();

  // hasModule answers null until the shop's module set has loaded, which on an offline cold
  // start can be the whole session. Treat that as ON: writing a draft to the user's own
  // browser is harmless, and losing their work is the thing this exists to prevent. The
  // server mirror, when it arrives, must take the opposite default.
  const enabled = hasModule("DRAFT_RECOVERY") !== false;

  const userId = user?.userId ?? null;
  const draftId = useMemo(
    () => (userId === null ? null : buildDraftId(kind, userId, entityId)),
    [kind, userId, entityId]
  );

  const [pendingDraft, setPendingDraft] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // The timers and listeners below fire outside React's render cycle and must see the
  // values as of *now*, not as of the render that installed them.
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const saveNow = useCallback(async () => {
    if (!enabled || !draftId || !isDirtyRef.current) return;
    try {
      const [deviceId] = await Promise.all([getOrCreateDeviceId()]);
      await saveFormDraft({
        draftId,
        kind,
        entityId,
        userId,
        deviceId,
        deviceLabel: getDeviceLabel(),
        schemaVersion,
        payload: payloadRef.current,
      });
      setLastSavedAt(new Date().toISOString());
    } catch {
      // A full or blocked IndexedDB must not break the form the user is typing into.
    }
  }, [enabled, draftId, kind, entityId, userId, schemaVersion]);

  const discardDraft = useCallback(async () => {
    setPendingDraft(null);
    if (!draftId) return;
    try {
      await deleteFormDraft(draftId);
    } catch {
      // Nothing to do; the offer is already dismissed for this session.
    }
  }, [draftId]);

  /** Called by the page once it has saved successfully, the draft has served its purpose. */
  const clearDraft = useCallback(async () => {
    setPendingDraft(null);
    setLastSavedAt(null);
    if (!draftId) return;
    try {
      await deleteFormDraft(draftId);
    } catch {
      // As above.
    }
  }, [draftId]);

  // Which record this hook has already asked about. Asking is a once-per-record event, not
  // something to redo whenever a dependency moves: `enabled` reads the module set, which is
  // re-fetched on every reconnect, and without this guard coming back online offered the
  // user a "draft" that was simply the work they were in the middle of typing.
  const offeredForRef = useRef(null);

  // Offer an existing draft, never apply one. Silently restoring surprises people and can
  // resurrect something they deliberately walked away from.
  useEffect(() => {
    if (!enabled || !draftId) return undefined;
    if (offeredForRef.current === draftId) return undefined;
    offeredForRef.current = draftId;
    let cancelled = false;

    (async () => {
      try {
        const draft = await getFormDraft(draftId);
        if (cancelled || !draft) return;

        // A draft written by an older shape of this form cannot be trusted to load into
        // it. Drop it with no offer rather than handing the page fields it cannot read.
        if (draft.schemaVersion !== schemaVersion) {
          await deleteFormDraft(draftId);
          return;
        }
        setPendingDraft(draft);
      } catch {
        // Unreadable store: behave as though there were no draft.
      }
    })();

    // Cheap enough to run on every long-form mount, and there is no other natural moment:
    // shop PCs are rarely restarted and nothing else sweeps this store.
    purgeExpiredFormDrafts().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled, draftId, schemaVersion]);

  // Autosave. Short debounce on purpose: the 401 handler navigates with
  // window.location.replace, and an IndexedDB write started from pagehide is not reliable,
  // so the draft has to already be on disk when that happens rather than being flushed as
  // the page goes down.
  useEffect(() => {
    if (!enabled || !isDirty) return undefined;
    const timer = window.setTimeout(() => {
      saveNow();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, isDirty, payload, saveNow]);

  // Leaving the tab or the window is the other moment worth a write, for the same reason.
  useEffect(() => {
    if (!enabled) return undefined;

    const flush = () => {
      if (isDirtyRef.current) saveNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("blur", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, saveNow]);

  // Layer 4: the browser's own confirmation for a tab close or a refresh. Independent of
  // drafts. It fires whether or not the module is on, because losing work to a stray
  // Ctrl+W has nothing to do with whether the shop bought draft recovery.
  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      // Browsers ignore custom text now and show their own wording; returnValue is still
      // what marks the event as wanting a prompt at all.
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);


  return {
    /** A draft waiting to be offered, or null. Render the restore bar from this. */
    pendingDraft,
    discardDraft,
    clearDraft,
    saveNow,
    lastSavedAt,
    draftEnabled: enabled,
  };
};

export default useUnsavedWork;
