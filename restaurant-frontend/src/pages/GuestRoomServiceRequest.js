import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './GuestRoomServiceRequest.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

function GuestRoomServiceRequest() {
  const { roomKey } = useParams();
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    requestType: 'CLEANING',
    message: ''
  });

  useEffect(() => {
    fetchRoomInfo();
  }, [roomKey]);

  const fetchRoomInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/qr/room/resolve/${roomKey}`);
      setRoomInfo(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching room info:', err);
      setError(err.response?.data?.message || 'Invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.requestType) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a request type'
      });
      return;
    }

    try {
      setSubmitting(true);

      await axios.post(
        `${API_BASE_URL}/housekeeping/request`,
        {
          requestType: formData.requestType,
          message: formData.message || null
        },
        {
          headers: {
            'x-room-key': roomKey
          }
        }
      );

      Swal.fire({
        icon: 'success',
        title: 'Request Submitted!',
        text: 'Our staff will attend to your request shortly.',
        confirmButtonText: 'OK'
      }).then(() => {
        // Reset form
        setFormData({
          requestType: 'CLEANING',
          message: ''
        });
      });

    } catch (err) {
      console.error('Error submitting request:', err);
      
      let errorMessage = 'Failed to submit request. Please try again.';
      
      if (err.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: errorMessage
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="guest-request-container">
        <div className="guest-request-card loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading room information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-request-container">
        <div className="guest-request-card error">
          <div className="error-icon">⚠️</div>
          <h2>Invalid QR Code</h2>
          <p>{error}</p>
          <p className="text-muted">Please scan a valid room QR code or contact reception.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-request-container">
      <div className="guest-request-card">
        <div className="header-section">
          <div className="icon-wrapper">
            <i className="fas fa-concierge-bell"></i>
          </div>
          <h1 className="title">Room Service Request</h1>
          <div className="room-badge">
            <i className="fas fa-door-open"></i>
            <span>{roomInfo.room_no}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="request-form">
          <div className="form-group">
            <label htmlFor="requestType">
              <i className="fas fa-list-ul me-2"></i>
              What do you need?
            </label>
            <select
              id="requestType"
              name="requestType"
              className="form-select"
              value={formData.requestType}
              onChange={handleChange}
              required
            >
              <option value="CLEANING">🧹 Room Cleaning</option>
              <option value="TOWELS">🧺 Fresh Towels</option>
              <option value="WATER">💧 Drinking Water</option>
              <option value="OTHER">📋 Other Request</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="message">
              <i className="fas fa-comment-dots me-2"></i>
              Additional Details (Optional)
            </label>
            <textarea
              id="message"
              name="message"
              className="form-control"
              rows="4"
              placeholder="Any specific requests or details..."
              value={formData.message}
              onChange={handleChange}
              maxLength="500"
            />
            <small className="text-muted">
              {formData.message.length}/500 characters
            </small>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Submitting...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane me-2"></i>
                Submit Request
              </>
            )}
          </button>
        </form>

        <div className="footer-note">
          <i className="fas fa-info-circle me-2"></i>
          Our staff will attend to your request as soon as possible.
        </div>
      </div>
    </div>
  );
}

export default GuestRoomServiceRequest;
