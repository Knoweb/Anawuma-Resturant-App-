import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';

const TransferRoom = () => {
  const [oldRoomNo, setOldRoomNo] = useState('');
  const [newRoomNo, setNewRoomNo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTransfer = async () => {
    if (!oldRoomNo.trim() || !newRoomNo.trim()) {
      Swal.fire('Error', 'Please enter both old and new room numbers', 'error');
      return;
    }

    if (oldRoomNo.trim() === newRoomNo.trim()) {
      Swal.fire('Error', 'Old and new room numbers must be different', 'error');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: `All active orders and pending bills will be moved from Room ${oldRoomNo} to Room ${newRoomNo}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#266668',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, transfer everything!'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const response = await apiClient.post('/billing/rooms/transfer', {
        oldRoomNo: oldRoomNo.trim(),
        newRoomNo: newRoomNo.trim()
      });

      if (response.data.success) {
        await Swal.fire({
          title: 'Transferred!',
          text: response.data.message,
          icon: 'success',
          confirmButtonColor: '#266668'
        });
        navigate('/manual-orders/rooms');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to transfer room account', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
      <div className="content-wrapper bg-light">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0 text-dark">Room Account Transfer</h1>
              </div>
            </div>
          </div>
        </div>

        <section className="content">
          <div className="container-fluid">
            <div className="row justify-content-center">
              <div className="col-md-6">
                <div className="card shadow-sm border-0" style={{ borderRadius: '15px' }}>
                  <div className="card-header bg-white border-0 py-3">
                    <h3 className="card-title fw-bold" style={{ color: '#266668' }}>
                      <i className="fas fa-exchange-alt me-2"></i> Transfer Guest Data
                    </h3>
                  </div>
                  <div className="card-body p-4">
                    <div className="alert alert-info border-0 shadow-none mb-4" style={{ backgroundColor: 'rgba(38, 102, 104, 0.1)', color: '#266668' }}>
                      <i className="fas fa-info-circle me-2"></i>
                      Use this feature when a guest moves from one room to another. It will shift all their unpaid bills and active orders seamlessly.
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-bold text-muted small">OLD ROOM NUMBER</label>
                      <select
                        className="form-select form-select-lg border-0 bg-light"
                        style={{ borderRadius: '10px' }}
                        value={oldRoomNo}
                        onChange={(e) => setOldRoomNo(e.target.value)}
                      >
                        <option value="">Select current guest room...</option>
                        {Array.from({ length: 16 }, (_, i) => (i + 1).toString()).map(num => (
                          <option key={num} value={num}>Room {num}</option>
                        ))}
                      </select>
                    </div>

                    <div className="text-center mb-4">
                      <div className="bg-light d-inline-block p-3 rounded-circle" style={{ width: '60px', height: '60px' }}>
                        <i className="fas fa-arrow-down fa-2x" style={{ color: '#266668' }}></i>
                      </div>
                    </div>

                    <div className="mb-5">
                      <label className="form-label fw-bold text-muted small">NEW ROOM NUMBER</label>
                      <select
                        className="form-select form-select-lg border-0 bg-light"
                        style={{ borderRadius: '10px' }}
                        value={newRoomNo}
                        onChange={(e) => setNewRoomNo(e.target.value)}
                      >
                        <option value="">Select destination room...</option>
                        {Array.from({ length: 16 }, (_, i) => (i + 1).toString()).map(num => (
                          <option key={num} value={num}>Room {num}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      className="btn btn-lg w-100 text-white shadow-sm"
                      onClick={handleTransfer}
                      disabled={loading}
                      style={{
                        backgroundColor: '#266668',
                        borderRadius: '12px',
                        padding: '12px',
                        fontWeight: '600',
                        transition: 'all 0.3s'
                      }}
                    >
                      {loading ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span> Transferring...</>
                      ) : (
                        <><i className="fas fa-random me-2"></i> Confirm Room Transfer</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TransferRoom;
