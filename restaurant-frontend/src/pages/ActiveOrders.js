import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import Swal from 'sweetalert2';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import './OrderManagement.css';

const ActiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { subscribe, connected } = useWebSocket();
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: '',
    tableNo: '',
    orderNo: ''
  });

  const activeStatuses = ['NEW', 'ACCEPTED', 'COOKING', 'READY'];

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-time updates via WebSockets
  useEffect(() => {
    if (!connected) return;

    const unsubscribers = [
      subscribe('order:new', () => {
        console.log('WS: New order received, refreshing active list...');
        fetchOrders(filters, true);
      }),
      subscribe('order:status-update', () => {
        console.log('WS: Order status updated, refreshing active list...');
        fetchOrders(filters, true);
      }),
      subscribe('dashboard:refresh', () => {
        console.log('WS: Dashboard refresh requested');
        fetchOrders(filters, true);
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [connected, subscribe, filters, fetchOrders]);

  // Occasional background sync (safety fallback)
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchOrders(filters, true); // silent refresh
      }, 60000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filters, fetchOrders]);

  const fetchOrders = async (filterParams = {}, silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const params = {};
      
      // Only fetch active orders (not SERVED or CANCELLED)
      const statusFilter = filterParams.status || '';
      if (statusFilter && activeStatuses.includes(statusFilter)) {
        params.status = statusFilter;
      }
      
      // Add other filters
      if (filterParams.from) params.from = filterParams.from;
      if (filterParams.to) params.to = filterParams.to;
      if (filterParams.tableNo) params.tableNo = filterParams.tableNo;
      if (filterParams.orderNo) params.orderNo = filterParams.orderNo;

      const response = await apiClient.get('/orders', { params });
      
      // Filter to show only active orders
      const activeOrders = response.data.filter(order => 
        activeStatuses.includes(order.status)
      );
      
      setOrders(activeOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (!silent) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch active orders. Please try again.',
        });
      }
    } finally {
      if (!silent) setLoading(false);
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
      READY: 'badge-success'
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

  const getOrderAge = (dateString) => {
    const created = new Date(dateString);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const hours = Math.floor(diffMins / 60);
    return `${hours} hr ${diffMins % 60} min ago`;
  };

  return (
    <div className="order-management-container">
      <div className="page-header">
        <h2>
          <i className="fas fa-clipboard-list me-2"></i>
          Active Orders
        </h2>
        <div className="header-actions">
            <div className={`status-pill ${connected ? 'status-online' : 'status-offline'} me-2`}>
              <i className="fas fa-circle me-1"></i>
              {connected ? 'Live' : 'Offline'}
            </div>
            <button
              className={`btn ${autoRefresh ? 'btn-success' : 'btn-outline-secondary'} btn-sm`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Sync Fallback ON' : 'Sync Fallback OFF'}
            >
              <i className={`fas fa-sync-alt ${autoRefresh ? 'fa-spin' : ''} me-1`}></i>
              {autoRefresh ? 'Sync: 60s' : 'Sync: OFF'}
            </button>
          <button
            className="btn btn-primary btn-sm ms-2"
            onClick={() => fetchOrders(filters)}
            title="Refresh now"
          >
            <i className="fas fa-refresh me-1"></i>
            Refresh
          </button>
        </div>
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
                <option value="">All Active</option>
                {activeStatuses.map(status => (
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
              <p className="mt-2 text-muted">Loading active orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
              <p className="text-muted">No active orders. All caught up!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Table</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Total Amount</th>
                    <th>Order Time</th>
                    <th>Age</th>
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
                        <span className="badge bg-dark">{order.tableNo}</span>
                      </td>
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
                        <span className="text-muted small">
                          {getOrderAge(order.createdAt)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-info me-2"
                          onClick={() => handleViewOrder(order.orderId)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleCancelOrder(order.orderId)}
                          title="Cancel Order"
                        >
                          <i className="fas fa-ban"></i>
                        </button>
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

export default ActiveOrders;
