export const ORDER_TYPES = {
  CASH: 'CASH',
  CREDIT: 'CREDIT',
};

export const SALE_MODES = {
  TAKEAWAY: 'TAKEAWAY',
  DINE_IN: 'DINE_IN',
};

export const DISCOUNT_TYPES = {
  NONE: 'NONE',
  FIXED: 'FIXED',
  PERCENT: 'PERCENT',
};

export const OVERHEAD_COST_MODES = {
  NONE: 'NONE',
  FIXED: 'FIXED',
  PERCENT: 'PERCENT',
};

export const ItemType = {
    NORMAL: "NORMAL",
    WEIGHT: "WEIGHT",
    VOLUME: "VOLUME",
    SERVICE: "SERVICE",
    RECIPE: "RECIPE",
};

export const ItemTypeLabels = {
    NORMAL: "Normal Item (Stock Managed)",
    WEIGHT: "Weight Based (KG/G)",
    VOLUME: "Volume Based (L/ML)",
    SERVICE: "Service / Non-Stock",
    RECIPE: "Recipe / Food Item",
};

export const MeasurementUnit = {
  PCS: 'PCS',
  G: 'G',
  KG: 'KG',
  ML: 'ML',
  L: 'L',
  SERVICE: 'SERVICE',
};

export const ADJUSTMENT_TYPES = {
  EXPIRED: 'EXPIRED',
  DAMAGED: 'DAMAGED',
  LOST: 'LOST',
  FOUND: 'FOUND',
  NEW_STOCK: 'NEW_STOCK',
  MANUAL: 'MANUAL',
};

export const TRANSFER_STATUS = {
  REQUESTED: 'REQUESTED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
};

export const KEYBOARD_SHORTCUTS = {
  SEARCH_ITEM: 'F2',
  SELECT_CUSTOMER: 'F4',
  CHECKOUT: 'F9',
  ESCAPE: 'Escape',
};
