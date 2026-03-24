import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import './HousekeepingMessages.css';

const HousekeepingMessages = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { subscribe, connected } = useWebSocket();

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    roomNo: '',
    type: '',
  });

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.roomNo) params.append('roomNo', filters.roomNo);
      if (filters.type) params.append('type', filters.type);

      const response = await apiClient.get(`/housekeeping/requests?${params.toString()}`);
      
      if (response.data.success) {
        setRequests(response.data.data);
        setFilteredRequests(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      if (error.response?.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Feature Disabled',
          text: 'Housekeeping module is disabled for your restaurant',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to fetch requests',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time listener
  useEffect(() => {
    if (!connected) return;

    const unsubscribers = [
      subscribe('housekeeping:new', (newReq) => {
        console.log('WS: New housekeeping request!', newReq);
        fetchRequests();
      }),
      subscribe('housekeeping:status-update', (updated) => {
        console.log('WS: Housekeeping status updated!', updated);
        fetchRequests();
      }),
      subscribe('dashboard:refresh', () => {
        console.log('WS: Dashboard refresh requested');
        fetchRequests();
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [connected, subscribe, fetchRequests]);

  // Fallback sync every 60 seconds
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchRequests();
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRequests]);

  // Update status
  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      const response = await apiClient.patch(`/housekeeping/requests/${requestId}/status`, {
        status: newStatus,
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Request status updated successfully',
          timer: 2000,
        });
        fetchRequests();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update status',
      });
    }
  };

  // Delete request
  const handleDelete = async (requestId) => {
    const result = await Swal.fire({
      title: 'Delete Request?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it',
    });

    if (result.isConfirmed) {
      try {
        const response = await apiClient.delete(`/housekeeping/requests/${requestId}`);

        if (response.data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: 'Request deleted successfully',
            timer: 2000,
          });
          fetchRequests();
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete request',
        });
      }
    }
  };

  // Filter handler
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get status badge class
  const getStatusBadge = (status) => {
    const badges = {
      NEW: 'badge-new',
      IN_PROGRESS: 'badge-in-progress',
      DONE: 'badge-done',
      CANCELLED: 'badge-cancelled',
    };
    return badges[status] || 'badge-secondary';
  };

  // Get type badge class
  const getTypeBadge = (type) => {
    const badges = {
      CLEANING: 'badge-type-cleaning',
      TOWELS: 'badge-type-towels',
      WATER: 'badge-type-water',
      OTHER: 'badge-type-other',
    };
    return badges[type] || 'badge-secondary';
  };

  // Format time ago
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="housekeeping-messages-container">
      {/* Header */}
      <div className="page-header-card fade-in">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1">
              <i className="fas fa-envelope me-2"></i>
              Housekeeping Requests
            </h2>
            <p className="text-muted mb-0">Manage guest requests and housekeeping tasks</p>
          </div>
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={fetchRequests}
              disabled={loading}
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} me-2`}></i>
              Refresh
            </button>
            <div className={`status-pill ${connected ? 'status-online' : 'status-offline'} me-2`}>
              <i className={`fas fa-circle me-1`}></i>
              {connected ? 'Live' : 'Offline'}
            </div>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="autoRefreshSwitch"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="autoRefreshSwitch">
                Sync Fallback (60s)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-card slide-in">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Room Number</label>
            <input
              type="text"
              className="form-control"
              name="roomNo"
              placeholder="Search room..."
              value={filters.roomNo}
              onChange={handleFilterChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Request Type</label>
            <select
              className="form-select"
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="CLEANING">Cleaning</option>
              <option value="TOWELS">Towels</option>
              <option value="WATER">Water</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button
              className="btn btn-secondary w-100"
              onClick={() => setFilters({ status: '', roomNo: '', type: '' })}
            >
              <i className="fas fa-times me-2"></i>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="requests-container">
        {loading && requests.length === 0 ? (
          <div className="loading-state fade-in">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state fade-in">
            <i className="fas fa-inbox fa-4x mb-3 text-muted"></i>
            <h4>No Requests Found</h4>
            <p className="text-muted">
              {filters.status || filters.roomNo || filters.type
                ? 'Try adjusting your filters'
                : 'No housekeeping requests yet'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table requests-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request, index) => (
                  <tr key={request.requestId} className="request-row" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td>
                      <strong>{request.roomNo}</strong>
                    </td>
                    <td>
                      <span className={`badge ${getTypeBadge(request.requestType)}`}>
                        {request.requestType}
                      </span>
                    </td>
                    <td>
                      <span className="message-preview">
                        {request.message || <em className="text-muted">No message</em>}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-muted">{timeAgo(request.createdAt)}</td>
                    <td>
                      <div className="btn-group btn-group-sm" role="group">
                        {request.status === 'NEW' && (
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleUpdateStatus(request.requestId, 'IN_PROGRESS')}
                            title="Mark In Progress"
                          >
                            <i className="fas fa-play"></i>
                          </button>
                        )}
                        {request.status === 'IN_PROGRESS' && (
                          <button
                            className="btn btn-outline-success"
                            onClick={() => handleUpdateStatus(request.requestId, 'DONE')}
                            title="Mark Done"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                        )}
                        {request.status !== 'CANCELLED' && request.status !== 'DONE' && (
                          <button
                            className="btn btn-outline-warning"
                            onClick={() => handleUpdateStatus(request.requestId, 'CANCELLED')}
                            title="Cancel"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(request.requestId)}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
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
    </div>
  );
};

export default HousekeepingMessages;
