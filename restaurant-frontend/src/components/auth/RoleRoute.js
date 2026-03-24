import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * RoleRoute - Protects routes based on user roles
 * 
 * Usage:
 * <RoleRoute allowedRoles={['admin', 'super_admin']}>
 *   <AdminPage />
 * </RoleRoute>
 */
function RoleRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, token } = useAuthStore();

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize role for comparison
  const userRole = user?.role?.toString().trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(role => role.toString().trim().toLowerCase());

  // Check if user's role is in the allowed roles list
  if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
    if (userRole === 'super_admin' || userRole === 'superadmin') {
      return <Navigate to="/super-admin/manage-restaurants" replace />;
    }

    if (userRole === 'kitchen') {
      return <Navigate to="/kitchen/dashboard" replace />;
    }

    if (userRole === 'cashier') {
      return <Navigate to="/cashier/dashboard/queue" replace />;
    }

    if (userRole === 'accountant') {
      return <Navigate to="/accountant/dashboard" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default RoleRoute;
