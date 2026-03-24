import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import './GenerateRoomQRCodes.css';

const GenerateRoomQRCodes = () => {
  const navigate = useNavigate();
  const [singleRoomNo, setSingleRoomNo] = useState('');
  const [bulkRoomCount, setBulkRoomCount] = useState('');
  const [generatedQrCodes, setGeneratedQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch existing QR codes
  const fetchQrCodes = async () => {
    try {
      const response = await apiClient.get('/room-qr');
      setGeneratedQrCodes(response.data);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
    }
  };

  useEffect(() => {
    fetchQrCodes();
  }, []);

  // Generate single QR code
  const handleGenerateSingle = async (e) => {
    e.preventDefault();

    if (!singleRoomNo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Room Number Required',
        text: 'Please enter a room number',
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/room-qr', {
        roomNo: singleRoomNo.trim(),
      });

      Swal.fire({
        icon: 'success',
        title: 'QR Code Generated',
        text: `QR code for ${singleRoomNo} created successfully`,
        timer: 2000,
      });

      setSingleRoomNo('');
      fetchQrCodes();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Generation Failed',
        text: error.response?.data?.message || 'Failed to generate QR code',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate bulk QR codes
  const handleGenerateBulk = async (e) => {
    e.preventDefault();

    const count = parseInt(bulkRoomCount);

    if (!count || count < 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Count',
        text: 'Please enter a valid room count (minimum 1)',
      });
      return;
    }

    if (count > 500) {
      Swal.fire({
        icon: 'warning',
        title: 'Too Many Rooms',
        text: 'Maximum 500 rooms can be generated at once',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/room-qr/bulk', {
        roomCount: count,
      });

      Swal.fire({
        icon: 'success',
        title: 'QR Codes Generated',
        html: `<p>${response.data.message}</p><p class="text-muted small">${response.data.count} room(s) created</p>`,
        timer: 3000,
      });

      setBulkRoomCount('');
      fetchQrCodes();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Generation Failed',
        text: error.response?.data?.message || 'Failed to generate QR codes',
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete all QR codes
  const handleDeleteAll = async () => {
    if (generatedQrCodes.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No QR Codes',
        text: 'There are no QR codes to delete',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Delete All QR Codes?',
      html: `<p>This will delete <strong>${generatedQrCodes.length}</strong> QR code(s)</p><p class="text-danger">This action cannot be undone!</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete all',
      input: 'checkbox',
      inputValue: 0,
      inputPlaceholder: 'I understand this action is irreversible',
      inputValidator: (result) => {
        return !result && 'You must confirm to proceed';
      },
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const response = await apiClient.delete('/room-qr');

        Swal.fire({
          icon: 'success',
          title: 'All QR Codes Deleted',
          text: response.data.message,
          timer: 2000,
        });

        fetchQrCodes();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Deletion Failed',
          text: error.response?.data?.message || 'Failed to delete QR codes',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Download QR code
  const downloadQr = (roomNo, roomKey) => {
    const canvas = document.getElementById(`qr-preview-${roomKey}`);
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${roomNo.replace(/\s+/g, '_')}_QR.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="generate-room-qr-container">
      {/* Header */}
      <div className="page-header-card fade-in">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1">
              <i className="fas fa-plus-circle me-2"></i>
              Generate Room QR Codes
            </h2>
            <p className="text-muted mb-0">Create QR codes for your hotel rooms</p>
          </div>
          <button
            className="btn btn-outline-light"
            onClick={() => navigate('/housekeeping/room-qr')}
          >
            <i className="fas fa-list me-2"></i>
            View All QR Codes
          </button>
        </div>
      </div>

      {/* Generation Forms */}
      <div className="generation-cards-container">
        {/* Single Room Generator */}
        <div className="generation-card slide-in-left">
          <div className="card-icon">
            <i className="fas fa-qrcode"></i>
          </div>
          <h4>Single Room QR Code</h4>
          <p className="text-muted">Generate QR code for a specific room</p>

          <form onSubmit={handleGenerateSingle}>
            <div className="mb-3">
              <label className="form-label">Room Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., Room 101, Suite A"
                value={singleRoomNo}
                onChange={(e) => setSingleRoomNo(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading || !singleRoomNo.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-plus me-2"></i>
                  Generate QR Code
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bulk Room Generator */}
        <div className="generation-card slide-in-right">
          <div className="card-icon">
            <i className="fas fa-layer-group"></i>
          </div>
          <h4>Bulk Room QR Codes</h4>
          <p className="text-muted">Generate multiple QR codes at once</p>

          <form onSubmit={handleGenerateBulk}>
            <div className="mb-3">
              <label className="form-label">Number of Rooms</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g., 50"
                min="1"
                max="500"
                value={bulkRoomCount}
                onChange={(e) => setBulkRoomCount(e.target.value)}
                disabled={loading}
              />
              <small className="form-text text-muted">
                Generates Room 1, Room 2, ..., Room N (Max: 500)
              </small>
            </div>
            <button
              type="submit"
              className="btn btn-success w-100"
              disabled={loading || !bulkRoomCount}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-layer-group me-2"></i>
                  Generate QR Codes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Delete All */}
        <div className="generation-card slide-in-bottom">
          <div className="card-icon card-icon-danger">
            <i className="fas fa-trash-alt"></i>
          </div>
          <h4>Delete All QR Codes</h4>
          <p className="text-muted">Remove all room QR codes from the system</p>

          <div className="alert alert-warning mb-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            This action cannot be undone!
          </div>

          <button
            className="btn btn-danger w-100"
            onClick={handleDeleteAll}
            disabled={loading || generatedQrCodes.length === 0}
          >
            <i className="fas fa-trash me-2"></i>
            Delete All ({generatedQrCodes.length})
          </button>
        </div>
      </div>

      {/* Generated QR Codes Preview */}
      {generatedQrCodes.length > 0 && (
        <div className="preview-section fade-in">
          <div className="preview-header">
            <h4>
              <i className="fas fa-eye me-2"></i>
              Generated QR Codes ({generatedQrCodes.length})
            </h4>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={fetchQrCodes}
            >
              <i className="fas fa-sync-alt me-1"></i>
              Refresh
            </button>
          </div>

          <div className="qr-preview-grid">
            {generatedQrCodes.slice(0, 20).map((qr, index) => (
              <div
                key={qr.roomQrId}
                className="qr-preview-card"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="qr-preview-header">
                  <strong>{qr.roomNo}</strong>
                </div>
                <div className="qr-preview-canvas">
                  <QRCodeCanvas
                    id={`qr-preview-${qr.roomKey}`}
                    value={qr.qrUrl}
                    size={120}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <button
                  className="btn btn-sm btn-primary w-100"
                  onClick={() => downloadQr(qr.roomNo, qr.roomKey)}
                >
                  <i className="fas fa-download me-1"></i>
                  Download
                </button>
              </div>
            ))}
          </div>

          {generatedQrCodes.length > 20 && (
            <div className="text-center mt-3">
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate('/housekeeping/room-qr')}
              >
                View All {generatedQrCodes.length} QR Codes
                <i className="fas fa-arrow-right ms-2"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GenerateRoomQRCodes;
