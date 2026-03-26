import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import './RoomOrderManagement.css';

const RoomOrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { subscribe, connected } = useWebSocket();

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    roomNo: '',
  });

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('orderType', 'ROOM');
      if (filters.status) params.append('status', filters.status);
      if (filters.roomNo) params.append('roomNo', filters.roomNo);

      const response = await apiClient.get(`/orders?${params.toString()}`);
      
      if (Array.isArray(response.data)) {
        setOrders(response.data);
      } else if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to fetch orders',
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time listener
  useEffect(() => {
    if (!connected) return;

    const unsubscribers = [
      subscribe('order:new', (newOrder) => {
        if (newOrder.orderType === 'ROOM') {
          console.log('WS: New room order!', newOrder);
          fetchOrders();
          
          // Optional: Show toast for new orders
          Swal.fire({
            icon: 'info',
            title: 'New Room Order',
            text: `Order #${newOrder.orderNo} received for Room ${newOrder.roomNo}`,
            toast: true,
            position: 'top-end',
            timer: 3000,
            showConfirmButton: false
          });
        }
      }),
      subscribe('order:status-updated', (updated) => {
        if (updated.orderType === 'ROOM') {
          console.log('WS: Room order status updated!', updated);
          fetchOrders();
        }
      }),
      subscribe('dashboard:refresh', () => {
        fetchOrders();
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [connected, subscribe, fetchOrders]);

  // Fallback sync every 60 seconds
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchOrders();
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Update status
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const response = await apiClient.patch(`/orders/${orderId}/status`, {
        status: newStatus,
      });

      if (response.data) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Order marked as ${newStatus.replace('_', ' ').toLowerCase()}`,
          timer: 1500,
          showConfirmButton: false
        });
        fetchOrders();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update status',
      });
    }
  };

  // Filter handler
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get status badge class
  const getStatusBadge = (status) => {
    const badges = {
      NEW: 'badge-new',
      ACCEPTED: 'badge-accepted',
      COOKING: 'badge-cooking',
      READY: 'badge-ready',
      SERVED: 'badge-served',
      CANCELLED: 'badge-cancelled',
    };
    return badges[status] || 'badge-secondary';
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  };

  return (
    <div className="page-wrapper">
      <Sidebar />
      <div className="content-wrapper">
        <Navbar />
        <div className="room-order-mgmt-container">
          {/* Header */}
          <div className="page-header-card fade-in">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="mb-1">
                  <i className="fas fa-concierge-bell me-2"></i>
                  Room Order Activity
                </h2>
                <p className="text-light opacity-75 mb-0">Track and manage active room service orders</p>
              </div>
              <div className="d-flex align-items-center gap-3">
                <button
                  className="refresh-btn"
                  onClick={fetchOrders}
                  disabled={loading}
                >
                  <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} me-2`}></i>
                  Refresh
                </button>
                <div className={`status-pill ${connected ? 'status-online' : 'status-offline'}`}>
                  <i className="fas fa-circle me-1"></i>
                  {connected ? 'Live Sync' : 'Offline'}
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-card slide-in">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Order Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Active Orders</option>
                  <option value="NEW">New</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="COOKING">Preparing</option>
                  <option value="READY">Ready for Delivery</option>
                  <option value="SERVED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Room Number</label>
                <div className="search-input-wrap">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    className="form-control"
                    name="roomNo"
                    placeholder="Filter by room..."
                    value={filters.roomNo}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button
                  className="btn btn-secondary w-100"
                  onClick={() => setFilters({ status: '', roomNo: '' })}
                >
                  <i className="fas fa-times-circle me-2"></i>
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="orders-container shadow-lg">
            {loading && orders.length === 0 ? (
              <div className="loading-state fade-in">
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <p>Fetching room orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="empty-state fade-in">
                <i className="fas fa-clipboard-list fa-4x mb-3 text-muted"></i>
                <h4>No Room Orders Found</h4>
                <p className="text-muted">
                  {filters.status || filters.roomNo
                    ? 'No orders match your current filters.'
                    : 'Wait for guests to place orders via room QR codes.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Room</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, index) => (
                      <tr key={order.orderId} className="order-row" style={{ animationDelay: `${index * 0.05}s` }}>
                        <td>
                          <span className="order-no">#{order.orderNo || order.orderId}</span>
                        </td>
                        <td>
                          <div className="room-badge">
                            <i className="fas fa-door-closed me-1"></i>
                            {order.roomNo}
                          </div>
                        </td>
                        <td>
                          <div className="customer-info">
                            <div className="name">{order.customerName || 'Guest'}</div>
                            <div className="phone small text-muted">{order.whatsappNumber}</div>
                          </div>
                        </td>
                        <td>
                          <div className="items-list">
                            {order.orderItems?.map((item, idx) => (
                              <div key={idx} className="item-pill">
                                {item.qty || item.quantity || 1}x {item.itemName || item.foodItem?.itemName || 'Item'}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className="amount">Rs. {parseFloat(order.totalAmount).toLocaleString()}</span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(order.status)}`}>
                            {order.status === 'SERVED' ? 'DELIVERED' : order.status === 'COOKING' ? 'PREPARING' : order.status}
                          </span>
                        </td>
                        <td>
                          <div className="time-info">
                            <div>{formatDate(order.createdAt)}</div>
                          </div>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            {order.status === 'READY' && (
                              <button
                                className="btn btn-success action-btn"
                                onClick={() => handleUpdateStatus(order.orderId, 'SERVED')}
                                title="Mark as Delivered"
                              >
                                <i className="fas fa-truck me-1"></i> Deliver
                              </button>
                            )}
                            {order.status === 'NEW' && (
                              <button
                                className="btn btn-primary action-btn"
                                onClick={() => handleUpdateStatus(order.orderId, 'ACCEPTED')}
                                title="Accept Order"
                              >
                                <i className="fas fa-check me-1"></i> Accept
                              </button>
                            )}
                            <button
                              className="btn btn-outline-info action-btn"
                              onClick={() => {
                                Swal.fire({
                                  title: `Order #${order.orderNo}`,
                                  html: `
                                    <div style="text-align: left;">
                                      <p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
                                      <p><strong>Notes:</strong> ${order.notes || 'None'}</p>
                                      <hr/>
                                      <p><strong>Items:</strong></p>
                                      <ul>
                                        ${order.orderItems.map(i => `<li>${i.qty || i.quantity || 1}x ${i.itemName || i.foodItem?.itemName || 'Item'}</li>`).join('')}
                                      </ul>
                                    </div>
                                  `,
                                  icon: 'info'
                                });
                              }}
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
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
      </div>
    </div>
  );
};

export default RoomOrderManagement;
