import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import SuperAdminDashboard from './SuperAdminDashboard';

function ManageRestaurants() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState({ show: false, restaurant: null });
  const hasShownNetworkErrorRef = useRef(false);

  const getApiErrorMessage = useCallback((error, fallbackMessage) => {
    const responseMessage = error?.response?.data?.message;
    if (Array.isArray(responseMessage)) return responseMessage.join(', ');
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }
    return fallbackMessage;
  }, []);

  const fetchRestaurants = useCallback(async () => {
    try {
      const response = await apiClient.get('/restaurant');

      if (response.data.success) {
        hasShownNetworkErrorRef.current = false;
        setRestaurants(response.data.data);
      }
    } catch (error) {
      const isBackendUnavailable = !error?.response;

      if (isBackendUnavailable && hasShownNetworkErrorRef.current) {
        setLoading(false);
        return;
      }

      hasShownNetworkErrorRef.current = isBackendUnavailable;

      const status = error?.response?.status;
      const message = isBackendUnavailable
        ? 'Backend server is unavailable. Start the Nest backend on port 3000 and refresh this page.'
        : getApiErrorMessage(error, 'Failed to load restaurants');

      if (status === 401 || status === 403) {
        await Swal.fire({
          icon: 'error',
          title: 'Access denied',
          text:
            status === 403
              ? 'Your session does not have super admin privileges. Please login again using a super admin account.'
              : 'Your session has expired. Please login again.',
        });
        logout();
        navigate('/login');
        return;
      }

      Swal.fire({
        icon: isBackendUnavailable ? 'warning' : 'error',
        title: isBackendUnavailable ? 'Backend unavailable' : 'Error!',
        text: message,
      });
    } finally {
      setLoading(false);
    }
  }, [getApiErrorMessage, logout, navigate]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleDelete = async (restaurantId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the restaurant and all associated data!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/restaurant/${restaurantId}`);

        Swal.fire('Deleted!', 'The restaurant has been deleted.', 'success');
        fetchRestaurants();
      } catch (error) {
        Swal.fire('Error!', 'Failed to delete restaurant', 'error');
      }
    }
  };

  const openEditModal = async (restaurantId) => {
    try {
      const response = await apiClient.get(`/restaurant/${restaurantId}`);

      if (response.data.success) {
        setEditModal({ show: true, restaurant: response.data.data });
      }
    } catch (error) {
      Swal.fire('Error!', 'Failed to load restaurant details', 'error');
    }
  };

  const closeEditModal = () => {
    setEditModal({ show: false, restaurant: null });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updateData = {
      subscriptionStatus: formData.get('subscription_status'),
      subscriptionExpiryDate: formData.get('subscription_expiry_date'),
      enableHousekeeping: formData.get('enable_housekeeping') === 'on',
      enableKds: formData.get('enable_kds') === 'on',
      enableReports: formData.get('enable_reports') === 'on',
      enableAccountant: formData.get('enable_accountant') === 'on',
      enableCashier: formData.get('enable_cashier') === 'on',
    };

    try {
      await apiClient.patch(
        `/restaurant/${editModal.restaurant.restaurantId}`,
        updateData
      );

      Swal.fire('Success!', 'Restaurant updated successfully', 'success');
      closeEditModal();
      fetchRestaurants();
    } catch (error) {
      Swal.fire('Error!', 'Failed to update restaurant', 'error');
    }
  };

  if (loading) {
    return (
      <SuperAdminDashboard>
        <div className="text-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </SuperAdminDashboard>
    );
  }

  return (
    <SuperAdminDashboard>
      <div className="container-fluid px-4 mt-4">
        <h2 className="mb-4">Manage Hotels</h2>
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Hotel Name</th>
                <th>Address</th>
                <th>Contact Number</th>
                <th>Subscription Status</th>
                <th>Subscription Expiry Date</th>
                <th>Privileges</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((restaurant) => (
                <tr key={restaurant.restaurantId}>
                  <td>{restaurant.restaurantName}</td>
                  <td>{restaurant.address}</td>
                  <td>{restaurant.contactNumber}</td>
                  <td>
                    <span
                      className={`badge ${
                        restaurant.subscriptionStatus === 'active'
                          ? 'bg-success'
                          : 'bg-danger'
                      }`}
                    >
                      {restaurant.subscriptionStatus}
                    </span>
                  </td>
                  <td>
                    {restaurant.subscriptionExpiryDate
                      ? new Date(restaurant.subscriptionExpiryDate).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>
                    <div className="privileges-list">
                      <div className="privilege-item">QR Menu System</div>
                      {restaurant.enableHousekeeping && (
                        <div className="privilege-item">Room Orders (QR)</div>
                      )}
                      {restaurant.enableKds && (
                        <div className="privilege-item">Kitchen Display System</div>
                      )}
                      {restaurant.enableReports && (
                        <div className="privilege-item">Reports & Analytics</div>
                      )}
                      {restaurant.enableAccountant && (
                        <div className="privilege-item">Accountant Management</div>
                      )}
                      {restaurant.enableCashier && (
                        <div className="privilege-item">Cashier Management</div>
                      )}
                      <div className="privilege-item">Special Offers</div>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-warning btn-sm me-1 mb-1"
                      onClick={() => openEditModal(restaurant.restaurantId)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm me-1 mb-1"
                      onClick={() => handleDelete(restaurant.restaurantId)}
                    >
                      Delete
                    </button>
                    <button
                      className="btn btn-primary btn-sm mb-1"
                      onClick={() => navigate(`/super-admin/hotel-profile/${restaurant.restaurantId}`)}
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Hotel</h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Subscription Status</label>
                    <select
                      name="subscription_status"
                      className="form-select"
                      defaultValue={editModal.restaurant.subscriptionStatus}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Subscription Expiry Date</label>
                    <input
                      type="date"
                      name="subscription_expiry_date"
                      className="form-control"
                      defaultValue={
                        editModal.restaurant.subscriptionExpiryDate
                          ? new Date(editModal.restaurant.subscriptionExpiryDate)
                              .toISOString()
                              .split('T')[0]
                          : ''
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Privileges</label>
                    <div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="enable_housekeeping"
                          id="enable_housekeeping"
                          defaultChecked={editModal.restaurant.enableHousekeeping}
                        />
                        <label className="form-check-label" htmlFor="enable_housekeeping">
                          Room Orders (QR)
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="enable_kds"
                          id="enable_kds"
                          defaultChecked={editModal.restaurant.enableKds}
                        />
                        <label className="form-check-label" htmlFor="enable_kds">
                          Kitchen Display System
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="enable_reports"
                          id="enable_reports"
                          defaultChecked={editModal.restaurant.enableReports}
                        />
                        <label className="form-check-label" htmlFor="enable_reports">
                          Reports & Analytics
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="enable_accountant"
                          id="enable_accountant"
                          defaultChecked={editModal.restaurant.enableAccountant}
                        />
                        <label className="form-check-label" htmlFor="enable_accountant">
                          Accountant Management
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="enable_cashier"
                          id="enable_cashier"
                          defaultChecked={editModal.restaurant.enableCashier}
                        />
                        <label className="form-check-label" htmlFor="enable_cashier">
                          Cashier Management
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </SuperAdminDashboard>
  );
}

export default ManageRestaurants;
