import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { BRAND_NAME } from '../utils/branding';

/**
 * Every route used to share one browser title, so tabs, history entries and
 * bookmarks were all "ZenSys POS" and told you nothing apart. Staff running the
 * till next to a report could not tell the two tabs apart, and a screen reader
 * announced the same title on every navigation.
 *
 * Longest-prefix match, so detail routes inherit their section's title without
 * needing an entry each.
 */
const ROUTE_TITLES = [
  ['/login', 'Sign in'],
  ['/register', 'Create account'],
  ['/pricing', 'Plans and pricing'],

  ['/pos', 'Point of sale'],
  ['/dashboard', 'Dashboard'],
  ['/offline-sales', 'Offline queue'],

  ['/sales', 'Sales'],
  ['/customers', 'Customers'],
  ['/suppliers', 'Suppliers'],
  ['/purchases', 'Purchases'],
  ['/items/print-barcodes', 'Print barcodes'],
  ['/items/import-recipe-ingredients', 'Import recipe ingredients'],
  ['/items/import-excel', 'Import items'],
  ['/items/bulk-add', 'Bulk add items'],
  ['/items', 'Items'],

  ['/stock/adjustments', 'Stock adjustments'],
  ['/stock/processing', 'Stock processing'],
  ['/stock/transfers', 'Stock transfers'],
  ['/stock-transfers', 'Stock transfers'],
  ['/stock', 'Stock'],

  ['/shifts/history', 'Shift history'],
  ['/shifts', 'Shifts'],
  ['/cash-drops/bank-accounts', 'Bank accounts'],
  ['/cash-drops', 'Cash drops'],
  ['/expenses/settings', 'Expense types'],
  ['/expenses', 'Expenses'],

  ['/warranties/claims', 'Warranty claims'],
  ['/warranties/settings', 'Warranty settings'],
  ['/warranties', 'Warranties'],
  ['/promotions', 'Promotions'],
  ['/dining-tables', 'Dining tables'],

  // Reports are the screens most likely to be open several at once, so each
  // gets its own title rather than 21 tabs all reading "Reports".
  ['/reports/commercial-intelligence', 'Commercial intelligence'],
  ['/reports/performance-comparison', 'Performance comparison'],
  ['/reports/procurement-planning', 'Procurement planning'],
  ['/reports/supplier-payables', 'Supplier payables'],
  ['/reports/customer-behavior', 'Customer behaviour'],
  ['/reports/stock-movement', 'Stock movement report'],
  ['/reports/stock-transfers', 'Stock transfer report'],
  ['/reports/stock-health', 'Stock health'],
  ['/reports/credit-aging', 'Credit aging'],
  ['/reports/profit-loss', 'Profit and loss'],
  ['/reports/cash-flow', 'Cash flow'],
  ['/reports/exceptions', 'Exception centre'],
  ['/reports/forecast', 'Demand forecast'],
  ['/reports/inventory', 'Inventory report'],
  ['/reports/purchases', 'Purchase report'],
  ['/reports/suppliers', 'Supplier report'],
  ['/reports/customers', 'Customer report'],
  ['/reports/products', 'Product report'],
  ['/reports/returns', 'Returns report'],
  ['/reports/shifts', 'Shift report'],
  ['/reports/sales', 'Sales report'],
  ['/reports', 'Reports'],
  ['/branches', 'Branches'],
  ['/users', 'Users'],
  ['/receipt-settings', 'Receipt settings'],
  ['/app-configuration', 'App configuration'],
  ['/version-history', 'Version history'],
];

export const titleForPath = (pathname) => {
  const match = ROUTE_TITLES
    .filter(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];

  return match ? `${match[1]} · ${BRAND_NAME}` : BRAND_NAME;
};

export const useDocumentTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleForPath(pathname);
  }, [pathname]);
};

export default useDocumentTitle;
