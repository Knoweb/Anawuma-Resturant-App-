import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { useNotification } from '../components/common/NotificationToast';
import SuperAdminDashboard from './SuperAdminDashboard';
import './PendingSettingsRequests.css';

const PendingSettingsRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState('');
  const { addNotification } = useNotification();

  const fetchPendingRequests = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.get('/settings-requests');

      if (response.data.success) {
        // Filter for pending requests only
        const pendingRequests = response.data.data.filter(
          req => req.status === 'PENDING'
        );
        setRequests(pendingRequests);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load pending requests',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const openReviewModal = (request, action) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (!selectedRequest) return;

    try {
      
      const response = await apiClient.patch(
        `/settings-requests/${selectedRequest.requestId}/review`,
        {
          action: reviewAction,
          reviewNotes: reviewNotes || undefined,
        }
      );

      if (response.data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: response.data.message,
          duration: 5000,
        });
        setShowReviewModal(false);
        setSelectedRequest(null);
        setReviewNotes('');
        // Refresh the list
        fetchPendingRequests();
      }
    } catch (error) {
      console.error('Error reviewing request:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to review request',
        duration: 5000,
      });
    }
  };

  const getChangesDisplay = (requested, current) => {
    const changes = [];
    
    const moduleNames = {
      enableHousekeeping: 'Housekeeping',
      enableKds: 'KDS',
      enableReports: 'Reports',
    };

    Object.keys(requested).forEach(key => {
      if (requested[key] !== undefined && moduleNames[key]) {
        // Convert to boolean for proper comparison
        const requestedValue = Boolean(requested[key]);
        const currentValue = Boolean(current[key]);
        
        // Only show if values actually differ
        if (requestedValue !== currentValue) {
          changes.push({
            module: moduleNames[key],
            from: currentValue ? 'Enabled' : 'Disabled',
            to: requestedValue ? 'Enabled' : 'Disabled',
          });
        }
      }
    });

    return changes;
  };

  if (loading) {
    return (
      <SuperAdminDashboard>
        <div className="pending-requests-container">
          <h2>Pending Settings Requests</h2>
          <div className="loading">Loading...</div>
        </div>
      </SuperAdminDashboard>
    );
  }

  return (
    <SuperAdminDashboard>
      <div className="pending-requests-container">
      <h2>Pending Settings Requests</h2>
      
      {requests.length === 0 ? (
        <div className="no-requests">
          <p>No pending requests at this time.</p>
        </div>
      ) : (
        <div className="requests-table-wrapper">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Restaurant</th>
                <th>Requested Changes</th>
                <th>Reason</th>
                <th>Requested On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const changes = getChangesDisplay(
                  request.requestedChanges,
                  request.currentSettings
                );

                return (
                  <tr key={request.requestId}>
                    <td>#{request.requestId}</td>
                    <td>
                      <strong>{request.restaurant?.restaurantName || 'N/A'}</strong>
                      <br />
                      <small>ID: {request.restaurantId}</small>
                    </td>
                    <td>
                      <div className="changes-list">
                        {changes.map((change, idx) => (
                          <div key={idx} className="change-item">
                            <strong>{change.module}:</strong>
                            <br />
                            <span className="from">{change.from}</span>
                            {' → '}
                            <span className="to">{change.to}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="reason">
                        {request.requestReason || <em>No reason provided</em>}
                      </div>
                    </td>
                    <td>
                      {new Date(request.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-approve"
                          onClick={() => openReviewModal(request, 'APPROVE')}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => openReviewModal(request, 'REJECT')}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {reviewAction === 'APPROVE' ? 'Approve' : 'Reject'} Request #
              {selectedRequest.requestId}
            </h3>
            
            <div className="modal-body">
              <div className="request-summary">
                <p>
                  <strong>Restaurant:</strong>{' '}
                  {selectedRequest.restaurant?.restaurantName}
                </p>
                <p>
                  <strong>Changes:</strong>
                </p>
                <ul>
                  {getChangesDisplay(
                    selectedRequest.requestedChanges,
                    selectedRequest.currentSettings
                  ).map((change, idx) => (
                    <li key={idx}>
                      <strong>{change.module}:</strong> {change.from} → {change.to}
                    </li>
                  ))}
                </ul>
                {selectedRequest.requestReason && (
                  <p>
                    <strong>Reason:</strong> {selectedRequest.requestReason}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="reviewNotes">
                  Review Notes {reviewAction === 'REJECT' && '(Required)'}
                </label>
                <textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVE'
                      ? 'Optional notes for the restaurant admin...'
                      : 'Please provide reason for rejection...'
                  }
                  rows={4}
                  required={reviewAction === 'REJECT'}
                />
                {reviewAction === 'REJECT' && !reviewNotes.trim() && (
                  <p className="notes-required-hint">
                    ⚠ A reason is required to reject this request.
                  </p>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </button>
              <button
                className={
                  reviewAction === 'APPROVE' ? 'btn-approve' : 'btn-reject'
                }
                onClick={handleReview}
                disabled={reviewAction === 'REJECT' && !reviewNotes.trim()}
              >
                {reviewAction === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </SuperAdminDashboard>
  );
};

export default PendingSettingsRequests;
