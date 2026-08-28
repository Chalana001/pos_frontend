// Package feature gate for the POS UI.
//
// This used to be a 190-line hand-written matrix of 9 plan names × 18 boolean flags that had
// to be kept in step, by hand, with SubscriptionFilter's hardcoded URL prefix lists on the
// server. The two drifted: STANDARD blocked /purchases in one place and PURCHASES:false in the
// other, so changing one and forgetting the other produced either a visible menu item that
// 403s, or a hidden one the API still allowed.
//
// The server is now authoritative. GET /api/saas/my-modules returns the shop's effective module
// set — plan template plus any per-shop override the super admin set — and this file is a thin
// translation from the old feature names the ~18 call sites use to the module keys that back
// them. The `planName` argument is kept only so those call sites did not all have to change;
// it is ignored whenever a real module set has loaded.

import { hasModule, modulesLoaded } from './moduleAccess';

/** Old feature name → module key in the server catalog. */
export const FEATURE_MODULE_MAP = {
  ADVANCED_REPORTS: 'REPORTS',
  RETURNS_REPORTS: 'REPORTS_RETURNS',
  STOCK_LEVELS: 'STOCK',
  STOCK_TRANSFERS: 'STOCK_TRANSFERS',
  PURCHASES: 'PURCHASES',
  PURCHASE_RETURNS: 'PURCHASES_RETURNS',
  FINANCIALS: 'EXPENSES',
  USER_MANAGEMENT: 'SETTINGS_USERS',
  DINING_TABLES: 'POS_DINE_IN',
  ORDER_CANCEL: 'SALES_CANCEL',
  ORDER_RETURNS: 'SALES_RETURNS',
  SHIFT_HISTORY: 'SHIFTS_HISTORY',
  BULK_ITEMS: 'ITEMS_BULK',
  BARCODE_PRINT: 'ITEMS_BARCODE',
  RECIPE_ITEMS: 'ITEMS_RECIPE',
  WEIGHT_ITEMS: 'ITEMS_WEIGHT',
  SERVICES: 'ITEMS_SERVICE',
};

// Fallback only. Used before /api/saas/my-modules has answered — a cold offline start, or the
// first paint after login. Three tiers instead of the previous nine: the legacy plan names are
// aliases now, not copies, so they cannot drift from the tier they belong to.
const TIER_FEATURES = {
  FREE: {
    STOCK_LEVELS: false, ADVANCED_REPORTS: false, BULK_ITEMS: false, BARCODE_PRINT: false,
    STOCK_TRANSFERS: false, PURCHASES: false, FINANCIALS: false, USER_MANAGEMENT: false,
    DINING_TABLES: false, ORDER_CANCEL: false, ORDER_RETURNS: false, PURCHASE_RETURNS: false,
    RETURNS_REPORTS: false, SHIFT_HISTORY: false, RECIPE_ITEMS: false, WEIGHT_ITEMS: false,
    SERVICES: false,
  },
  STANDARD: {
    STOCK_LEVELS: true, ADVANCED_REPORTS: false, BULK_ITEMS: true, BARCODE_PRINT: true,
    STOCK_TRANSFERS: false, PURCHASES: false, FINANCIALS: true, USER_MANAGEMENT: true,
    DINING_TABLES: true, ORDER_CANCEL: false, ORDER_RETURNS: false, PURCHASE_RETURNS: false,
    RETURNS_REPORTS: false, SHIFT_HISTORY: false, RECIPE_ITEMS: false, WEIGHT_ITEMS: true,
    SERVICES: true,
  },
  PRO: {
    STOCK_LEVELS: true, ADVANCED_REPORTS: true, BULK_ITEMS: true, BARCODE_PRINT: true,
    STOCK_TRANSFERS: true, PURCHASES: true, FINANCIALS: true, USER_MANAGEMENT: true,
    DINING_TABLES: true, ORDER_CANCEL: true, ORDER_RETURNS: true, PURCHASE_RETURNS: true,
    RETURNS_REPORTS: true, SHIFT_HISTORY: true, RECIPE_ITEMS: true, WEIGHT_ITEMS: true,
    SERVICES: true,
  },
};

const PLAN_TIER = {
  FREE: 'FREE',
  MONTHLY_DEMO: 'FREE',
  STANDARD: 'STANDARD',
  MONTHLY_LITE: 'STANDARD',
  YEARLY_LITE: 'STANDARD',
  MONTHLY_BASIC: 'STANDARD',
  PRO: 'PRO',
  MONTHLY_PRO: 'PRO',
  YEARLY_PRO: 'PRO',
};

/**
 * Kept as a named export because it was one before; prefer the module set.
 * Reads as the old matrix did, one entry per plan name.
 */
export const PLAN_FEATURES = Object.fromEntries(
  Object.entries(PLAN_TIER).map(([planName, tier]) => [planName, TIER_FEATURES[tier]])
);

const SINGLE_BRANCH_PLANS = new Set([
  'FREE', 'STANDARD', 'MONTHLY_DEMO', 'MONTHLY_LITE', 'MONTHLY_BASIC', 'YEARLY_LITE',
]);

export const isSingleBranchPlan = (planName) => {
  if (!planName) return false;
  return SINGLE_BRANCH_PLANS.has(planName);
};

/**
 * Whether the shop's package includes a feature.
 *
 * `planName` is only consulted before the module set has loaded. Note that the fallback stays
 * permissive for an unrecognised plan — a shop on a custom plan must not have its whole UI
 * disappear for the second before /api/saas/my-modules answers. The server-side gate is the one
 * that actually enforces this; here it only decides what to draw.
 */
export const hasPlanFeature = (planName, feature) => {
  if (!feature) return true;

  const moduleKey = FEATURE_MODULE_MAP[feature];
  if (moduleKey && modulesLoaded()) {
    const allowed = hasModule(moduleKey);
    if (allowed !== null) return allowed;
  }

  const tier = PLAN_TIER[planName];
  if (!tier) return true;
  return TIER_FEATURES[tier]?.[feature] ?? true;
};

/** Direct module check for new code — no legacy feature-name indirection. */
export const hasShopModule = (moduleKey) => {
  const allowed = hasModule(moduleKey);
  return allowed === null ? true : allowed;
};

export const getConfigurableFeatureAvailability = (planName) => ({
  recipeItemsEnabled: hasPlanFeature(planName, 'RECIPE_ITEMS'),
  weightItemsEnabled: hasPlanFeature(planName, 'WEIGHT_ITEMS'),
  servicesEnabled: hasPlanFeature(planName, 'SERVICES'),
  tableManagementEnabled: hasPlanFeature(planName, 'DINING_TABLES'),
  dineInEnabled: hasPlanFeature(planName, 'DINING_TABLES'),
});
