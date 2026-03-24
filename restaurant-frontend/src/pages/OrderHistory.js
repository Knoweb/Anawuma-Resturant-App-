import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import './OrderManagement.css';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    servedOrders: 0,
    cancelledOrders: 0
  });
  
  // Filter states - default to today
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [filters, setFilters] = useState({
    status: '',
    from: getTodayDate(),
    to: getTodayDate(),
    tableNo: '',
    orderNo: ''
  });

  const historyStatuses = ['SERVED', 'CANCELLED'];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (filterParams = {}) => {
    try {
      setLoading(true);
      
      const params = {};
      
      // Use provided filters or default to current state
      const activeFilters = Object.keys(filterParams).length > 0 ? filterParams : filters;
      
      // Only fetch completed orders (SERVED or CANCELLED)
      if (activeFilters.status && historyStatuses.includes(activeFilters.status)) {
        params.status = activeFilters.status;
      }
      
      // Add date filters (default to today)
      if (activeFilters.from) params.from = activeFilters.from;
      if (activeFilters.to) params.to = activeFilters.to;
      if (activeFilters.tableNo) params.tableNo = activeFilters.tableNo;
      if (activeFilters.orderNo) params.orderNo = activeFilters.orderNo;

      const response = await apiClient.get('/orders', { params });
      
      // Filter to show only history orders
      const historyOrders = response.data.filter(order => 
        historyStatuses.includes(order.status)
      );
      
      setOrders(historyOrders);
      
      // Calculate statistics
      const totalRevenue = historyOrders
        .filter(order => order.status === 'SERVED')
        .reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);
      
      const servedCount = historyOrders.filter(order => order.status === 'SERVED').length;
      const cancelledCount = historyOrders.filter(order => order.status === 'CANCELLED').length;
      
      setStats({
        totalOrders: historyOrders.length,
        totalRevenue: totalRevenue,
        servedOrders: servedCount,
        cancelledOrders: cancelledCount
      });
      
    } catch (error) {
      console.error('Error fetching order history:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch order history. Please try again.',
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
      from: getTodayDate(),
      to: getTodayDate(),
      tableNo: '',
      orderNo: ''
    };
    setFilters(clearedFilters);
    fetchOrders(clearedFilters);
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

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
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
          <i className="fas fa-history me-2"></i>
          Order History
        </h2>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="stat-icon bg-primary">
                <i className="fas fa-receipt"></i>
              </div>
              <div className="stat-details">
                <h3>{stats.totalOrders}</h3>
                <p>Total Orders</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="stat-icon bg-success">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-details">
                <h3>{stats.servedOrders}</h3>
                <p>Served Orders</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="stat-icon bg-danger">
                <i className="fas fa-ban"></i>
              </div>
              <div className="stat-details">
                <h3>{stats.cancelledOrders}</h3>
                <p>Cancelled Orders</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card stat-card">
            <div className="card-body">
              <div className="stat-icon bg-info">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="stat-details">
                <h3>{formatCurrency(stats.totalRevenue)}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
          </div>
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
                <option value="">All Completed</option>
                {historyStatuses.map(status => (
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
              <p className="mt-2 text-muted">Loading order history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <p className="text-muted">No orders found for the selected period</p>
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
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleViewOrder(order.orderId)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
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
          readOnly={true} // History orders cannot be modified
        />
      )}
    </div>
  );
};

export default OrderHistory;
