import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { BASE_URL, sanitizeUrl } from '../api/apiClient';
import Swal from 'sweetalert2';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import './RestaurantProfile.css';

const PACKAGE_NAMES = {
  1: 'Basic',
  2: 'Standard',
  3: 'Premium',
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const formatRole = (role) => {
  const labels = {
    admin: 'Admin',
    super_admin: 'Super Admin',
    housekeeper: 'Housekeeper',
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

function AdminHotelProfile() {
  const { user } = useAuthStore();
  const id = user?.restaurantId;
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasShownNetworkErrorRef = useRef(false);
  const { subscribe, connected } = useWebSocket();

  const fetchData = useCallback(async () => {
    if (!id) return;
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

  useEffect(() => {
    if (!connected || !id) return;
    
    // Listen for realtime updates to this specific restaurant from super_admin
    const unsub = subscribe('restaurant:updated', (data) => {
      if (data.restaurantId === parseInt(id) && data.restaurant) {
        setRestaurant(data.restaurant);
      }
    });

    return () => unsub();
  }, [connected, subscribe, id]);

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
    const { value: formValues } = await Swal.fire({
      title: 'Add New Role',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 5px;">Email</label>
          <input id="swal-input-email" class="swal2-input" placeholder="Email" type="email">
          <label style="display: block; margin-bottom: 5px; margin-top: 15px;">Password</label>
          <input id="swal-input-password" class="swal2-input" placeholder="Password" type="password">
          <select id="swal-input-role" class="swal2-input" style="width: 100%; box-sizing: border-box;">
            ${restaurant.enableSteward ? '<option value="steward">Steward</option>' : ''}
            ${restaurant.enableKds ? '<option value="kitchen">Kitchen</option>' : ''}
            ${restaurant.enableCashier ? '<option value="cashier">Cashier</option>' : ''}
            ${restaurant.enableAccountant ? '<option value="accountant">Accountant</option>' : ''}
            ${restaurant.enableHousekeeping ? '<option value="housekeeper">Housekeeper</option>' : ''}
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
        await apiClient.post('/auth/admin/create', formValues);
        Swal.fire('Success!', 'New role added successfully.', 'success');
        fetchData();
      } catch (error) {
        Swal.fire('Error!', error.response?.data?.message || 'Failed to add role.', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="wrapper">
        <Navbar />
        <Sidebar />
        <div className="content-wrapper">
          <div className="rp-loading">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="wrapper">
        <Navbar />
        <Sidebar />
        <div className="content-wrapper">
          <div className="rp-loading">Restaurant not found.</div>
        </div>
      </div>
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
    restaurant.enableHousekeeping && 'Room Orders (QR)',
    restaurant.enableKds && 'Kitchen Display System',
    restaurant.enableReports && 'Reports & Analytics',
    restaurant.enableAccountant && 'Accountant Management',
    restaurant.enableCashier && 'Cashier Management',
    'Special Offers',
  ].filter(Boolean);

  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Hotel Profile</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item"><a href="/dashboard">Home</a></li>
                  <li className="breadcrumb-item active">Hotel Profile</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <div className="content">
          <div className="rp-shell">
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
                    onClick={() => navigate('/pricing')}
                  >
                    View Pricing
                  </button>
                </div>
              </section>
            )}

            <div className="rp-layout">
              <aside className="rp-left-card">
                <div className="rp-avatar-wrap">
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" className="rp-avatar" />
                  ) : (
                    <div className="rp-avatar-placeholder">
                      <i className="fas fa-hotel"></i>
                    </div>
                  )}
                </div>
                <div className="rp-identity">
                  <h1 className="rp-name">{restaurant.restaurantName}</h1>
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
                    <div className="rp-detail-value">{restaurant.restaurantName}</div>
                  </div>
                  <div className="rp-detail-row">
                    <div className="rp-detail-label">Email</div>
                    <div className="rp-detail-value">{restaurant.email}</div>
                  </div>
                  <div className="rp-detail-row">
                    <div className="rp-detail-label">Contact Number</div>
                    <div className="rp-detail-value">{restaurant.contactNumber}</div>
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
                  <div className="rp-detail-row rp-detail-row-action">
                    <div className="rp-detail-label"></div>
                    <div className="rp-detail-value">
                      <button
                        type="button"
                        className="rp-primary-btn"
                        style={{ background: '#ffc107', color: '#000' }}
                        onClick={() => navigate('/pricing')}
                      >
                        Upgrade Package
                      </button>
                    </div>
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
        </div>
      </div>
    </div>
  );
}

export default AdminHotelProfile;
