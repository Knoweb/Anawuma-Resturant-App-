import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import apiClient from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import './KitchenDashboard.css';

const URGENT_THRESHOLD_MINUTES = 15;

const KitchenDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { subscribe, connected } = useWebSocket();

  const [ordersByStatus, setOrdersByStatus] = useState({
    NEW: [],
    ACCEPTED: [],
    COOKING: [],
    READY: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchKitchenSnapshot = useCallback(async () => {
    try {
      setRefreshing(true);
      setError('');

      const [newOrders, acceptedOrders, cookingOrders, readyOrders] = await Promise.all([
        apiClient.get('/orders', { params: { status: 'NEW' } }),
        apiClient.get('/orders', { params: { status: 'ACCEPTED' } }),
        apiClient.get('/orders', { params: { status: 'COOKING' } }),
        apiClient.get('/orders', { params: { status: 'READY' } }),
      ]);

      setOrdersByStatus({
        NEW: Array.isArray(newOrders.data) ? newOrders.data : [],
        ACCEPTED: Array.isArray(acceptedOrders.data) ? acceptedOrders.data : [],
        COOKING: Array.isArray(cookingOrders.data) ? cookingOrders.data : [],
        READY: Array.isArray(readyOrders.data) ? readyOrders.data : [],
      });
    } catch (fetchError) {
      setError(
        fetchError?.response?.data?.message ||
          'Failed to load kitchen dashboard data. Please refresh.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchenSnapshot();
  }, [fetchKitchenSnapshot]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchKitchenSnapshot();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchKitchenSnapshot]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    const unsubscribeNew = subscribe('order:new', fetchKitchenSnapshot);
    const unsubscribeStatus = subscribe('order:status-update', fetchKitchenSnapshot);

    return () => {
      unsubscribeNew();
      unsubscribeStatus();
    };
  }, [connected, subscribe, fetchKitchenSnapshot]);

  const getOrderAgeMinutes = (createdAt) => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - created) / 60000));
  };

  const summary = useMemo(() => {
    const newCount = ordersByStatus.NEW.length;
    const acceptedCount = ordersByStatus.ACCEPTED.length;
    const cookingCount = ordersByStatus.COOKING.length;
    const readyCount = ordersByStatus.READY.length;

    const urgentOrders = [...ordersByStatus.NEW, ...ordersByStatus.ACCEPTED].filter(
      (order) => getOrderAgeMinutes(order.createdAt) >= URGENT_THRESHOLD_MINUTES,
    );

    return {
      newCount,
      acceptedCount,
      cookingCount,
      readyCount,
      totalOpen: newCount + acceptedCount + cookingCount + readyCount,
      urgentCount: urgentOrders.length,
    };
  }, [ordersByStatus]);

  const queueOrders = useMemo(() => {
    const rows = [
      ...ordersByStatus.NEW,
      ...ordersByStatus.ACCEPTED,
      ...ordersByStatus.COOKING,
      ...ordersByStatus.READY,
    ];

    return rows
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [ordersByStatus]);

  const formatAge = (createdAt) => {
    const minutes = getOrderAgeMinutes(createdAt);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'NEW':
        return 'kd-status-new';
      case 'ACCEPTED':
        return 'kd-status-accepted';
      case 'COOKING':
        return 'kd-status-cooking';
      case 'READY':
        return 'kd-status-ready';
      default:
        return 'kd-status-default';
    }
  };

  const kitchenName = user?.email ? user.email.split('@')[0] : 'Kitchen';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="dashboard-content">
          <div className="container-fluid">
            <div className="kd-header">
              <div>
                <h2 className="kd-title">Kitchen Dashboard</h2>
                <p className="kd-subtitle">Live kitchen queue for {kitchenName}</p>
              </div>
              <div className="kd-header-actions">
                <span className={`kd-live-pill ${connected ? 'online' : 'offline'}`}>
                  {connected ? 'Live Connected' : 'Live Reconnecting'}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={fetchKitchenSnapshot}
                  disabled={refreshing}
                >
                  <i className={`fas fa-sync-alt me-1 ${refreshing ? 'fa-spin' : ''}`}></i>
                  Refresh
                </button>
              </div>
            </div>

            {error && <div className="alert alert-warning">{error}</div>}

            <div className="row g-3 mb-4">
              <div className="col-xl-2 col-md-4 col-6">
                <div className="kd-stat-card kd-stat-new">
                  <div className="kd-stat-label">New</div>
                  <div className="kd-stat-value">{summary.newCount}</div>
                </div>
              </div>
              <div className="col-xl-2 col-md-4 col-6">
                <div className="kd-stat-card kd-stat-accepted">
                  <div className="kd-stat-label">Accepted</div>
                  <div className="kd-stat-value">{summary.acceptedCount}</div>
                </div>
              </div>
              <div className="col-xl-2 col-md-4 col-6">
                <div className="kd-stat-card kd-stat-cooking">
                  <div className="kd-stat-label">Cooking</div>
                  <div className="kd-stat-value">{summary.cookingCount}</div>
                </div>
              </div>
              <div className="col-xl-2 col-md-4 col-6">
                <div className="kd-stat-card kd-stat-ready">
                  <div className="kd-stat-label">Ready</div>
                  <div className="kd-stat-value">{summary.readyCount}</div>
                </div>
              </div>
              <div className="col-xl-2 col-md-4 col-6">
                <div className="kd-stat-card kd-stat-total">
                  <div className="kd-stat-label">Open Total</div>
                  <div className="kd-stat-value">{summary.totalOpen}</div>
                </div>
              </div>
              <div className="col-xl-2 col-md-4 col-6">
                <div className="kd-stat-card kd-stat-urgent">
                  <div className="kd-stat-label">Urgent</div>
                  <div className="kd-stat-value">{summary.urgentCount}</div>
                </div>
              </div>
            </div>

            <div className="kd-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/kitchen/kds')}>
                Open KDS Board
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/kitchen/orders')}>
                Active Orders
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/kitchen/history')}>
                Order History
              </button>
            </div>

            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0">Current Queue</h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : queueOrders.length === 0 ? (
                  <div className="text-center text-muted py-4">No active kitchen orders.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Table</th>
                          <th>Items</th>
                          <th>Status</th>
                          <th>Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueOrders.map((order) => {
                          const itemCount = Array.isArray(order.orderItems) ? order.orderItems.length : 0;
                          return (
                            <tr key={order.orderId}>
                              <td>#{order.orderNo}</td>
                              <td>{order.tableNo || '-'}</td>
                              <td>{itemCount}</td>
                              <td>
                                <span className={`kd-status-pill ${getStatusClass(order.status)}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td>{formatAge(order.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="kd-footnote">
              Auto-refresh every 15 seconds. Urgent orders are NEW or ACCEPTED for 15+ minutes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenDashboard;
