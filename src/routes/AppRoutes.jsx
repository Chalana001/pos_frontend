// src/routes/AppRoutes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/layout/Layout';

// Pages - Auth & Core
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import POS from '../pages/POS';

// Pages - Sales
import SalesListPage from '../pages/SalesListPage';
import SalesDetailsPage from '../pages/SalesDetailsPage';

// Pages - Items
import ItemsPage from "../pages/ItemsPage";
import ItemFormPage from "../pages/ItemFormPage";
import BulkAddItems from "../pages/BulkAddItems";
import BarcodePrintPage from "../pages/BarcodePrintPage";

// Pages - Customers
import Customers from '../pages/Customers';
import CustomerFormPage from "../pages/CustomerFormPage";
import CustomerViewPage from "../pages/CustomerViewPage";

// Pages - Shifts & Finance
import Shifts from '../pages/Shifts';
import ShiftHistory from '../pages/ShiftHistory';
import Expenses from '../pages/Expenses';
import CashDrops from '../pages/CashDrops';

// Pages - Stock
import Stock from '../pages/Stock';
import StockAdjustments from '../pages/StockAdjustments';
import StockTransfers from '../pages/StockTransfers';

// Pages - Purchases
import Purchases from "../pages/PurchaseListPage";
import NewPurchase from "../pages/PurchaseFormPage";
import PurchaseDetailsPage from "../pages/PurchaseDetailsPage";

// Pages - Admin & Reports
import Reports from '../pages/Reports';
import Branches from "../pages/Branches";
import Users from '../pages/Users';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* --- Dashboard --- */}
        <Route path="dashboard" element={
          <ProtectedRoute permission="VIEW_DASHBOARD">
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* --- POS --- */}
        <Route path="pos" element={
          <ProtectedRoute permission="ACCESS_POS">
            <POS />
          </ProtectedRoute>
        } />

        {/* --- Sales (New) --- */}
        <Route path="sales" element={
          <ProtectedRoute permission="VIEW_SALES">
            <SalesListPage />
          </ProtectedRoute>
        } />
        <Route path="sales/:id" element={
          <ProtectedRoute permission="VIEW_SALES">
            <SalesDetailsPage />
          </ProtectedRoute>
        } />

        {/* --- Items --- */}
        <Route path="items" element={
          <ProtectedRoute permission="VIEW_ITEMS">
            <ItemsPage />
          </ProtectedRoute>
        } />
        <Route path="items/new" element={
          <ProtectedRoute permission="MANAGE_ITEMS"> {/* නිවැරදි කළා */}
            <ItemFormPage mode="create" />
          </ProtectedRoute>
        } />
        <Route path="items/:id/edit" element={
          <ProtectedRoute permission="MANAGE_ITEMS"> {/* නිවැරදි කළා */}
            <ItemFormPage mode="edit" />
          </ProtectedRoute>
        } />
        <Route path="items/bulk-add" element={
          <ProtectedRoute permission="MANAGE_ITEMS"> {/* නිවැරදි කළා */}
            <BulkAddItems />
          </ProtectedRoute>
        } />
        <Route path="items/print-barcodes" element={
          <ProtectedRoute permission="VIEW_ITEMS">
            <BarcodePrintPage />
          </ProtectedRoute>
        } />

        {/* --- Customers --- */}
        <Route path="customers" element={
          <ProtectedRoute permission="MANAGE_CUSTOMERS">
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="customers/new" element={
          <ProtectedRoute permission="MANAGE_CUSTOMERS">
            <CustomerFormPage mode="create"  />
          </ProtectedRoute>
        } />
        <Route path="customers/:id/edit" element={
          <ProtectedRoute permission="MANAGE_CUSTOMERS">
            <CustomerFormPage mode="edit" />
          </ProtectedRoute>
        } />
        <Route path="customers/:id" element={
          <ProtectedRoute permission="MANAGE_CUSTOMERS">
            <CustomerViewPage />
          </ProtectedRoute>
        } />

        {/* --- Shifts --- */}
        <Route path="shifts" element={
          <ProtectedRoute permission="MANAGE_SHIFTS">
            <Shifts />
          </ProtectedRoute>
        } />
        <Route path="shifts/history" element={
          <ProtectedRoute permission="MANAGE_SHIFTS_HISTORY">
            <ShiftHistory />
          </ProtectedRoute>
        } />

        {/* --- Finance --- */}
        <Route path="expenses" element={
          <ProtectedRoute permission="RECORD_EXPENSES">
            <Expenses />
          </ProtectedRoute>
        } />
        <Route path="cash-drops" element={
          <ProtectedRoute permission="RECORD_EXPENSES">
            <CashDrops />
          </ProtectedRoute>
        } />

        {/* --- Stock --- */}
        <Route path="stock" element={
          <ProtectedRoute permission="VIEW_STOCK">
            <Stock />
          </ProtectedRoute>
        } />
        <Route path="stock/adjustments" element={
          <ProtectedRoute permission="ADJUST_STOCK">
            <StockAdjustments />
          </ProtectedRoute>
        } />
        <Route path="stock/transfers" element={
          <ProtectedRoute permission="TRANSFER_STOCK">
            <StockTransfers />
          </ProtectedRoute>
        } />
        {/* අතිරික්ත StockTransfers route එක අයින් කළා */}

        {/* --- Purchases --- */}
        <Route path="purchases" element={
          <ProtectedRoute permission="VIEW_PURCHASES"> {/* නිවැරදි කළා (කලින් NEW_PURCHASE තිබුණේ) */}
            <Purchases />
          </ProtectedRoute>
        } />
        <Route path="purchases/new" element={
          <ProtectedRoute permission="NEW_PURCHASE">
            <NewPurchase />
          </ProtectedRoute>
        } />
        <Route path="purchases/:id" element={
          <ProtectedRoute permission="VIEW_PURCHASES"> {/* නිවැරදි කළා (කලින් NEW_PURCHASE තිබුණේ) */}
            <PurchaseDetailsPage />
          </ProtectedRoute>
        } />

        {/* --- Admin & Settings --- */}
        <Route path="reports" element={
          <ProtectedRoute permission="VIEW_REPORTS">
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="branches" element={
          <ProtectedRoute permission="MANAGE_BRANCHES">
            <Branches />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute permission="MANAGE_USERS">
            <Users />
          </ProtectedRoute>
        } />

      </Route>

      {/* Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;