import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function RoleBasedRedirect() {
  const { user, token, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // Normalize role for comparison
  const role = user?.role?.toString().trim().toLowerCase();
  
  // Super Admin → Super Admin Dashboard
  if (role === 'super_admin' || role === 'superadmin') {
    return <Navigate to="/super-admin/manage-restaurants" replace />;
  }

  if (role === 'kitchen') {
    return <Navigate to="/kitchen/dashboard" replace />;
  }

  if (role === 'cashier') {
    return <Navigate to="/cashier/dashboard/queue" replace />;
  }

  if (role === 'accountant') {
    return <Navigate to="/accountant/dashboard" replace />;
  }
  
  // All other roles → Restaurant Dashboard
  return <Navigate to="/dashboard" replace />;
}

export default RoleBasedRedirect;
