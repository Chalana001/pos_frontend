import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { hasPlanFeature } from '../utils/subscriptionFeatures';

const ProtectedRoute = ({ children, permission, feature }) => {
  const { user, isAuthenticated, loading, planLoading } = useAuth();

  if (loading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(user.role, permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Access Denied</h1>
          <p className="text-slate-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (feature && !hasPlanFeature(user?.planName, feature)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Package Restricted</h1>
          <p className="text-slate-600">Your current package does not include this feature.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
