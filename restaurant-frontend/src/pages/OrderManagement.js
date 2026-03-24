import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import './OrderManagement.css';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: '',
    tableNo: '',
    orderNo: ''
  });

  const orderStatuses = ['NEW', 'ACCEPTED', 'COOKING', 'READY', 'SERVED', 'CANCELLED'];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (filterParams = {}) => {
    try {
      setLoading(true);
      const params = {};
      
      // Only add non-empty filters
      if (filterParams.status) params.status = filterParams.status;
      if (filterParams.from) params.from = filterParams.from;
      if (filterParams.to) params.to = filterParams.to;
      if (filterParams.tableNo) params.tableNo = filterParams.tableNo;
      if (filterParams.orderNo) params.orderNo = filterParams.orderNo;

      const response = await apiClient.get('/orders', { params });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch orders. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilter = () => {
    fetchOrders(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      status: '',
      from: '',
      to: '',
      tableNo: '',
      orderNo: ''
    };
    setFilters(clearedFilters);
    fetchOrders({});
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      setSelectedOrder(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch order details.',
      });
    }
  };

  const handleCancelOrder = async (orderId) => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: 'Are you sure you want to cancel this order?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No, keep it'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.patch(`/orders/${orderId}/status`, { status: 'CANCELLED' });
        Swal.fire({
          icon: 'success',
          title: 'Cancelled',
          text: 'Order has been cancelled successfully.',
          timer: 2000,
          showConfirmButton: false
        });
        fetchOrders(filters);
      } catch (error) {
        console.error('Error cancelling order:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to cancel order.',
        });
      }
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });
      Swal.fire({
        icon: 'success',
        title: 'Updated',
        text: 'Order status updated successfully.',
        timer: 2000,
        showConfirmButton: false
      });
      setShowModal(false);
      fetchOrders(filters);
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update status.',
      });
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      NEW: 'badge-primary',
      ACCEPTED: 'badge-warning',
      COOKING: 'badge-info',
      READY: 'badge-primary',
      SERVED: 'badge-success',
      CANCELLED: 'badge-danger'
    };
    return statusClasses[status] || 'badge-secondary';
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toFixed(2)}`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="order-management-container">
      <div className="page-header">
        <h2>
          <i className="fas fa-clipboard-list me-2"></i>
          Order Management
        </h2>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                {orderStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Table No</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., T-05"
                value={filters.tableNo}
                onChange={(e) => handleFilterChange('tableNo', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Order No</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., ORD-001"
                value={filters.orderNo}
                onChange={(e) => handleFilterChange('orderNo', e.target.value)}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-primary me-2"
                onClick={handleFilter}
              >
                <i className="fas fa-filter me-1"></i>
                Filter
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleClearFilters}
              >
                <i className="fas fa-times me-1"></i>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <p className="text-muted">No orders found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Customer</th>
                    <th>Table</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Total Amount</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.orderId}>
                      <td>
                        <strong>{order.orderNo}</strong>
                      </td>
                      <td>
                        <div className="customer-info-cell">
                          <div className="customer-name">{order.customerName || 'N/A'}</div>
                          {order.whatsappNumber && (
                            <div className="customer-phone text-muted small">
                              <i className="fab fa-whatsapp text-success me-1"></i>
                              {order.whatsappNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{order.tableNo}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {order.orderItems?.length || 0} items
                        </span>
                      </td>
                      <td>
                        <strong>{formatCurrency(order.totalAmount)}</strong>
                      </td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-info me-2"
                          onClick={() => handleViewOrder(order.orderId)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        {order.status !== 'CANCELLED' && order.status !== 'SERVED' && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleCancelOrder(order.orderId)}
                            title="Cancel Order"
                          >
                            <i className="fas fa-ban"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowModal(false)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

export default OrderManagement;
