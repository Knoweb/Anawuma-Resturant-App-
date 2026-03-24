import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Swal from 'sweetalert2';
import { useNotification } from '../components/common/NotificationToast';
import { useWebSocket } from '../hooks/useWebSocket';
import './RestaurantSettings.css';

function RestaurantSettings() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { addNotification } = useNotification();
  const { subscribe } = useWebSocket();

  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // The actual committed settings stored in DB
  const [savedSettings, setSavedSettings] = useState({
    enableHousekeeping: false,
    enableKds: false,
    enableReports: false,
    enableAccountant: false,
    enableCashier: false,
  });

  // Admin's locally desired changes (starts as copy of savedSettings)
  const [localChanges, setLocalChanges] = useState({
    enableHousekeeping: false,
    enableKds: false,
    enableReports: false,
    enableAccountant: false,
    enableCashier: false,
  });

  // Current pending settings-request (if any)
  const [pendingRequest, setPendingRequest] = useState(null);

  // Optional reason for admin change requests
  const [requestReason, setRequestReason] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      navigate('/dashboard');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  // WebSocket: listen for super admin's approval/rejection (admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = subscribe('settings-request:reviewed', (data) => {
      if (data.restaurantId !== user?.restaurantId) return;

      if (data.status === 'APPROVED') {
        // Re-fetch the fresh settings from DB to get the approved values
        fetchSettings().then((fresh) => {
          if (fresh) {
            setSavedSettings(fresh);
            setLocalChanges({ ...fresh });
            // Keep the global auth store in sync so Sidebar and FeatureRoute
            // immediately reflect the new (possibly disabled) feature flags
            updateUser({ restaurantSettings: fresh });
          }
        });
        setPendingRequest(null);
        addNotification({
          type: 'success',
          title: 'Settings Approved',
          message: 'Your settings change request has been approved and applied!',
          duration: 6000,
        });
      } else if (data.status === 'REJECTED') {
        setPendingRequest(null);
        // Reset local changes back to current saved settings
        setSavedSettings((prev) => {
          setLocalChanges({ ...prev });
          return prev;
        });
        addNotification({
          type: 'error',
          title: 'Settings Rejected',
          message: data.reviewNotes
            ? `Your request was rejected: ${data.reviewNotes}`
            : 'Your settings change request was rejected by the super admin.',
          duration: 8000,
        });
      }
    });

    return unsubscribe;
  }, [subscribe, user, isAdmin, addNotification]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fresh = await fetchSettings();
      if (fresh) {
        setSavedSettings(fresh);
        setLocalChanges({ ...fresh });
      }
      if (isAdmin) {
        await fetchPendingRequest();
      }
    } finally {
      setLoading(false);
    }
  };

  // Returns formatted settings or null on error
  const fetchSettings = useCallback(async () => {
    try {
      const response = await apiClient.get('/restaurant/settings');
      if (response.data.success) {
        const d = response.data.data;
        return {
          enableHousekeeping: Boolean(d.enableHousekeeping),
          enableKds: Boolean(d.enableKds),
          enableReports: Boolean(d.enableReports),
          enableAccountant: Boolean(d.enableAccountant),
          enableCashier: Boolean(d.enableCashier),
        };
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load restaurant settings',
        duration: 5000,
      });
    }
    return null;
  }, [addNotification]);

  const fetchPendingRequest = useCallback(async () => {
    try {
      const response = await apiClient.get('/settings-requests');
      if (response.data.success) {
        const pending = response.data.data.find((r) => r.status === 'PENDING');
        setPendingRequest(pending || null);
      }
    } catch (error) {
      console.error('Error fetching pending request:', error);
    }
  }, []);

  // Only allow toggling when there is no pending request
  const handleToggle = (field) => {
    if (pendingRequest) return;
    setLocalChanges((prev) => ({
      ...prev,
      [field]: !Boolean(prev[field]),
    }));
  };

  const hasUnsavedChanges = () =>
    Object.keys(savedSettings).some(
      (key) => Boolean(localChanges[key]) !== Boolean(savedSettings[key]),
    );

  const isFieldPending = (field) =>
    pendingRequest?.requestedChanges?.[field] !== undefined;

  const getPendingValueFor = (field) => {
    const val = pendingRequest?.requestedChanges?.[field];
    return Boolean(val) ? 'Enabled' : 'Disabled';
  };

  // Admin: submit a change request. Super admin: save directly.
  const handleSave = async () => {
    try {
      setSaving(true);

      if (isAdmin) {
        const payload = {
          enableHousekeeping: Boolean(localChanges.enableHousekeeping),
          enableKds: Boolean(localChanges.enableKds),
          enableReports: Boolean(localChanges.enableReports),
          enableAccountant: Boolean(localChanges.enableAccountant),
          enableCashier: Boolean(localChanges.enableCashier),
        };
        if (requestReason.trim()) {
          payload.requestReason = requestReason.trim();
        }

        const response = await apiClient.post('/settings-requests', payload);
        if (response.data.success) {
          addNotification({
            type: 'info',
            title: 'Request Submitted',
            message:
              response.data.message ||
              'Your settings change request has been submitted. Waiting for super admin approval.',
            duration: 7000,
          });
          setRequestReason('');
          // Reset local changes back to saved (request is now pending)
          setLocalChanges({ ...savedSettings });
          await fetchPendingRequest();
        }
      } else {
        // Super admin: direct update
        const payload = {
          enableHousekeeping: Boolean(localChanges.enableHousekeeping),
          enableKds: Boolean(localChanges.enableKds),
          enableReports: Boolean(localChanges.enableReports),
          enableAccountant: Boolean(localChanges.enableAccountant),
          enableCashier: Boolean(localChanges.enableCashier),
        };

        const response = await apiClient.patch('/restaurant/settings', payload);
        if (response.data.success) {
          // Await Swal before updating state (fixes race with reload)
          await Swal.fire({
            icon: 'success',
            title: 'Success',
            text: response.data.message || 'Settings updated successfully',
            timer: 2000,
            timerProgressBar: true,
          });
          const fresh = await fetchSettings();
          if (fresh) {
            setSavedSettings(fresh);
            setLocalChanges({ ...fresh });
          }
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update settings',
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Sidebar />
        <div className="content-wrapper">
        <Navbar />
        <div className="loading-container">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const modules = [
    {
      key: 'enableHousekeeping',
      icon: 'fas fa-broom',
      iconClass: 'housekeeping',
      title: 'Housekeeping Module',
      description:
        'Enable Housekeeping management for hotels. Track cleaning tasks, room status, and staff assignments.',
    },
    {
      key: 'enableKds',
      icon: 'fas fa-fire',
      iconClass: 'kds',
      title: 'Kitchen Display System (KDS)',
      description:
        'Enable Kitchen Display System for real-time order tracking and kitchen workflow management.',
    },
    {
      key: 'enableReports',
      icon: 'fas fa-chart-bar',
      iconClass: 'reports',
      title: 'Reports Module',
      description:
        'Enable reporting features including daily, monthly, and sales reports with analytics.',
    },
    {
      key: 'enableAccountant',
      icon: 'fas fa-calculator',
      iconClass: 'accountant',
      title: 'Accountant Management',
      description:
        'Enable the Accountant module for managing transfers, expenses, and financial monitoring.',
    },
    {
      key: 'enableCashier',
      icon: 'fas fa-cash-register',
      iconClass: 'cashier',
      title: 'Cashier Management',
      description:
        'Enable the Cashier module for order queue management, billing, and accountant transfers.',
    },
  ];

  return (
    <div className="page-wrapper">
      <Sidebar />
      <div className="content-wrapper">
        <Navbar />
        <div className="restaurant-settings-container">
          <div className="page-header">
            <h1>
              <i className="fas fa-cog me-2"></i>
              Restaurant Settings
            </h1>
            <p className="text-muted">
              Configure optional modules and features for your restaurant
            </p>
          </div>

          {/* Pending request banner for admin */}
          {isAdmin && pendingRequest && (
            <div className="pending-banner">
              <i className="fas fa-clock me-2"></i>
              <strong>Pending Approval:</strong> You have a settings change request awaiting
              super admin review. Toggles are locked until it is resolved.
            </div>
          )}

          <div className="settings-card">
            <h2 className="settings-title">
              <i className="fas fa-puzzle-piece me-2"></i>
              Module Configuration
            </h2>
            <p className="settings-description">
              {isAdmin
                ? 'Enable or disable modules based on your restaurant\'s needs. Changes require super admin approval before taking effect.'
                : 'Enable or disable modules based on your restaurant\'s needs. Changes take effect immediately.'}
            </p>

            <div className="settings-list">
              {modules.map(({ key, icon, iconClass, title, description }) => {
                const isPending = isFieldPending(key);
                const currentValue = Boolean(localChanges[key]);

                return (
                  <div
                    key={key}
                    className={`setting-item${isPending ? ' has-pending' : ''}`}
                  >
                    <div className="setting-info">
                      <div className="setting-header">
                        <i className={`${icon} setting-icon ${iconClass}`}></i>
                        <div>
                          <h3>{title}</h3>
                          <p>{description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="setting-toggle">
                      <label className={`switch${isAdmin && pendingRequest ? ' switch-locked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={currentValue}
                          onChange={() => handleToggle(key)}
                          disabled={isAdmin && !!pendingRequest}
                        />
                        <span className="slider"></span>
                      </label>
                      <div className="badge-group">
                        <span
                          className={`status-badge ${currentValue ? 'active' : 'inactive'}`}
                        >
                          {currentValue ? 'Enabled' : 'Disabled'}
                        </span>
                        {isPending && (
                          <span className="status-badge pending">
                            <i className="fas fa-clock me-1"></i>
                            &rarr; {getPendingValueFor(key)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reason textarea — only shown for admin when no pending request */}
            {isAdmin && !pendingRequest && (
              <div className="request-reason-section">
                <label htmlFor="requestReason" className="reason-label">
                  Reason for change <span className="optional-label">(optional)</span>
                </label>
                <textarea
                  id="requestReason"
                  className="reason-textarea"
                  rows={3}
                  placeholder="Briefly describe why you want to change these settings…"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                />
              </div>
            )}

            <div className="settings-actions">
              {isAdmin && pendingRequest ? (
                <span className="pending-action-label">
                  <i className="fas fa-hourglass-half me-2"></i>
                  Awaiting super admin approval…
                </span>
              ) : (
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges()}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      {isAdmin ? 'Submitting...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <i className={`fas ${isAdmin ? 'fa-paper-plane' : 'fa-save'} me-2`}></i>
                      {isAdmin ? 'Request Change' : 'Save Settings'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestaurantSettings;
