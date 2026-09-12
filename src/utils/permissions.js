// src/utils/permissions.js

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
};

export const PERMISSIONS = {
  // --- Dashboard & Reports ---
  VIEW_DASHBOARD: [ROLES.MANAGER, ROLES.ADMIN],
  VIEW_REPORTS: [ROLES.MANAGER, ROLES.ADMIN],

  // --- POS & Sales ---
  ACCESS_POS: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  VIEW_SALES: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN], // අලුතින් එකතු කළා
  CANCEL_ORDERS: [ROLES.MANAGER, ROLES.ADMIN],
  PROCESS_RETURNS: [ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_WARRANTY_SETTINGS: [ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_PROMOTIONS: [ROLES.MANAGER, ROLES.ADMIN],
  VIEW_PROMOTION_HISTORY: [ROLES.MANAGER, ROLES.ADMIN],
  // Approval is the second pair of eyes on a deep discount; the backend also refuses the
  // person who submitted it, which a role map cannot express.
  APPROVE_PROMOTIONS: [ROLES.ADMIN],
  MANAGE_PROMOTION_SETTINGS: [ROLES.ADMIN],
  MANAGE_PROMOTION_CODES: [ROLES.MANAGER, ROLES.ADMIN],
  VIEW_PROMOTION_ANALYTICS: [ROLES.MANAGER, ROLES.ADMIN],
  OVERRIDE_PROMOTION_DISCOUNT: [ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_CUSTOMER_SEGMENTS: [ROLES.MANAGER, ROLES.ADMIN],
  // A cashier reads a balance to offer a redemption at the till; changing the scheme, its
  // rates or someone's points is not theirs to do.
  VIEW_LOYALTY: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_LOYALTY: [ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_LOYALTY_SETTINGS: [ROLES.ADMIN],
  
  // --- Customers ---
  MANAGE_CUSTOMERS: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  
  // --- Items ---
  VIEW_ITEMS: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_ITEMS: [ROLES.MANAGER, ROLES.ADMIN], // Create, Edit, Delete
  
  // --- Stock ---
  VIEW_STOCK: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  ADJUST_STOCK: [ROLES.MANAGER, ROLES.ADMIN],
  TRANSFER_STOCK: [ROLES.MANAGER, ROLES.ADMIN],

  // --- Purchases ---
  VIEW_PURCHASES: [ROLES.MANAGER, ROLES.ADMIN],
  NEW_PURCHASE: [ROLES.MANAGER, ROLES.ADMIN],
  // Cancel-and-rebuild does the work of a cancel plus a create, so it is held by exactly
  // the roles that hold both. Must stay in step with PurchaseController's @PreAuthorize on
  // /purchases/{id}/replace, or the button renders and then 403s.
  AMEND_PURCHASE: [ROLES.MANAGER, ROLES.ADMIN],
  PROCESS_PURCHASE_RETURNS: [ROLES.MANAGER, ROLES.ADMIN],
  
  // --- Shifts ---
  MANAGE_SHIFTS: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_SHIFTS_HISTORY: [ROLES.MANAGER, ROLES.ADMIN],
  
  // --- Expenses & Cash Drops ---
  RECORD_EXPENSES: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_BANK_ACCOUNTS: [ROLES.MANAGER, ROLES.ADMIN],
  
  // --- Administration ---
  MANAGE_APP_CONFIGURATION: [ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_BRANCHES: [ROLES.ADMIN],
  MANAGE_USERS: [ROLES.ADMIN],
};

export const hasPermission = (userRole, permission) => {
  return PERMISSIONS[permission]?.includes(userRole) || false;
};

export const canAccessAllBranches = (userRole) => {
  return userRole === ROLES.ADMIN;  // 🔴 ADMIN එකමයි (MANAGER එක කෙලින් කළා)
};
