import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BranchProvider } from '../context/BranchContext';
import { ShiftProvider } from '../context/ShiftContext';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/layout/Layout';

import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import POS from '../pages/POS';
import OfflineSalesPage from '../pages/OfflineSalesPage';
import SalesListPage from '../pages/SalesListPage';
import SalesDetailsPage from '../pages/SalesDetailsPage';
import ItemsPage from "../pages/ItemsPage";
import ItemFormPage from "../pages/ItemFormPage";
import BulkAddItems from "../pages/BulkAddItems";
import BarcodePrintPage from "../pages/BarcodePrintPage";
import Customers from '../pages/Customers';
import CustomerFormPage from "../pages/CustomerFormPage";
import CustomerViewPage from "../pages/CustomerViewPage";
import Shifts from '../pages/Shifts';
import ShiftHistory from '../pages/ShiftHistory';
import ShiftDetailsPage from '../pages/ShiftDetailsPage';
import Expenses from '../pages/Expenses';
import CashDrops from '../pages/CashDrops';
import Stock from '../pages/Stock';
import StockItemDetailsPage from '../pages/StockItemDetailsPage';
import StockAdjustments from '../pages/StockAdjustments';
import StockTransfers from '../pages/StockTransfers';
import Purchases from "../pages/PurchaseListPage";
import NewPurchase from "../pages/PurchaseFormPage";
import PurchaseDetailsPage from "../pages/PurchaseDetailsPage";
import SuppliersPage from "../pages/SuppliersPage";
import SupplierViewPage from "../pages/SupplierViewPage";
import SupplierFormPage from "../pages/SupplierFormPage";
import Reports from '../pages/Reports';
import Branches from "../pages/Branches";
import ReceiptSettingsPage from '../pages/ReceiptSettingsPage';
import Users from '../pages/Users';
import SubscriptionPage from '../pages/SubscriptionPage';
import VersionHistoryPage from '../pages/VersionHistoryPage';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={<Register />} />

      <Route path="/pricing" element={
        <ProtectedRoute requiresOnline>
          <SubscriptionPage />
        </ProtectedRoute>
      } />

      <Route path="/" element={
        <ProtectedRoute>
          <BranchProvider>
            <ShiftProvider>
              <Layout />
            </ShiftProvider>
          </BranchProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route path="dashboard" element={<ProtectedRoute permission="VIEW_DASHBOARD" requiresOnline><Dashboard /></ProtectedRoute>} />
        
        <Route path="pos" element={<ProtectedRoute permission="ACCESS_POS"><POS /></ProtectedRoute>} />
        <Route path="offline-sales" element={<ProtectedRoute permission="ACCESS_POS"><OfflineSalesPage /></ProtectedRoute>} />
        
        <Route path="sales" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline><SalesListPage /></ProtectedRoute>} />
        <Route path="sales/:id" element={<ProtectedRoute permission="VIEW_SALES" requiresOnline><SalesDetailsPage /></ProtectedRoute>} />
        
        <Route path="items" element={<ProtectedRoute permission="VIEW_ITEMS" requiresOnline><ItemsPage /></ProtectedRoute>} />
        <Route path="items/new" element={<ProtectedRoute permission="MANAGE_ITEMS" requiresOnline><ItemFormPage mode="create" /></ProtectedRoute>} />
        <Route path="items/:id/edit" element={<ProtectedRoute permission="MANAGE_ITEMS" requiresOnline><ItemFormPage mode="edit" /></ProtectedRoute>} />
        <Route path="items/bulk-add" element={<ProtectedRoute permission="MANAGE_ITEMS" feature="BULK_ITEMS" requiresOnline><BulkAddItems /></ProtectedRoute>} />
        <Route path="items/print-barcodes" element={<ProtectedRoute permission="VIEW_ITEMS" feature="BARCODE_PRINT" requiresOnline><BarcodePrintPage /></ProtectedRoute>} />
        
        <Route path="customers" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline><Customers /></ProtectedRoute>} />
        <Route path="customers/new" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline><CustomerFormPage mode="create" /></ProtectedRoute>} />
        <Route path="customers/:id/edit" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline><CustomerFormPage mode="edit" /></ProtectedRoute>} />
        <Route path="customers/:id" element={<ProtectedRoute permission="MANAGE_CUSTOMERS" requiresOnline><CustomerViewPage /></ProtectedRoute>} />
        
        <Route path="shifts" element={<ProtectedRoute permission="MANAGE_SHIFTS" requiresOnline><Shifts /></ProtectedRoute>} />
        <Route path="shifts/history" element={<ProtectedRoute permission="MANAGE_SHIFTS_HISTORY" feature="SHIFT_HISTORY" requiresOnline><ShiftHistory /></ProtectedRoute>} />
        <Route path="shifts/history/:id" element={<ProtectedRoute permission="MANAGE_SHIFTS_HISTORY" feature="SHIFT_HISTORY" requiresOnline><ShiftDetailsPage /></ProtectedRoute>} />
        
        <Route path="expenses" element={<ProtectedRoute permission="RECORD_EXPENSES" feature="FINANCIALS" requiresOnline><Expenses /></ProtectedRoute>} />
        <Route path="cash-drops" element={<ProtectedRoute permission="RECORD_EXPENSES" feature="FINANCIALS" requiresOnline><CashDrops /></ProtectedRoute>} />
        
        <Route path="stock" element={<ProtectedRoute permission="VIEW_STOCK" feature="STOCK_LEVELS" requiresOnline><Stock /></ProtectedRoute>} />
        <Route path="stock/item/:id" element={<ProtectedRoute permission="VIEW_STOCK" feature="STOCK_LEVELS" requiresOnline><StockItemDetailsPage /></ProtectedRoute>} />
        <Route path="stock/adjustments" element={<ProtectedRoute permission="ADJUST_STOCK" feature="STOCK_LEVELS" requiresOnline><StockAdjustments /></ProtectedRoute>} />
        <Route path="stock/transfers" element={<ProtectedRoute permission="TRANSFER_STOCK" feature="STOCK_TRANSFERS" requiresOnline><StockTransfers /></ProtectedRoute>} />
        
        <Route path="purchases" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline><Purchases /></ProtectedRoute>} />
        <Route path="purchases/new" element={<ProtectedRoute permission="NEW_PURCHASE" feature="PURCHASES" requiresOnline><NewPurchase /></ProtectedRoute>} />
        <Route path="purchases/:id" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline><PurchaseDetailsPage /></ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline><SuppliersPage /></ProtectedRoute>} />
        <Route path="suppliers/new" element={<ProtectedRoute permission="NEW_PURCHASE" feature="PURCHASES" requiresOnline><SupplierFormPage /></ProtectedRoute>} />
        <Route path="suppliers/:id" element={<ProtectedRoute permission="VIEW_PURCHASES" feature="PURCHASES" requiresOnline><SupplierViewPage /></ProtectedRoute>} />

        <Route path="reports" element={<ProtectedRoute permission="VIEW_REPORTS" feature="ADVANCED_REPORTS" requiresOnline><Reports /></ProtectedRoute>} />
        <Route path="branches" element={<ProtectedRoute permission="MANAGE_BRANCHES" requiresOnline><Branches /></ProtectedRoute>} />
        <Route path="receipt-settings" element={<ProtectedRoute permission="MANAGE_BRANCHES" requiresOnline><ReceiptSettingsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute permission="MANAGE_USERS" feature="USER_MANAGEMENT" requiresOnline><Users /></ProtectedRoute>} />
        <Route path="version-history" element={<VersionHistoryPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
