import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { BranchProvider } from '../context/BranchContext';
import { ShiftProvider } from '../context/ShiftContext';
import { AppConfigurationProvider } from '../context/AppConfigurationContext';
import ProtectedRoute from './ProtectedRoute';
import { hasPermission } from '../utils/permissions';

const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const POS = lazy(() => import('../pages/POS'));
const OfflineSalesPage = lazy(() => import('../pages/OfflineSalesPage'));
const SalesListPage = lazy(() => import('../pages/SalesListPage'));
const SalesDetailsPage = lazy(() => import('../pages/SalesDetailsPage'));
const SaleReturnPage = lazy(() => import('../pages/SaleReturnPage'));
const PromotionsPage = lazy(() => import('../pages/PromotionsPage'));
const WarrantiesPage = lazy(() => import('../pages/WarrantiesPage'));
const WarrantyClaimsPage = lazy(() => import('../pages/WarrantyClaimsPage'));
const WarrantyDetailsPage = lazy(() => import('../pages/WarrantyDetailsPage'));
const WarrantySettingsPage = lazy(() => import('../pages/WarrantySettingsPage'));
const ItemsPage = lazy(() => import('../pages/ItemsPage'));
const ItemFormPage = lazy(() => import('../pages/ItemFormPage'));
const BulkAddItems = lazy(() => import('../pages/BulkAddItems'));
const ItemExcelImportPage = lazy(() => import('../pages/ItemExcelImportPage'));
const BarcodePrintPage = lazy(() => import('../pages/BarcodePrintPage'));
const Customers = lazy(() => import('../pages/Customers'));
const CustomerFormPage = lazy(() => import('../pages/CustomerFormPage'));
const CustomerViewPage = lazy(() => import('../pages/CustomerViewPage'));
const Shifts = lazy(() => import('../pages/Shifts'));
const ShiftHistory = lazy(() => import('../pages/ShiftHistory'));
const ShiftDetailsPage = lazy(() => import('../pages/ShiftDetailsPage'));
const Expenses = lazy(() => import('../pages/Expenses'));
const ExpenseTypesPage = lazy(() => import('../pages/ExpenseTypesPage'));
const CashDrops = lazy(() => import('../pages/CashDrops'));
const BankAccountsPage = lazy(() => import('../pages/BankAccountsPage'));
const BankAccountDetailsPage = lazy(() => import('../pages/BankAccountDetailsPage'));
const Stock = lazy(() => import('../pages/Stock'));
const StockItemDetailsPage = lazy(() => import('../pages/StockItemDetailsPage'));
const StockAdjustments = lazy(() => import('../pages/StockAdjustments'));
const StockTransfers = lazy(() => import('../pages/StockTransfers'));
const StockTransferDetailsPage = lazy(() => import('../pages/StockTransferDetailsPage'));
const StockProcessingPage = lazy(() => import('../pages/StockProcessingPage'));
const Purchases = lazy(() => import('../pages/PurchaseListPage'));
const PurchaseReturnPage = lazy(() => import('../pages/PurchaseReturnPage'));
const NewPurchase = lazy(() => import('../pages/PurchaseFormPage'));
const PurchaseExcelImportPage = lazy(() => import('../pages/PurchaseExcelImportPage'));
const PurchaseDetailsPage = lazy(() => import('../pages/PurchaseDetailsPage'));
const SuppliersPage = lazy(() => import('../pages/SuppliersPage'));
const SupplierViewPage = lazy(() => import('../pages/SupplierViewPage'));
const SupplierFormPage = lazy(() => import('../pages/SupplierFormPage'));
const Reports = lazy(() => import('../pages/Reports'));
const ProcurementPlanningPage = lazy(() => import('../pages/ProcurementPlanningPage'));
const Branches = lazy(() => import('../pages/Branches'));
const ReceiptSettingsPage = lazy(() => import('../pages/ReceiptSettingsPage'));
const AppConfigurationPage = lazy(() => import('../pages/AppConfigurationPage'));
const DiningTablesPage = lazy(() => import('../pages/DiningTablesPage'));
const Users = lazy(() => import('../pages/Users'));
const SubscriptionPage = lazy(() => import('../pages/SubscriptionPage'));
const VersionHistoryPage = lazy(() => import('../pages/VersionHistoryPage'));
const RecipeIngredientsImportPage = lazy(() => import('../pages/RecipeIngredientsImportPage'));

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

const withSuspense = (node) => <Suspense fallback={<RouteFallback />}>{node}</Suspense>;

/**
 * Where "/" lands.
 *
 * Sending everyone to the dashboard stranded them: the dashboard is an online-only
 * route, so an offline user got "Online Connection Required", and a cashier — who has
 * no dashboard permission — got "Access Denied". Both are dead ends, and "/" is where
 * the login route and the offline PIN unlock both send you.
 *
 * Anyone who cannot reach the dashboard right now goes to the POS instead. Every role
 * holds ACCESS_POS, and /pos is deliberately not an online-only route.
 */
const HomeRedirect = () => {
  const { user, isOnline, hasOnlineSession, isOfflineSession } = useAuth();
  const canUseServer = isOnline && hasOnlineSession && !isOfflineSession;

  if (!canUseServer || !hasPermission(user?.role, 'VIEW_DASHBOARD')) {
    return <Navigate to="/pos" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={!isAuthenticated ? withSuspense(<Login />) : <Navigate to="/" replace />}
      />
      <Route path="/register" element={withSuspense(<Register />)} />

      <Route
        path="/pricing"
        element={(
          <ProtectedRoute requiresOnline>
            {withSuspense(<SubscriptionPage />)}
          </ProtectedRoute>
        )}
      />

      <Route
        path="/"
        element={(
          <ProtectedRoute>
            <BranchProvider>
              <AppConfigurationProvider>
                <ShiftProvider>
                  <Layout />
                </ShiftProvider>
              </AppConfigurationProvider>
            </BranchProvider>
          </ProtectedRoute>
        )}
      >
        <Route index element={<HomeRedirect />} />

        <Route path="dashboard" element={<ProtectedRoute permission="VIEW_DASHBOARD" requiresOnline>{withSuspense(<Dashboard />)}</ProtectedRoute>} />

        <Route path="pos" element={<ProtectedRoute permission="ACCESS_POS">{withSuspense(<POS />)}</ProtectedRoute>} />
        <Route path="offline-sales" element={<ProtectedRoute permission="ACCESS_POS">{withSuspense(<OfflineSalesPage />)}</ProtectedRoute>} />

        <Route path="sales" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline>{withSuspense(<SalesListPage />)}</ProtectedRoute>} />
        <Route path="sales/:id" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline>{withSuspense(<SalesDetailsPage />)}</ProtectedRoute>} />
        <Route path="sales/:id/return" element={<ProtectedRoute permission="PROCESS_RETURNS" feature="ORDER_RETURNS" requiresOnline>{withSuspense(<SaleReturnPage />)}</ProtectedRoute>} />
        <Route path="promotions" element={<ProtectedRoute permission="MANAGE_PROMOTIONS" requiresOnline>{withSuspense(<PromotionsPage />)}</ProtectedRoute>} />
        <Route path="warranties" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline>{withSuspense(<WarrantiesPage />)}</ProtectedRoute>} />
        <Route path="warranties/claims" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline>{withSuspense(<WarrantyClaimsPage />)}</ProtectedRoute>} />
        <Route path="warranties/settings" element={<ProtectedRoute permission="MANAGE_WARRANTY_SETTINGS" requiresOnline>{withSuspense(<WarrantySettingsPage />)}</ProtectedRoute>} />
        <Route path="warranties/:id" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline>{withSuspense(<WarrantyDetailsPage />)}</ProtectedRoute>} />

        <Route path="items" element={<ProtectedRoute permission="VIEW_ITEMS" requiresOnline>{withSuspense(<ItemsPage />)}</ProtectedRoute>} />
        <Route path="items/new" element={<ProtectedRoute permission="MANAGE_ITEMS" requiresOnline>{withSuspense(<ItemFormPage mode="create" />)}</ProtectedRoute>} />
        <Route path="items/:id/edit" element={<ProtectedRoute permission="MANAGE_ITEMS" requiresOnline>{withSuspense(<ItemFormPage mode="edit" />)}</ProtectedRoute>} />
        <Route path="items/bulk-add" element={<ProtectedRoute permission="MANAGE_ITEMS" feature="BULK_ITEMS" requiresOnline>{withSuspense(<BulkAddItems />)}</ProtectedRoute>} />
        <Route path="items/import-excel" element={<ProtectedRoute permission="MANAGE_ITEMS" feature="BULK_ITEMS" requiresOnline>{withSuspense(<ItemExcelImportPage />)}</ProtectedRoute>} />
        <Route path="items/import-recipe-ingredients" element={<ProtectedRoute permission="MANAGE_ITEMS" feature="BULK_ITEMS" requiresOnline>{withSuspense(<RecipeIngredientsImportPage />)}</ProtectedRoute>} />
        <Route path="items/print-barcodes" element={<ProtectedRoute permission="VIEW_ITEMS" feature="BARCODE_PRINT" requiresOnline>{withSuspense(<BarcodePrintPage />)}</ProtectedRoute>} />

        <Route path="customers" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline>{withSuspense(<Customers />)}</ProtectedRoute>} />
        <Route path="customers/new" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline>{withSuspense(<CustomerFormPage mode="create" />)}</ProtectedRoute>} />
        <Route path="customers/:id/edit" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline>{withSuspense(<CustomerFormPage mode="edit" />)}</ProtectedRoute>} />
        <Route path="customers/:id" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline>{withSuspense(<CustomerViewPage />)}</ProtectedRoute>} />

        <Route path="shifts" element={<ProtectedRoute permission="MANAGE_SHIFTS" requiresOnline>{withSuspense(<Shifts />)}</ProtectedRoute>} />
        <Route path="shifts/history" element={<ProtectedRoute permission="MANAGE_SHIFTS_HISTORY" feature="SHIFT_HISTORY" requiresOnline>{withSuspense(<ShiftHistory />)}</ProtectedRoute>} />
        <Route path="shifts/history/:id" element={<ProtectedRoute permission="MANAGE_SHIFTS_HISTORY" feature="SHIFT_HISTORY" requiresOnline>{withSuspense(<ShiftDetailsPage />)}</ProtectedRoute>} />

        <Route path="expenses" element={<ProtectedRoute permission="RECORD_EXPENSES" feature="FINANCIALS" requiresOnline>{withSuspense(<Expenses />)}</ProtectedRoute>} />
        <Route path="expenses/settings" element={<ProtectedRoute permission="RECORD_EXPENSES" feature="FINANCIALS" requiresOnline>{withSuspense(<ExpenseTypesPage />)}</ProtectedRoute>} />
        <Route path="cash-drops" element={<ProtectedRoute permission="RECORD_EXPENSES" feature="FINANCIALS" requiresOnline>{withSuspense(<CashDrops />)}</ProtectedRoute>} />
        <Route path="cash-drops/bank-accounts" element={<ProtectedRoute permission="MANAGE_BANK_ACCOUNTS" feature="FINANCIALS" requiresOnline>{withSuspense(<BankAccountsPage />)}</ProtectedRoute>} />
        <Route path="cash-drops/bank-accounts/:id" element={<ProtectedRoute permission="MANAGE_BANK_ACCOUNTS" feature="FINANCIALS" requiresOnline>{withSuspense(<BankAccountDetailsPage />)}</ProtectedRoute>} />

        <Route path="stock" element={<ProtectedRoute permission="VIEW_STOCK" feature="STOCK_LEVELS" requiresOnline>{withSuspense(<Stock />)}</ProtectedRoute>} />
        <Route path="stock/item/:id" element={<ProtectedRoute permission="VIEW_STOCK" feature="STOCK_LEVELS" requiresOnline>{withSuspense(<StockItemDetailsPage />)}</ProtectedRoute>} />
        <Route path="stock/adjustments" element={<ProtectedRoute permission="ADJUST_STOCK" feature="STOCK_LEVELS" requiresOnline>{withSuspense(<StockAdjustments />)}</ProtectedRoute>} />
        <Route path="stock/transfers" element={<ProtectedRoute permission="TRANSFER_STOCK" feature="STOCK_TRANSFERS" requiresOnline>{withSuspense(<StockTransfers />)}</ProtectedRoute>} />
        <Route path="stock-transfers/details/:transferNo" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<StockTransferDetailsPage />)}</ProtectedRoute>} />
        <Route path="stock/processing" element={<ProtectedRoute permission="ADJUST_STOCK" feature="STOCK_LEVELS" requiresOnline>{withSuspense(<StockProcessingPage />)}</ProtectedRoute>} />

        <Route path="purchases" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline>{withSuspense(<Purchases />)}</ProtectedRoute>} />
        <Route path="purchases/new" element={<ProtectedRoute permission="NEW_PURCHASE" feature="PURCHASES" requiresOnline>{withSuspense(<NewPurchase />)}</ProtectedRoute>} />
        <Route path="purchases/import-excel" element={<ProtectedRoute permission="NEW_PURCHASE" feature="PURCHASES" requiresOnline>{withSuspense(<PurchaseExcelImportPage />)}</ProtectedRoute>} />
        <Route path="purchases/:id" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline>{withSuspense(<PurchaseDetailsPage />)}</ProtectedRoute>} />
        <Route path="purchases/:id/return" element={<ProtectedRoute permission="PROCESS_PURCHASE_RETURNS" feature="PURCHASE_RETURNS" requiresOnline>{withSuspense(<PurchaseReturnPage />)}</ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline>{withSuspense(<SuppliersPage />)}</ProtectedRoute>} />
        <Route path="suppliers/new" element={<ProtectedRoute permission="NEW_PURCHASE" feature="PURCHASES" requiresOnline>{withSuspense(<SupplierFormPage />)}</ProtectedRoute>} />
        <Route path="suppliers/:id" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline>{withSuspense(<SupplierViewPage />)}</ProtectedRoute>} />

        <Route path="reports" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="basic" />)}</ProtectedRoute>} />
        <Route path="reports/sales" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="sales" />)}</ProtectedRoute>} />
        <Route path="reports/products" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="product" />)}</ProtectedRoute>} />
        <Route path="reports/inventory" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="inventory" />)}</ProtectedRoute>} />
        <Route path="reports/stock-health" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="stockHealth" />)}</ProtectedRoute>} />
        <Route path="reports/forecast" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="forecast" />)}</ProtectedRoute>} />
        <Route path="reports/procurement-planning" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<ProcurementPlanningPage />)}</ProtectedRoute>} />
        <Route path="reports/shifts" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="shifts" />)}</ProtectedRoute>} />
        <Route path="reports/cash-flow" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="cashFlow" />)}</ProtectedRoute>} />
        <Route path="reports/profit-loss" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="profitLoss" />)}</ProtectedRoute>} />
        <Route path="reports/credit-aging" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="creditAging" />)}</ProtectedRoute>} />
        <Route path="reports/supplier-payables" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="supplierPayables" />)}</ProtectedRoute>} />
        <Route path="reports/stock-movement" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="stockMovement" />)}</ProtectedRoute>} />
        <Route path="reports/stock-transfers" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="stockTransfers" />)}</ProtectedRoute>} />
        <Route path="reports/customer-behavior" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="customerBehavior" />)}</ProtectedRoute>} />
        <Route path="reports/performance-comparison" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="performanceComparison" />)}</ProtectedRoute>} />
        <Route path="reports/commercial-intelligence" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="commercialIntelligence" />)}</ProtectedRoute>} />
        <Route path="reports/exceptions" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="exceptions" />)}</ProtectedRoute>} />
        <Route path="reports/purchases" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="grnPurchases" />)}</ProtectedRoute>} />
        <Route path="reports/customers" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="customer" />)}</ProtectedRoute>} />
        <Route path="reports/suppliers" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="supplier" />)}</ProtectedRoute>} />
        <Route path="reports/returns" element={<ProtectedRoute permission="VIEW_REPORTS" feature="RETURNS_REPORTS" requiresOnline>{withSuspense(<Reports mode="returns" />)}</ProtectedRoute>} />
        <Route path="app-configuration" element={<ProtectedRoute permission="MANAGE_APP_CONFIGURATION" requiresOnline>{withSuspense(<AppConfigurationPage />)}</ProtectedRoute>} />
        <Route path="branches" element={<ProtectedRoute permission="MANAGE_BRANCHES" requiresOnline>{withSuspense(<Branches />)}</ProtectedRoute>} />
        <Route path="dining-tables" element={<ProtectedRoute permission="MANAGE_BRANCHES" feature="DINING_TABLES" requiresOnline>{withSuspense(<DiningTablesPage />)}</ProtectedRoute>} />
        <Route path="receipt-settings" element={<ProtectedRoute permission="MANAGE_BRANCHES" requiresOnline>{withSuspense(<ReceiptSettingsPage />)}</ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute permission="MANAGE_USERS" feature="USER_MANAGEMENT" requiresOnline>{withSuspense(<Users />)}</ProtectedRoute>} />
        <Route path="version-history" element={withSuspense(<VersionHistoryPage />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
