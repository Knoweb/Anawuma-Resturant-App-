import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

function FeatureRoute({ children, requiredFeature }) {
  const { user } = useAuthStore();

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const restaurantSettings = user.restaurantSettings || {};

  // Check if the required feature is enabled
  let isFeatureEnabled = true;
  
  if (requiredFeature) {
    switch (requiredFeature) {
      case 'HOUSEKEEPING':
        isFeatureEnabled = restaurantSettings.enableHousekeeping == null || Boolean(restaurantSettings.enableHousekeeping);
        break;
      case 'KDS':
        isFeatureEnabled = restaurantSettings.enableKds == null || Boolean(restaurantSettings.enableKds);
        break;
      case 'REPORTS':
        isFeatureEnabled = restaurantSettings.enableReports == null || Boolean(restaurantSettings.enableReports);
        break;
      default:
        isFeatureEnabled = true;
    }
  }

  // If feature is disabled, show error message or redirect
  if (!isFeatureEnabled) {
    return (
      <div className="page-wrapper">
        <div className="content-wrapper d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <div className="mb-4">
              <i className="fas fa-ban text-danger" style={{ fontSize: '5rem' }}></i>
            </div>
            <h2 className="mb-3">Feature Disabled</h2>
            <p className="text-muted mb-4">
              The {requiredFeature} module has been disabled by your restaurant administrator.
            </p>
            <a href="/dashboard" className="btn btn-primary">
              <i className="fas fa-home me-2"></i>
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default FeatureRoute;
