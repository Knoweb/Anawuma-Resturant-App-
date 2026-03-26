import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient, { BASE_URL, sanitizeUrl } from '../api/apiClient';
import Swal from 'sweetalert2';
import SuperAdminDashboard from './SuperAdminDashboard';
import './RestaurantProfile.css';

const PACKAGE_NAMES = {
  1: 'Basic',
  2: 'Standard',
  3: 'Premium',
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const EditIcon = ({ onClick, title }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.8} 
    stroke="currentColor" 
    className="rp-edit-icon"
    onClick={onClick}
    title={title}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
  </svg>
);

const formatRole = (role) => {
  const labels = {
    admin: 'Admin',
    super_admin: 'Super Admin',
    housekeeper: 'Room Service',
    kitchen: 'Kitchen',
    cashier: 'Cashier',
    accountant: 'Accountant',
    steward: 'Steward',
  };

  return labels[role] || role;
};

const formatStatus = (status) => {
  if (!status) {
    return 'Unknown';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

function RestaurantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasShownNetworkErrorRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch restaurant data
      const restRes = await apiClient.get(`/restaurant/${id}`);
      if (restRes.data.success) {
        hasShownNetworkErrorRef.current = false;
        setRestaurant(restRes.data.data);
      } else {
        Swal.fire('Error!', 'Restaurant not found', 'error');
        setLoading(false);
        return;
      }
    } catch (error) {
      const isBackendUnavailable = !error?.response;

      if (!isBackendUnavailable || !hasShownNetworkErrorRef.current) {
        Swal.fire(
          isBackendUnavailable ? 'Backend unavailable' : 'Error!',
          isBackendUnavailable
            ? 'Backend server is unavailable. Start the Nest backend on port 3000 and refresh this page.'
            : `Failed to load restaurant: ${error.response?.data?.message || error.message}`,
          isBackendUnavailable ? 'warning' : 'error',
        );
      }

      hasShownNetworkErrorRef.current = isBackendUnavailable;
      setLoading(false);
      return;
    }

    try {
      // Fetch admins separately so a failure here doesn't block the page
      const adminRes = await apiClient.get('/auth/admins');
      if (adminRes.data.success) {
        const filtered = adminRes.data.data.filter(
          (a) => a.restaurantId === parseInt(id)
        );
        setAdmins(filtered);
      }
    } catch (error) {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteAdmin = async (adminId) => {
    const result = await Swal.fire({
      title: 'Delete admin?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      await apiClient.delete(`/auth/admins/${adminId}`);
      Swal.fire('Deleted!', 'Admin removed successfully.', 'success');
      fetchData();
    } catch (error) {
      Swal.fire('Error!', error.response?.data?.message || 'Failed to delete admin.', 'error');
    }
  };

  const handleAddRole = async () => {
    if (!restaurant?.restaurantId) return;

    const { value: formValues } = await Swal.fire({
      title: 'Add Role to Hotel',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 5px;">Email</label>
          <input id="swal-input-email" class="swal2-input" placeholder="Email" type="email">
          <label style="display: block; margin-bottom: 5px; margin-top: 15px;">Password</label>
          <input id="swal-input-password" class="swal2-input" placeholder="Password" type="password">
          <select id="swal-input-role" class="swal2-input" style="width: 100%; box-sizing: border-box;">
            <option value="admin">Admin (Hotel Owner)</option>
            ${restaurant.enableSteward ? '<option value="steward">Steward</option>' : ''}
            ${restaurant.enableKds ? '<option value="kitchen">Kitchen</option>' : ''}
            ${restaurant.enableCashier ? '<option value="cashier">Cashier</option>' : ''}
            ${restaurant.enableAccountant ? '<option value="accountant">Accountant</option>' : ''}
            ${restaurant.enableHousekeeping ? '<option value="housekeeper">Room Service Staff</option>' : ''}
          </select>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Add Role',
      preConfirm: () => {
        const email = document.getElementById('swal-input-email').value;
        const password = document.getElementById('swal-input-password').value;
        const role = document.getElementById('swal-input-role').value;

        if (!email || !password || !role) {
          Swal.showValidationMessage('Please fill in all fields');
          return false;
        }

        return { email, password, role };
      }
    });

    if (formValues) {
      try {
        await apiClient.post('/auth/admin/create', {
          ...formValues,
          restaurantId: parseInt(restaurant.restaurantId)
        });
        Swal.fire('Success!', 'Role added successfully.', 'success');
        fetchData();
      } catch (error) {
        Swal.fire('Error!', error.response?.data?.message || 'Failed to add role.', 'error');
      }
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      Swal.fire({
        title: 'Uploading Logo...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const formData = new FormData();
      formData.append('logo', file);

      const uploadRes = await apiClient.post('/restaurant/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data.success) {
        const updateRes = await apiClient.patch(`/restaurant/${id}`, {
          logo: uploadRes.data.logoUrl
        });
        
        if (updateRes.data.success) {
          Swal.fire('Success', 'Hotel logo updated successfully!', 'success');
          fetchData();
        } else {
          Swal.fire('Error', 'Failed to update hotel data', 'error');
        }
      } else {
        Swal.fire('Error', 'Failed to upload logo image', 'error');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Error uploading logo', 'error');
    } finally {
      // Clear input so same file can be selected again if needed
      e.target.value = null;
    }
  };

  const handleEditField = async (field, label, currentValue) => {
    const { value: newValue } = await Swal.fire({
      title: `Edit ${label}`,
      input: 'text',
      inputLabel: `Enter the new ${label}`,
      inputValue: currentValue || '',
      showCancelButton: true,
      confirmButtonColor: '#266668',
      confirmButtonText: 'Save Changes',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return `${label} cannot be empty!`;
        }
      }
    });

    if (newValue && newValue.trim() !== currentValue) {
      try {
        Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const updateRes = await apiClient.patch(`/restaurant/${id}`, {
          [field]: newValue.trim()
        });
        
        if (updateRes.data.success) {
          Swal.fire('Success', `${label} updated successfully!`, 'success');
          fetchData();
        } else {
          Swal.fire('Error', `Failed to update ${label}`, 'error');
        }
      } catch (error) {
        console.error('Update error:', error);
        Swal.fire('Error', error.response?.data?.message || `Error updating ${label}`, 'error');
      }
    }
  };

  if (loading) {
    return (
      <SuperAdminDashboard>
        <div className="rp-loading">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </SuperAdminDashboard>
    );
  }

  if (!restaurant) {
    return (
      <SuperAdminDashboard>
        <div className="rp-loading">Restaurant not found.</div>
      </SuperAdminDashboard>
    );
  }

  const logoUrl = restaurant.logo
    ? sanitizeUrl(restaurant.logo.startsWith('http')
      ? restaurant.logo
      : `${BASE_URL}${restaurant.logo.startsWith('/') ? '' : '/'}${restaurant.logo}`)
    : null;

  const expiryDate = restaurant.subscriptionExpiryDate
    ? new Date(restaurant.subscriptionExpiryDate)
    : null;
  const daysRemaining = expiryDate
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / MS_PER_DAY))
    : null;
  const isTrialAccess =
    restaurant.subscriptionStatus === 'active' &&
    !restaurant.packageId &&
    daysRemaining !== null &&
    daysRemaining > 0 &&
    daysRemaining <= 30;
  const packageName = restaurant.packageId
    ? PACKAGE_NAMES[restaurant.packageId] || `Package #${restaurant.packageId}`
    : isTrialAccess
      ? 'Premium'
      : 'Not assigned';
  const countryName = restaurant.countryId
    ? `Country #${restaurant.countryId}`
    : 'Unknown Country';
  const currencyName = restaurant.currencyId
    ? `Currency #${restaurant.currencyId}`
    : 'Unknown Currency';
  const subscriptionLabel = isTrialAccess
    ? 'Trial'
    : formatStatus(restaurant.subscriptionStatus);
  const subscriptionVariant = isTrialAccess
    ? 'trial'
    : restaurant.subscriptionStatus === 'active'
      ? 'active'
      : 'inactive';

  const privileges = [
    'QR Menu System',
    restaurant.enableHousekeeping && 'Room Order System',
    restaurant.enableKds && 'Kitchen Display System',
    restaurant.enableReports && 'Reports & Analytics',
    restaurant.enableAccountant && 'Accountant Management',
    restaurant.enableCashier && 'Cashier Management',
    'Special Offers',
  ].filter(Boolean);

  return (
    <SuperAdminDashboard>
      <div className="rp-shell">
        <div className="mb-4">
          <button 
            type="button"
            onClick={() => navigate('/super-admin/manage-restaurants')}
            className="rp-back-btn" 
          >
            <i className="fas fa-arrow-left"></i> Back to Hotel List
          </button>
        </div>
        {isTrialAccess && (
          <section className="rp-trial-banner">
            <div className="rp-trial-copy">
              <h2 className="rp-trial-title">
                <i className="fas fa-star"></i>
                30 days Free Trial
              </h2>
              <p className="rp-trial-text">
                You are currently using our free trial. Enjoy all features for {daysRemaining} more day{daysRemaining === 1 ? '' : 's'}!
              </p>
              <div className="rp-trial-countdown">
                <i className="fas fa-clock"></i>
                {daysRemaining} days remaining
              </div>
            </div>
            <div className="rp-trial-action">
              <p>Upgrade now to continue using the service without interruption after the trial ends.</p>
              <button
                type="button"
                className="rp-upgrade-btn"
                onClick={() => navigate('/super-admin/manage-restaurants')}
              >
                Manage Hotels
              </button>
            </div>
          </section>
        )}

        <div className="rp-layout">
          <aside className="rp-left-card">
            <div className="rp-avatar-wrap" style={{ position: 'relative', display: 'inline-block' }}>
              <label htmlFor="logo-upload" style={{ cursor: 'pointer', display: 'block', margin: 0 }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" className="rp-avatar" />
                ) : (
                  <div className="rp-avatar-placeholder">
                    <i className="fas fa-hotel"></i>
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#266668', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', transition: 'background 0.2s', border: '2px solid #fff' }} title="Change Logo">
                  <i className="fas fa-camera"></i>
                </div>
              </label>
              <input type="file" id="logo-upload" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            </div>
            <div className="rp-identity">
              <h1 className="rp-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {restaurant.restaurantName}
                <EditIcon 
                  onClick={() => handleEditField('restaurantName', 'Hotel Name', restaurant.restaurantName)}
                  title="Edit Hotel Name"
                />
              </h1>
              <p className="rp-address">{restaurant.address}</p>
            </div>

            <div className="rp-privilege-card">
              <h5 className="rp-section-title">Privileges</h5>
              <div className="rp-privilege-list">
                {privileges.map((privilege) => (
                  <div key={privilege} className="rp-privilege-item">{privilege}</div>
                ))}
              </div>
            </div>
          </aside>

          <section className="rp-right-card">
            <div className="rp-detail-list">
              <div className="rp-detail-row">
                <div className="rp-detail-label">Restaurant Name</div>
                <div className="rp-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {restaurant.restaurantName}
                  <EditIcon 
                    onClick={() => handleEditField('restaurantName', 'Hotel Name', restaurant.restaurantName)}
                    title="Edit Name"
                  />
                </div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Email</div>
                <div className="rp-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {restaurant.email}
                  <EditIcon 
                    onClick={() => handleEditField('email', 'Email Address', restaurant.email)}
                    title="Edit Email"
                  />
                </div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Contact Number</div>
                <div className="rp-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {restaurant.contactNumber}
                  <EditIcon 
                    onClick={() => handleEditField('contactNumber', 'Contact Number', restaurant.contactNumber)}
                    title="Edit Contact Number"
                  />
                </div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Country</div>
                <div className="rp-detail-value">{countryName}</div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Currency</div>
                <div className="rp-detail-value">{currencyName}</div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Address</div>
                <div className="rp-detail-value">{restaurant.address}</div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Subscription Status</div>
                <div className="rp-detail-value">
                  <span className={`rp-status-badge rp-status-${subscriptionVariant}`}>
                    {subscriptionLabel}
                  </span>
                </div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Subscription Expiry</div>
                <div className="rp-detail-value">
                  {expiryDate ? expiryDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : 'Not set'}
                </div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Package</div>
                <div className="rp-detail-value">{packageName}</div>
              </div>

              <div className="rp-detail-row">
                <div className="rp-detail-label">Opening Time</div>
                <div className="rp-detail-value">{restaurant.openingTime}</div>
              </div>
              <div className="rp-detail-row">
                <div className="rp-detail-label">Closing Time</div>
                <div className="rp-detail-value">{restaurant.closingTime}</div>
              </div>
            </div>

            <div className="rp-admin-section">
              <div className="rp-admins-header">
                <h5 className="rp-section-title">Admins</h5>
                <div className="rp-admin-buttons">
                  <button
                    type="button"
                    className="rp-action-btn rp-action-btn-primary"
                    onClick={handleAddRole}
                  >
                    Add Role
                  </button>
                </div>
              </div>

              {admins.length === 0 ? (
                <p className="rp-empty-state">No admins found for this restaurant.</p>
              ) : (
                <table className="rp-admins-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.adminId}>
                        <td>{admin.email}</td>
                        <td>{formatRole(admin.role)}</td>
                        <td>
                          <button
                            className="rp-btn-delete"
                            onClick={() => handleDeleteAdmin(admin.adminId)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </SuperAdminDashboard>
  );
}

export default RestaurantProfile;
