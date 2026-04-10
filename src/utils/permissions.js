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
  
  // --- Shifts ---
  MANAGE_SHIFTS: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  MANAGE_SHIFTS_HISTORY: [ROLES.MANAGER, ROLES.ADMIN],
  
  // --- Expenses & Cash Drops ---
  RECORD_EXPENSES: [ROLES.CASHIER, ROLES.MANAGER, ROLES.ADMIN],
  
  // --- Administration ---
  MANAGE_BRANCHES: [ROLES.ADMIN],
  MANAGE_USERS: [ROLES.ADMIN],
};

export const hasPermission = (userRole, permission) => {
  return PERMISSIONS[permission]?.includes(userRole) || false;
};

export const canAccessAllBranches = (userRole) => {
  return userRole === ROLES.ADMIN;  // 🔴 ADMIN එකමයි (MANAGER එක කෙලින් කළා)
};