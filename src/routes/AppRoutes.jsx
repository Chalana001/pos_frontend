import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/layout/Layout';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import POS from '../pages/POS';
import Items from '../pages/Items';
import Customers from '../pages/Customers';
import Shifts from '../pages/Shifts';
import Expenses from '../pages/Expenses';
import CashDrops from '../pages/CashDrops';
import Stock from '../pages/Stock';
import StockAdjustments from '../pages/StockAdjustments';
import StockTransfers from '../pages/StockTransfers';
import Reports from '../pages/Reports';
import Charts from '../pages/Charts';
import Users from '../pages/Users';
import Branches from "../pages/Branches";

import ItemsPage from "../pages/ItemsPage";
import ItemFormPage from "../pages/ItemFormPage";
import CustomerFormPage from "../pages/CustomerFormPage";
import CustomerViewPage from "../pages/CustomerViewPage";

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
        
        <Route path="dashboard" element={
          <ProtectedRoute permission="VIEW_DASHBOARD">
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="pos" element={
          <ProtectedRoute permission="ACCESS_POS">
            <POS />
          </ProtectedRoute>
        } />

        <Route path="items" element={
          <ProtectedRoute permission="VIEW_ITEMS">
            <ItemsPage />
          </ProtectedRoute>
        } />
        <Route path="/items/new" element={
          <ProtectedRoute permission="VIEW_ITEMS">
            <ItemFormPage mode="create" />
          </ProtectedRoute>
        } />
        <Route path="/items/:id/edit" element={
          <ProtectedRoute permission="VIEW_ITEMS">
            <ItemFormPage mode="edit" />
          </ProtectedRoute>
        } />

        <Route path="customers" element={
          <ProtectedRoute permission="MANAGE_CUSTOMERS">
            <Customers />
          </ProtectedRoute>
        } />

        <Route path="/customers/new" element={
          <ProtectedRoute permission="MANAGE_CUSTOMERS">
            <CustomerFormPage mode="create"  />
          </ProtectedRoute>
        } />

        <Route path="/customers/:id/edit" element={
          <ProtectedRoute permission="MANAGE_CUSTOMERS">
            <CustomerFormPage mode="edit" />
          </ProtectedRoute>
        } />

        <Route path="/customers/:id" element={
          <ProtectedRoute permission="MANAGE_CUSTOMERS">
            <CustomerViewPage />
          </ProtectedRoute>
        } />

        <Route path="shifts" element={
          <ProtectedRoute permission="MANAGE_SHIFTS">
            <Shifts />
          </ProtectedRoute>
        } />

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

        <Route path="stock" element={
          <ProtectedRoute permission="VIEW_STOCK">
            <Stock />
          </ProtectedRoute>
        } />

        <Route path="stock-adjustments" element={
          <ProtectedRoute permission="ADJUST_STOCK">
            <StockAdjustments />
          </ProtectedRoute>
        } />

        <Route path="stock-transfers" element={
          <ProtectedRoute permission="TRANSFER_STOCK">
            <StockTransfers />
          </ProtectedRoute>
        } />

        <Route path="reports" element={
          <ProtectedRoute permission="VIEW_REPORTS">
            <Reports />
          </ProtectedRoute>
        } />

        <Route path="charts" element={
          <ProtectedRoute permission="VIEW_REPORTS">
            <Charts />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;