import { itemsAPI } from "../api/items.api";
import { cacheItemsForBranch, getCachedItemsForBranch } from "./db";

let routesPrefetched = false;
const catalogWarmedBranchIds = new Set();

/**
 * Pull the offline-capable route chunks down while there is still a network to pull them
 * over.
 *
 * Routes are lazily imported and the service worker is network-first, so a chunk only
 * reaches the runtime cache after someone has opened that page online. /offline-sales —
 * the one screen an outage actually requires — is the least likely to have been visited
 * before it is needed, which is precisely when it can no longer be fetched.
 *
 * Importing the same specifiers AppRoutes uses means Vite serves the same chunks, so this
 * needs no build-time list of hashed filenames to drift out of date.
 */
export const prefetchOfflineRoutes = () => {
  if (routesPrefetched) return;
  routesPrefetched = true;

  const warm = () => {
    import("../pages/POS").catch(() => {});
    import("../pages/OfflineSalesPage").catch(() => {});
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(warm, { timeout: 10000 });
  } else {
    window.setTimeout(warm, 5000);
  }
};

/**
 * Make sure a branch has an item cache before anyone needs it offline.
 *
 * The cache was only ever written by opening the POS screen online for that branch, so a
 * new terminal, a cleared profile, or an admin switching to a branch they had not visited
 * all landed on an empty grid the moment the connection dropped.
 *
 * Only fills an EMPTY cache — a populated one is refreshed by the POS screen itself on
 * every online load, and re-pulling the whole catalogue here would be a heavy request for
 * no benefit.
 */
export const ensureBranchCatalogCached = async (branchId) => {
  const numericBranchId = Number(branchId);
  if (!numericBranchId || catalogWarmedBranchIds.has(numericBranchId)) return;
  catalogWarmedBranchIds.add(numericBranchId);

  try {
    const existing = await getCachedItemsForBranch(numericBranchId);
    if (existing.length > 0) return;

    const response = await itemsAPI.searchForPos("", numericBranchId);
    await cacheItemsForBranch(numericBranchId, Array.isArray(response.data) ? response.data : []);
  } catch (error) {
    // Best effort: the POS screen still fills this cache the usual way.
    catalogWarmedBranchIds.delete(numericBranchId);
    console.warn("Could not pre-cache the item catalogue for branch", numericBranchId, error);
  }
};
