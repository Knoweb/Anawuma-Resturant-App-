import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import './GenerateQRCodes.css';

const GenerateQRCodes = () => {
  const [tableNo, setTableNo] = useState('');
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQrCodes();
  }, []);

  const fetchQrCodes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/table-qr');
      setQrCodes(response.data || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      Swal.fire('Error', 'Failed to load QR codes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!tableNo.trim()) {
      Swal.fire('Validation Error', 'Please enter a table number', 'warning');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/table-qr', { tableNo: tableNo.trim() });
      Swal.fire('Success', `QR Code generated for ${tableNo}`, 'success');
      setTableNo('');
      await fetchQrCodes();
    } catch (error) {
      console.error('Error generating QR code:', error);
      const errorMsg = error.response?.data?.message || 'Failed to generate QR code';
      Swal.fire('Error', errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = (tableQr) => {
    const canvas = document.getElementById(`qr-${tableQr.tableQrId}`);
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-${tableQr.tableNo}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteQR = async (tableQrId, tableNo) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Delete QR code for ${tableNo}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await apiClient.delete(`/table-qr/${tableQrId}`);
        Swal.fire('Deleted!', 'QR code has been deleted.', 'success');
        await fetchQrCodes();
      } catch (error) {
        console.error('Error deleting QR code:', error);
        Swal.fire('Error', 'Failed to delete QR code', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (qrCodes.length === 0) {
      Swal.fire('Info', 'No QR codes to delete', 'info');
      return;
    }

    const result = await Swal.fire({
      title: 'Delete All QR Codes?',
      text: `This will delete all ${qrCodes.length} QR code(s). This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete all!',
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const response = await apiClient.delete('/table-qr');
        Swal.fire('Deleted!', response.data.message, 'success');
        await fetchQrCodes();
      } catch (error) {
        console.error('Error deleting all QR codes:', error);
        Swal.fire('Error', 'Failed to delete QR codes', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
      <div className="content-wrapper">
        <div className="generate-qr-container">
          <div className="page-header">
            <h2>
              <i className="fas fa-qrcode me-2"></i>
              Generate Customer QR Code
            </h2>
          </div>

          {/* Generate QR Form */}
          <div className="generate-qr-form card shadow-sm mb-4">
            <div className="card-body">
              <div className="row align-items-end">
                <div className="col-md-6">
                  <label className="form-label">Table Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Table 1, T-5, etc."
                    value={tableNo}
                    onChange={(e) => setTableNo(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGenerateQR()}
                    disabled={loading}
                  />
                </div>
                <div className="col-md-6">
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={handleGenerateQR}
                      disabled={loading}
                    >
                      <i className="fas fa-qrcode me-2"></i>
                      Generate QR Code
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleDeleteAll}
                      disabled={loading || qrCodes.length === 0}
                    >
                      <i className="fas fa-trash me-2"></i>
                      Delete All QR Codes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Processing...</p>
            </div>
          )}

          {/* QR Codes Grid */}
          {!loading && (
            <>
              {qrCodes.length === 0 ? (
                <div className="no-qr-codes text-center py-5">
                  <i className="fas fa-qrcode fa-4x text-muted mb-3"></i>
                  <h4>No QR Codes Generated Yet</h4>
                  <p className="text-muted">
                    Enter a table number above and click "Generate QR Code" to get started.
                  </p>
                </div>
              ) : (
                <div className="qr-codes-grid">
                  {qrCodes.map((qr) => (
                    <div key={qr.tableQrId} className="qr-code-card card shadow-sm">
                      <div className="card-body text-center">
                        <h5 className="card-title mb-3">
                          <i className="fas fa-chair me-2"></i>
                          {qr.tableNo}
                        </h5>

                        {/* QR Code */}
                        <div className="qr-code-wrapper">
                          <QRCodeCanvas
                            id={`qr-${qr.tableQrId}`}
                            value={qr.qrUrl || ''}
                            size={200}
                            level="H"
                            includeMargin={true}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="d-grid gap-2 mt-3">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleDownloadQR(qr)}
                          >
                            <i className="fas fa-download me-2"></i>
                            Download QR Code
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteQR(qr.tableQrId, qr.tableNo)}
                          >
                            <i className="fas fa-trash me-2"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateQRCodes;
