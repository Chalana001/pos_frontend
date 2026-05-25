import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { BranchProvider } from '../context/BranchContext';
import { ShiftProvider } from '../context/ShiftContext';
import { AppConfigurationProvider } from '../context/AppConfigurationContext';
import ProtectedRoute from './ProtectedRoute';

const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const POS = lazy(() => import('../pages/POS'));
const OfflineSalesPage = lazy(() => import('../pages/OfflineSalesPage'));
const SalesListPage = lazy(() => import('../pages/SalesListPage'));
const SalesDetailsPage = lazy(() => import('../pages/SalesDetailsPage'));
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
const CashDrops = lazy(() => import('../pages/CashDrops'));
const Stock = lazy(() => import('../pages/Stock'));
const StockItemDetailsPage = lazy(() => import('../pages/StockItemDetailsPage'));
const StockAdjustments = lazy(() => import('../pages/StockAdjustments'));
const StockTransfers = lazy(() => import('../pages/StockTransfers'));
const StockProcessingPage = lazy(() => import('../pages/StockProcessingPage'));
const Purchases = lazy(() => import('../pages/PurchaseListPage'));
const NewPurchase = lazy(() => import('../pages/PurchaseFormPage'));
const PurchaseDetailsPage = lazy(() => import('../pages/PurchaseDetailsPage'));
const SuppliersPage = lazy(() => import('../pages/SuppliersPage'));
const SupplierViewPage = lazy(() => import('../pages/SupplierViewPage'));
const SupplierFormPage = lazy(() => import('../pages/SupplierFormPage'));
const Reports = lazy(() => import('../pages/Reports'));
const Branches = lazy(() => import('../pages/Branches'));
const ReceiptSettingsPage = lazy(() => import('../pages/ReceiptSettingsPage'));
const AppConfigurationPage = lazy(() => import('../pages/AppConfigurationPage'));
const DiningTablesPage = lazy(() => import('../pages/DiningTablesPage'));
const Users = lazy(() => import('../pages/Users'));
const SubscriptionPage = lazy(() => import('../pages/SubscriptionPage'));
const VersionHistoryPage = lazy(() => import('../pages/VersionHistoryPage'));

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
);

const withSuspense = (node) => <Suspense fallback={<RouteFallback />}>{node}</Suspense>;

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={!isAuthenticated ? withSuspense(<Login />) : <Navigate to="/" />}
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
            <AppConfigurationProvider>
              <BranchProvider>
                <ShiftProvider>
                  <Layout />
                </ShiftProvider>
              </BranchProvider>
            </AppConfigurationProvider>
          </ProtectedRoute>
        )}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<ProtectedRoute permission="VIEW_DASHBOARD" requiresOnline>{withSuspense(<Dashboard />)}</ProtectedRoute>} />

        <Route path="pos" element={<ProtectedRoute permission="ACCESS_POS">{withSuspense(<POS />)}</ProtectedRoute>} />
        <Route path="offline-sales" element={<ProtectedRoute permission="ACCESS_POS">{withSuspense(<OfflineSalesPage />)}</ProtectedRoute>} />

        <Route path="sales" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline>{withSuspense(<SalesListPage />)}</ProtectedRoute>} />
        <Route path="sales/:id" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline>{withSuspense(<SalesDetailsPage />)}</ProtectedRoute>} />
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
        <Route path="items/import-recipe-ingredients" element={<ProtectedRoute permission="MANAGE_ITEMS" feature="BULK_ITEMS" requiresOnline>{withSuspense(<ItemExcelImportPage initialTab="recipe-ingredients" />)}</ProtectedRoute>} />
        <Route path="items/print-barcodes" element={<ProtectedRoute permission="VIEW_ITEMS" feature="BARCODE_PRINT" requiresOnline>{withSuspense(<BarcodePrintPage />)}</ProtectedRoute>} />

        <Route path="customers" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline>{withSuspense(<Customers />)}</ProtectedRoute>} />
        <Route path="customers/new" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline>{withSuspense(<CustomerFormPage mode="create" />)}</ProtectedRoute>} />
        <Route path="customers/:id/edit" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline>{withSuspense(<CustomerFormPage mode="edit" />)}</ProtectedRoute>} />
        <Route path="customers/:id" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline>{withSuspense(<CustomerViewPage />)}</ProtectedRoute>} />

        <Route path="shifts" element={<ProtectedRoute permission="MANAGE_SHIFTS" requiresOnline>{withSuspense(<Shifts />)}</ProtectedRoute>} />
        <Route path="shifts/history" element={<ProtectedRoute permission="MANAGE_SHIFTS_HISTORY" feature="SHIFT_HISTORY" requiresOnline>{withSuspense(<ShiftHistory />)}</ProtectedRoute>} />
        <Route path="shifts/history/:id" element={<ProtectedRoute permission="MANAGE_SHIFTS_HISTORY" feature="SHIFT_HISTORY" requiresOnline>{withSuspense(<ShiftDetailsPage />)}</ProtectedRoute>} />

        <Route path="expenses" element={<ProtectedRoute permission="RECORD_EXPENSES" feature="FINANCIALS" requiresOnline>{withSuspense(<Expenses />)}</ProtectedRoute>} />
        <Route path="cash-drops" element={<ProtectedRoute permission="RECORD_EXPENSES" feature="FINANCIALS" requiresOnline>{withSuspense(<CashDrops />)}</ProtectedRoute>} />

        <Route path="stock" element={<ProtectedRoute permission="VIEW_STOCK" feature="STOCK_LEVELS" requiresOnline>{withSuspense(<Stock />)}</ProtectedRoute>} />
        <Route path="stock/item/:id" element={<ProtectedRoute permission="VIEW_STOCK" feature="STOCK_LEVELS" requiresOnline>{withSuspense(<StockItemDetailsPage />)}</ProtectedRoute>} />
        <Route path="stock/adjustments" element={<ProtectedRoute permission="ADJUST_STOCK" feature="STOCK_LEVELS" requiresOnline>{withSuspense(<StockAdjustments />)}</ProtectedRoute>} />
        <Route path="stock/transfers" element={<ProtectedRoute permission="TRANSFER_STOCK" feature="STOCK_TRANSFERS" requiresOnline>{withSuspense(<StockTransfers />)}</ProtectedRoute>} />
        <Route path="stock/processing" element={<ProtectedRoute permission="ADJUST_STOCK" feature="STOCK_LEVELS" requiresOnline>{withSuspense(<StockProcessingPage />)}</ProtectedRoute>} />

        <Route path="purchases" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline>{withSuspense(<Purchases />)}</ProtectedRoute>} />
        <Route path="purchases/new" element={<ProtectedRoute permission="NEW_PURCHASE" feature="PURCHASES" requiresOnline>{withSuspense(<NewPurchase />)}</ProtectedRoute>} />
        <Route path="purchases/:id" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline>{withSuspense(<PurchaseDetailsPage />)}</ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline>{withSuspense(<SuppliersPage />)}</ProtectedRoute>} />
        <Route path="suppliers/new" element={<ProtectedRoute permission="NEW_PURCHASE" feature="PURCHASES" requiresOnline>{withSuspense(<SupplierFormPage />)}</ProtectedRoute>} />
        <Route path="suppliers/:id" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline>{withSuspense(<SupplierViewPage />)}</ProtectedRoute>} />

        <Route path="reports" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="basic" />)}</ProtectedRoute>} />
        <Route path="reports/sales" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="sales" />)}</ProtectedRoute>} />
        <Route path="reports/products" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="product" />)}</ProtectedRoute>} />
        <Route path="reports/customers" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="customer" />)}</ProtectedRoute>} />
        <Route path="reports/suppliers" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline>{withSuspense(<Reports mode="supplier" />)}</ProtectedRoute>} />
        <Route path="app-configuration" element={<ProtectedRoute permission="MANAGE_BRANCHES" requiresOnline>{withSuspense(<AppConfigurationPage />)}</ProtectedRoute>} />
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
