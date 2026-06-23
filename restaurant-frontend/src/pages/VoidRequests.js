import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import { billingAPI } from '../api/apiClient';
import Swal from 'sweetalert2';
import { useWebSocket } from '../hooks/useWebSocket';

function formatCurrency(val) {
  return 'Rs. ' + parseFloat(val || 0).toFixed(2);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function VoidRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const { subscribe, connected } = useWebSocket();

  const fetchRequests = useCallback(async () => {
    try {
      const res = await billingAPI.getPendingDeleteRequests();
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch pending delete requests:', err);
      Swal.fire('Error', 'Failed to load pending void requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time refresh
  useEffect(() => {
    if (!connected) return;
    const unsubRefresh = subscribe('dashboard:refresh', fetchRequests);
    return () => unsubRefresh();
  }, [connected, subscribe, fetchRequests]);

  const handleApprove = async (requestId) => {
    const { value: notes } = await Swal.fire({
      title: 'Approve Void Request',
      input: 'text',
      inputLabel: 'Admin Notes (Optional)',
      inputPlaceholder: 'Enter any notes here...',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Approve & Void Invoice',
    });

    if (notes !== undefined) {
      try {
        await billingAPI.approveDeleteRequest(requestId, { notes });
        Swal.fire('Approved', 'The invoice has been voided successfully.', 'success');
        setSelectedRequest(null);
        fetchRequests();
      } catch (err) {
        Swal.fire('Error', err?.response?.data?.message || 'Failed to approve request.', 'error');
      }
    }
  };

  const handleReject = async (requestId) => {
    const { value: notes } = await Swal.fire({
      title: 'Reject Void Request',
      input: 'text',
      inputLabel: 'Reason for Rejection (Optional)',
      inputPlaceholder: 'Enter notes here...',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Reject Request',
    });

    if (notes !== undefined) {
      try {
        await billingAPI.rejectDeleteRequest(requestId, { notes });
        Swal.fire('Rejected', 'The void request was rejected.', 'info');
        setSelectedRequest(null);
        fetchRequests();
      } catch (err) {
        Swal.fire('Error', err?.response?.data?.message || 'Failed to reject request.', 'error');
      }
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="dashboard-content" style={{ minHeight: 'calc(100vh - 85px)' }}>
          
          <div className="d-flex justify-content-between align-items-center mb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <h2 className="mb-0" style={{ color: '#1e293b', fontWeight: '700', fontSize: '1.75rem' }}>
              <i className="fas fa-trash-alt me-2 text-danger"></i>
              Void Invoice Requests
            </h2>
            <button className="btn btn-sm btn-outline-primary" onClick={fetchRequests}>
              <i className="fas fa-sync-alt me-1"></i>Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-5 bg-white rounded shadow-sm">
              <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
              <h5 className="text-muted">All Clean!</h5>
              <p className="text-muted">No pending invoice void requests found.</p>
            </div>
          ) : (
            <div className="table-responsive bg-white rounded shadow-sm p-3">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Table/Room</th>
                    <th>Total</th>
                    <th>Requested By</th>
                    <th>Reason</th>
                    <th>Date Requested</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.requestId}>
                      <td><code>{req.invoice?.invoiceNumber}</code></td>
                      <td>
                        {req.invoice?.roomNo
                          ? `Room ${req.invoice.roomNo}`
                          : req.invoice?.tableNo
                          ? `Table - ${req.invoice.tableNo}`
                          : '–'}
                      </td>
                      <td>{formatCurrency(req.invoice?.totalAmount)}</td>
                      <td>{req.requestedBy?.email}</td>
                      <td>
                        <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={req.reason}>
                          {req.reason}
                        </span>
                      </td>
                      <td className="small text-muted">{formatDateTime(req.createdAt)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedRequest(req)}>
                            <i className="fas fa-eye me-1"></i>Details
                          </button>
                          <button className="btn btn-sm btn-success" onClick={() => handleApprove(req.requestId)}>
                            Approve
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(req.requestId)}>
                            Reject
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

      {/* Details Modal */}
      {selectedRequest && (() => {
        const inv = selectedRequest.invoice;
        const items = Array.isArray(inv?.orderItemsJson) ? inv.orderItemsJson : [];
        return (
          <div className="modal-backdrop" onClick={() => setSelectedRequest(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="invoice-modal bg-white rounded p-4" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2" style={{ borderBottom: '1px solid #dee2e6' }}>
                <h5 className="modal-title mb-0">Invoice {inv?.invoiceNumber} Detail</h5>
                <button className="btn-close" onClick={() => setSelectedRequest(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem' }}>&times;</button>
              </div>

              <div className="mb-3">
                <strong>Requested By:</strong> {selectedRequest.requestedBy?.email} <br />
                <strong>Reason:</strong> <span className="text-danger">{selectedRequest.reason}</span> <br />
                <strong>Requested At:</strong> {formatDateTime(selectedRequest.createdAt)}
                <hr className="my-2" />
                <strong>Customer Name:</strong> {inv?.customerName || 'Walk-in'} <br />
                <strong>Table/Room:</strong> {inv?.roomNo ? `Room ${inv.roomNo}` : inv?.tableNo ? `Table - ${inv.tableNo}` : '–'} <br />
                <strong>Payment Method:</strong> {inv?.paymentMethod || '–'}
              </div>

              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.itemName}</td>
                      <td>{item.qty}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 p-3 bg-light rounded text-end" style={{ fontSize: '0.95rem' }}>
                <div className="mb-1"><strong>Subtotal:</strong> {formatCurrency(inv?.subtotal)}</div>
                {parseFloat(inv?.taxAmount || 0) > 0 && (
                  <div className="mb-1"><strong>Tax:</strong> {formatCurrency(inv?.taxAmount)}</div>
                )}
                {parseFloat(inv?.serviceCharge || 0) > 0 && (
                  <div className="mb-1"><strong>Service Charge:</strong> {formatCurrency(inv?.serviceCharge)}</div>
                )}
                {parseFloat(inv?.discountAmount || 0) > 0 && (
                  <div className="mb-1 text-danger"><strong>Discount:</strong> -{formatCurrency(inv?.discountAmount)}</div>
                )}
                <div style={{ borderTop: '1px solid #ccc', marginTop: '8px', paddingTop: '8px' }}>
                  <strong>Grand Total:</strong> <span className="text-success font-weight-bold" style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>{formatCurrency(inv?.totalAmount)}</span>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4 pt-2" style={{ borderTop: '1px solid #dee2e6' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRequest(null)}>Close</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleReject(selectedRequest.requestId)}>Reject</button>
                <button className="btn btn-success btn-sm" onClick={() => handleApprove(selectedRequest.requestId)}>Approve</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default VoidRequests;
