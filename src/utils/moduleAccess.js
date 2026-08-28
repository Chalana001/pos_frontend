// Module access store.
//
// The shop's enabled module set comes from GET /api/saas/my-modules, which resolves
// plan template + per-shop overrides on the server. This module holds that answer for
// the whole app and mirrors it to localStorage so an offline cold start still knows
// what the shop is allowed to see.
//
// Deliberately a plain module-level store rather than only a React context: the legacy
// `hasPlanFeature(planName, FEATURE)` helper is called from ~18 places, several of them
// outside a component render, and rewriting all of them to consume a hook would be a much
// larger and riskier change than swapping what that helper reads.

const STORAGE_KEY = 'pos_modules';

const state = {
  loaded: false,
  tenantId: null,
  planName: null,
  enabled: new Set(),
  routeModule: {},
  catalog: [],
};

const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(snapshot());
    } catch {
      // A broken subscriber must not stop the others from updating.
    }
  });
};

const snapshot = () => ({
  loaded: state.loaded,
  tenantId: state.tenantId,
  planName: state.planName,
  enabled: state.enabled,
  routeModule: state.routeModule,
  catalog: state.catalog,
});

/** Reads the cached set written by the last successful fetch, if it is for this tenant. */
export const hydrateModulesFromCache = (tenantId) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // A cache from a different shop must never be applied — a shared device that
    // switched tenants would otherwise inherit the previous shop's package.
    if (tenantId && parsed.tenantId && parsed.tenantId !== tenantId) {
      return false;
    }
    state.loaded = true;
    state.tenantId = parsed.tenantId ?? null;
    state.planName = parsed.planName ?? null;
    state.enabled = new Set(parsed.enabled ?? []);
    state.routeModule = parsed.routeModule ?? {};
    state.catalog = parsed.catalog ?? [];
    notify();
    return true;
  } catch {
    return false;
  }
};

export const setModules = (payload) => {
  state.loaded = true;
  state.tenantId = payload?.tenantId ?? null;
  state.planName = payload?.planName ?? null;
  state.enabled = new Set(payload?.enabled ?? []);
  state.routeModule = payload?.routeModule ?? {};
  state.catalog = payload?.catalog ?? [];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tenantId: state.tenantId,
      planName: state.planName,
      enabled: [...state.enabled],
      routeModule: state.routeModule,
      catalog: state.catalog,
      cachedAt: new Date().toISOString(),
    }));
  } catch {
    // Storage full or blocked — the in-memory set still works for this session.
  }

  notify();
};

export const clearModules = () => {
  state.loaded = false;
  state.tenantId = null;
  state.planName = null;
  state.enabled = new Set();
  state.routeModule = {};
  state.catalog = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; the in-memory reset above is what matters.
  }
  notify();
};

/** True once a real module set has been loaded, from the API or from cache. */
export const modulesLoaded = () => state.loaded;

export const getModuleState = snapshot;

/**
 * Whether the shop may use a module.
 *
 * Returns `null` when nothing has been loaded yet, so callers can tell "switched off"
 * apart from "not known yet" and fall back rather than hiding the whole app on first paint.
 */
export const hasModule = (moduleKey) => {
  if (!moduleKey) return true;
  if (!state.loaded) return null;
  return state.enabled.has(moduleKey);
};

/** Exact lookup in the server's route map. */
export const moduleForRoute = (path) => state.routeModule?.[path] ?? null;

/**
 * The module owning a concrete URL, e.g. "/sales/1042/return" -> SALES_RETURNS.
 *
 * The server sends patterns ("/sales", "/sales/:id/return"), so this turns each into a
 * regex and keeps the LONGEST match — otherwise "/sales" would win over
 * "/sales/:id/return" and a shop without returns would still reach the returns screen.
 */
export const moduleForPath = (path) => {
  if (!path || !state.loaded) return null;

  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  let bestPattern = null;
  let bestModule = null;

  for (const [pattern, moduleKey] of Object.entries(state.routeModule ?? {})) {
    const source = '^' + pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // escape regex metacharacters
      .replace(/:[A-Za-z0-9_]+/g, '[^/]+')     // :id matches exactly one segment
      + '(/.*)?$';                             // and anything nested below it

    if (new RegExp(source).test(clean) && (bestPattern === null || pattern.length > bestPattern.length)) {
      bestPattern = pattern;
      bestModule = moduleKey;
    }
  }
  return bestModule;
};

/**
 * Whether the shop may open a given POS route.
 *
 * Returns true when nothing is known yet or no module claims the path — the server is the
 * real gate, and hiding the whole app because a lookup came back empty would be worse than
 * showing a page that then returns 403.
 */
export const canOpenPath = (path) => {
  if (!state.loaded) return true;
  const moduleKey = moduleForPath(path);
  if (!moduleKey) return true;
  return state.enabled.has(moduleKey);
};

export const subscribeToModules = (listener) => {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
};
