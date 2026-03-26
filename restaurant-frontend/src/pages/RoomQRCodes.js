import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import './RoomQRCodes.css';

const RoomQRCodes = () => {
  const navigate = useNavigate();
  const [qrCodes, setQrCodes] = useState([]);
  const [filteredQrCodes, setFilteredQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch QR codes
  const fetchQrCodes = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/room-qr');
      setQrCodes(response.data);
      setFilteredQrCodes(response.data);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      if (error.response?.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Feature Disabled',
          text: 'Room Orders module is disabled for your restaurant',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to fetch QR codes',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrCodes();
  }, []);

  // Filter QR codes by room number
  useEffect(() => {
    if (searchTerm) {
      setFilteredQrCodes(
        qrCodes.filter((qr) =>
          qr.roomNo.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredQrCodes(qrCodes);
    }
  }, [searchTerm, qrCodes]);

  // Download QR code as image
  const downloadQr = (roomNo, roomKey) => {
    const canvas = document.getElementById(`qr-${roomKey}`);
    
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${roomNo.replace(/\s+/g, '_')}_QR.png`;
      link.href = url;
      link.click();
    }
  };

  // Delete QR code
  const handleDelete = async (qrId, roomNo) => {
    const result = await Swal.fire({
      title: `Delete QR Code for ${roomNo}?`,
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it',
    });

    if (result.isConfirmed) {
      try {
        const response = await apiClient.delete(`/room-qr/${qrId}`);

        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: response.data.message || 'QR code deleted successfully',
          timer: 2000,
        });
        fetchQrCodes();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete QR code',
        });
      }
    }
  };

  return (
    <div className="room-qr-codes-container">
      {/* Header */}
      <div className="page-header-card fade-in">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1">
              <i className="fas fa-qrcode me-2"></i>
              All Room QR Codes
            </h2>
            <p className="text-muted mb-0">View and manage room QR codes</p>
          </div>
          <div className="d-flex gap-3">
            <button
              className="btn btn-outline-light"
              onClick={fetchQrCodes}
              disabled={loading}
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} me-2`}></i>
              Refresh
            </button>
            <button
              className="btn btn-light"
              onClick={() => navigate('/housekeeping/room-qr/generate')}
            >
              <i className="fas fa-plus me-2"></i>
              Generate New
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar slide-in">
        <div className="input-group">
          <span className="input-group-text">
            <i className="fas fa-search"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => setSearchTerm('')}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        <div className="mt-2 text-muted">
          Showing {filteredQrCodes.length} of {qrCodes.length} QR codes
        </div>
      </div>

      {/* QR Codes Grid */}
      {loading ? (
        <div className="loading-state fade-in">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading QR codes...</p>
        </div>
      ) : filteredQrCodes.length === 0 ? (
        <div className="empty-state fade-in">
          <i className="fas fa-qrcode fa-4x mb-3 text-muted"></i>
          <h4>No QR Codes Found</h4>
          <p className="text-muted mb-4">
            {searchTerm
              ? 'No rooms match your search'
              : 'Generate room QR codes to get started'}
          </p>
          {!searchTerm && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/housekeeping/room-qr/generate')}
            >
              <i className="fas fa-plus me-2"></i>
              Generate QR Codes
            </button>
          )}
        </div>
      ) : (
        <div className="qr-grid">
          {filteredQrCodes.map((qr, index) => (
            <div
              key={qr.roomQrId}
              className="qr-card"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="qr-card-header">
                <h5 className="room-label">
                  <i className="fas fa-door-open me-2"></i>
                  {qr.roomNo}
                </h5>
                <span className="badge badge-active">
                  <i className="fas fa-check-circle me-1"></i>
                  Active
                </span>
              </div>

              <div className="qr-canvas-wrapper">
                <QRCodeCanvas
                  id={`qr-${qr.roomKey}`}
                  value={qr.qrUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="qr-info">
                <small className="text-muted d-block mb-1">
                  <i className="fas fa-link me-1"></i>
                  {qr.qrUrl}
                </small>
                <small className="text-muted d-block">
                  <i className="fas fa-calendar me-1"></i>
                  Created: {new Date(qr.createdAt).toLocaleDateString()}
                </small>
              </div>

              <div className="qr-card-actions">
                <button
                  className="btn btn-primary btn-sm flex-fill"
                  onClick={() => downloadQr(qr.roomNo, qr.roomKey)}
                >
                  <i className="fas fa-download me-1"></i>
                  Download
                </button>
                <button
                  className="btn btn-outline-danger btn-sm flex-fill"
                  onClick={() => handleDelete(qr.roomQrId, qr.roomNo)}
                >
                  <i className="fas fa-trash me-1"></i>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomQRCodes;
