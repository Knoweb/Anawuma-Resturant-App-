import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function PrivateRoute({ children }) {
  const { user, token, isAuthenticated } = useAuthStore();

  // Check ALL auth requirements
  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
