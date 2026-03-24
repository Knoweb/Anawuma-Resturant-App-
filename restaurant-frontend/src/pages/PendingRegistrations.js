import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import SuperAdminDashboard from './SuperAdminDashboard';
import './PendingRegistrations.css';

const PendingRegistrations = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/restaurant/registrations/pending');
      if (response.data.success) {
        setRestaurants(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      Swal.fire('Error', 'Failed to load pending registrations', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (restaurant) => {
    const result = await Swal.fire({
      title: 'Approve Registration?',
      html: `Approve <strong>${restaurant.restaurantName}</strong>?<br/>This will activate their 30-day free trial.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#266668',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Approve',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await apiClient.patch(`/restaurant/${restaurant.restaurantId}/approve`);
      if (response.data.success) {
        Swal.fire('Approved!', response.data.message, 'success');
        fetchPending();
      }
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Failed to approve registration', 'error');
    }
  };

  const handleReject = async (restaurant) => {
    const result = await Swal.fire({
      title: 'Reject Registration?',
      html: `Reject <strong>${restaurant.restaurantName}</strong>?<br/>The owner will not be able to log in.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Reject',
    });

    if (!result.isConfirmed) return;

    try {
      const response = await apiClient.patch(`/restaurant/${restaurant.restaurantId}/reject`);
      if (response.data.success) {
        Swal.fire('Rejected', response.data.message, 'info');
        fetchPending();
      }
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Failed to reject registration', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const featureList = (r) => {
    const flags = [];
    if (r.enableHousekeeping) flags.push('Housekeeping');
    if (r.enableKds) flags.push('KDS');
    if (r.enableReports) flags.push('Reports');
    return flags.length ? flags.join(', ') : 'None';
  };

  return (
    <SuperAdminDashboard>
      <div className="pending-requests-container">
        <h2>
          <i className="fas fa-user-clock" style={{ marginRight: 10, color: '#266668' }}></i>
          Pending Hotel / Restaurant Registrations
        </h2>

        {loading ? (
          <div className="loading">Loading pending registrations…</div>
        ) : restaurants.length === 0 ? (
          <div className="no-requests">
            <i className="fas fa-check-circle" style={{ fontSize: 40, color: '#28a745', display: 'block', marginBottom: 10 }}></i>
            No pending registrations. All caught up!
          </div>
        ) : (
          <div className="requests-table-wrapper">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hotel / Restaurant</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Features</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r, idx) => (
                  <tr key={r.restaurantId}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong>{r.restaurantName}</strong>
                      {r.logo && (
                        <div style={{ marginTop: 6 }}>
                          <img
                            src={`http://localhost:3000${r.logo}`}
                            alt="logo"
                            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </td>
                    <td>{r.email}</td>
                    <td>{r.contactNumber}</td>
                    <td style={{ maxWidth: 180, wordBreak: 'break-word' }}>{r.address}</td>
                    <td>
                      <span style={{ fontSize: 12, color: '#555' }}>{featureList(r)}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleApprove(r)}
                          style={{
                            background: '#266668', color: '#fff', border: 'none',
                            borderRadius: 6, padding: '6px 14px', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600,
                          }}
                        >
                          <i className="fas fa-check" style={{ marginRight: 4 }}></i>Approve
                        </button>
                        <button
                          onClick={() => handleReject(r)}
                          style={{
                            background: '#dc3545', color: '#fff', border: 'none',
                            borderRadius: 6, padding: '6px 14px', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600,
                          }}
                        >
                          <i className="fas fa-times" style={{ marginRight: 4 }}></i>Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminDashboard>
  );
};

export default PendingRegistrations;
