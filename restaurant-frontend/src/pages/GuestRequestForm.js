import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';
import Swal from 'sweetalert2';
import './GuestRequestForm.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

function GuestRequestForm() {
  const { roomKey } = useParams();
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [currentRequestStatus, setCurrentRequestStatus] = useState(null);
  const [shownNotifications, setShownNotifications] = useState(new Set());
  const [formData, setFormData] = useState({
    requestType: 'CLEANING',
    message: ''
  });
  const { subscribe, connected } = useWebSocket();

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Helper to show notifications (Toast + Browser)
  const showNotification = useCallback((title, message, type = 'info') => {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        tag: 'housekeeping-update'
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Play sound (optional)
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    }

    // Also show SweetAlert notification
    Swal.fire({
      title: title,
      text: message,
      icon: type,
      timer: 4000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }, []);

  // Refresh request status logic
  const refreshRequestStatus = useCallback(async () => {
    if (!requestSuccess || !requestSuccess.requestId) return;
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/housekeeping/track/${requestSuccess.requestId}`,
        {
          headers: {
            'x-room-key': roomKey
          }
        }
      );
      
      const newStatus = response.data.data?.status;
      
      setCurrentRequestStatus(prevStatus => {
        if (newStatus !== prevStatus) {
          setShownNotifications(prevNotifications => {
            if (!prevNotifications.has(newStatus)) {
              if (newStatus === 'IN_PROGRESS') {
                showNotification(
                  'Request in Progress! 🚀',
                  'Our staff has started working on your request.',
                  'info'
                );
              } else if (newStatus === 'DONE') {
                showNotification(
                  'Request Completed! ✅',
                  'Your request has been completed. Thank you!',
                  'success'
                );
              } else if (newStatus === 'CANCELLED') {
                showNotification(
                  'Request Cancelled ❌',
                  'Your request has been cancelled. Please contact staff for assistance.',
                  'error'
                );
              }
              return new Set(prevNotifications).add(newStatus);
            }
            return prevNotifications;
          });
        }
        return newStatus;
      });
    } catch (error) {
      console.error('Error fetching request status:', error);
    }
  }, [requestSuccess, roomKey, API_BASE_URL, showNotification]);

  // Real-time listener for housekeeping status updates
  useEffect(() => {
    if (!connected || !requestSuccess) return;

    const unsubscribe = subscribe('housekeeping:status-update', (updated) => {
      if (updated && updated.requestId === requestSuccess.requestId) {
        console.log('WS: Housekeeping status updated for current request!', updated.status);
        refreshRequestStatus();
      }
    });

    return () => unsubscribe();
  }, [connected, subscribe, requestSuccess, refreshRequestStatus]);

  // Occasional polling fallback
  useEffect(() => {
    let pollInterval;
    
    if (requestSuccess && requestSuccess.requestId) {
      setCurrentRequestStatus(requestSuccess.status);
      pollInterval = setInterval(refreshRequestStatus, 120000); // 2 minutes
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [requestSuccess, refreshRequestStatus]);  const fetchRoomInfo = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/qr/room/resolve/${roomKey}`);
      setRoomInfo(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching room info:', error);
      setLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Invalid QR Code',
        text: 'This QR code is not valid or has expired.',
        confirmButtonColor: '#6366f1'
      });
    }
  }, [roomKey]);

  useEffect(() => {
    fetchRoomInfo();
  }, [fetchRoomInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const requestUrl = `${API_BASE_URL}/housekeeping/request`;
    console.log('Submitting request to:', requestUrl);
    console.log('Room Key:', roomKey);
    console.log('Form Data:', formData);

    try {
      const response = await axios.post(
        requestUrl,
        formData,
        {
          headers: {
            'x-room-key': roomKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Response:', response);

      // Set request success state for tracking
      setRequestSuccess(response.data.data);
      setFormData({
        requestType: 'CLEANING',
        message: ''
      });

    } catch (error) {
      console.error('Error submitting request:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      console.error('API Base URL:', API_BASE_URL);
      
      let errorMessage = 'Failed to submit request. Please try again.';
      if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: errorMessage,
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const startNewRequest = () => {
    setRequestSuccess(null);
    setCurrentRequestStatus(null);
    setShownNotifications(new Set());
  };

  // Get status badge color and icon
  const getStatusDisplay = (status) => {
    const displays = {
      'NEW': { color: 'primary', icon: 'fa-clock', text: 'Request Received' },
      'IN_PROGRESS': { color: 'info', icon: 'fa-spinner', text: 'In Progress' },
      'DONE': { color: 'success', icon: 'fa-check-circle', text: 'Completed' },
      'CANCELLED': { color: 'danger', icon: 'fa-times-circle', text: 'Cancelled' }
    };
    return displays[status] || displays['NEW'];
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="guest-request-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!roomInfo) {
    return (
      <div className="guest-request-container">
        <div className="error-card">
          <i className="fas fa-exclamation-circle"></i>
          <h2>Invalid QR Code</h2>
          <p>This QR code is not valid or has been removed.</p>
        </div>
      </div>
    );
  }

  // Success Screen with Real-time Status Updates
  if (requestSuccess) {
    const statusDisplay = getStatusDisplay(currentRequestStatus || requestSuccess.status);
    const isCancelled = (currentRequestStatus || requestSuccess.status) === 'CANCELLED';
    const isDone = (currentRequestStatus || requestSuccess.status) === 'DONE';
    
    return (
      <div className="guest-request-container">
        <div className="request-success-screen">
          <div className={`success-icon ${isCancelled ? 'cancelled-icon' : isDone ? 'done-icon' : ''}`}>
            <i className={`fas ${isCancelled ? 'fa-times-circle' : isDone ? 'fa-check-circle' : 'fa-check-circle'}`}></i>
          </div>
          <h1>{isCancelled ? 'Request Cancelled' : isDone ? 'Request Completed!' : 'Request Submitted Successfully!'}</h1>
          
          <div className="request-details-card">
            <h3>Room Number</h3>
            <div className="request-number">{requestSuccess.roomNo}</div>
            
            {/* Real-time Status Tracker */}
            <div className="request-status-tracker mt-4">
              <h5>Request Status</h5>
              <div className={`status-badge badge bg-${statusDisplay.color} pulse-animation`}>
                <i className={`fas ${statusDisplay.icon} me-2`}></i>
                {statusDisplay.text}
              </div>
              
              {/* Status Progress */}
              <div className="status-timeline mt-3">
                <div className={`timeline-step ${['NEW', 'IN_PROGRESS', 'DONE'].indexOf(currentRequestStatus || requestSuccess.status) >= 0 ? 'completed' : ''}`}>
                  <i className="fas fa-check-circle"></i>
                  <span>Received</span>
                </div>
                <div className={`timeline-step ${['IN_PROGRESS', 'DONE'].indexOf(currentRequestStatus || requestSuccess.status) >= 0 ? 'completed' : ''}`}>
                  <i className="fas fa-spinner"></i>
                  <span>In Progress</span>
                </div>
                <div className={`timeline-step ${currentRequestStatus === 'DONE' ? 'completed' : ''}`}>
                  <i className="fas fa-check-double"></i>
                  <span>Completed</span>
                </div>
              </div>
              
              {/* Dynamic Status Messages */}
              {isCancelled && (
                <div className="alert alert-danger mt-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Your request has been cancelled. Please contact our staff if you have any questions.
                </div>
              )}
              
              {isDone && (
                <div className="alert alert-success mt-3">
                  <i className="fas fa-check-circle me-2"></i>
                  Your request has been completed. Thank you for your patience!
                </div>
              )}
              
              {!isCancelled && !isDone && (
                <div className="alert alert-info mt-3">
                  <i className="fas fa-info-circle me-2"></i>
                  We'll update you as your request progresses. You can close this page and return anytime.
                </div>
              )}
            </div>
            
            {/* Request Details */}
            <div className="request-info mt-4">
              <div className="info-row">
                <span className="info-label">Request Type:</span>
                <span className="info-value">{requestSuccess.requestType}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Submitted:</span>
                <span className="info-value">{new Date(requestSuccess.createdAt).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Action Button */}
            {(isDone || isCancelled) && (
              <button
                className="btn btn-primary mt-4 w-100"
                onClick={startNewRequest}
              >
                <i className="fas fa-plus me-2"></i>
                Submit New Request
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-request-container">
      <div className="guest-request-card">
        {/* Header */}
        <div className="request-header">
          <div className="header-icon">
            <i className="fas fa-concierge-bell"></i>
          </div>
          <h1>Room Service Request</h1>
          <p className="room-number">{roomInfo.roomNo}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="request-form">
          {/* Request Type */}
          <div className="form-group">
            <label htmlFor="requestType">
              <i className="fas fa-list"></i>
              Request Type
            </label>
            <select
              id="requestType"
              name="requestType"
              value={formData.requestType}
              onChange={handleChange}
              required
              className="form-control"
            >
              <option value="CLEANING">🧹 Room Cleaning</option>
              <option value="TOWELS">🛁 Fresh Towels</option>
              <option value="WATER">💧 Water Bottles</option>
              <option value="OTHER">📋 Other Service</option>
            </select>
          </div>

          {/* Message */}
          <div className="form-group">
            <label htmlFor="message">
              <i className="fas fa-comment-alt"></i>
              Additional Details (Optional)
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="4"
              className="form-control"
              placeholder="Any special requests or additional information..."
            ></textarea>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="btn-spinner"></span>
                Submitting...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Submit Request
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="request-footer">
          <p>
            <i className="fas fa-info-circle"></i>
            Our staff will respond to your request as soon as possible
          </p>
        </div>
      </div>
    </div>
  );
}

export default GuestRequestForm;
