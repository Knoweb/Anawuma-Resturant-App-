import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotification } from '../components/common/NotificationToast';
import { dashboardAPI } from '../api/apiClient';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuthStore();
  const { subscribe, connected } = useWebSocket();
  const { addNotification } = useNotification();
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    activeMenus: 0,
    pendingOrders: 0,
    completedOrders: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [animTrigger, setAnimTrigger] = useState(0);

  // Re-trigger animation every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimTrigger(prev => prev + 1);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      console.log('Fetching dashboard stats...');
      const response = await dashboardAPI.getStats();
      console.log('Dashboard stats response:', response.data);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      console.error('Error details:', error.response?.data);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!connected) {
      console.log('⏸️ WebSocket not connected, skipping subscriptions');
      return;
    }

    console.log('🔔 Setting up notification subscriptions...');

    // Listen for dashboard refresh events
    const unsubscribeRefresh = subscribe('dashboard:refresh', () => {
      console.log('📊 Dashboard refresh triggered');
      fetchStats();
    });

    // Listen for new orders
    const unsubscribeNewOrder = subscribe('order:new', (order) => {
      console.log('🆕 NEW ORDER EVENT RECEIVED:', order);
      
      // Show toast notification
      addNotification({
        type: 'success',
        title: '🔔 New Order!',
        message: `Order ${order.orderNo} from Table ${order.tableNo || 'Customer'} - Rs. ${parseFloat(order.totalAmount).toFixed(2)}`,
        duration: 8000,
      });
      
      // Browser notification (if permission granted)
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('New Order Received!', {
          body: `Order ${order.orderNo} - Table ${order.tableNo} - Rs. ${parseFloat(order.totalAmount).toFixed(2)}`,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: 'new-order',
          requireInteraction: true,
        });
      }
      
      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.7;
        audio.play().catch(err => console.log('Sound play failed:', err));
      } catch (err) {
        console.log('Sound not available');
      }
      
      // Refresh stats
      fetchStats();
    });

    console.log('✅ Notification subscriptions active');

    // Listen for order status updates
    const unsubscribeStatusUpdate = subscribe('order:status-update', (order) => {
      console.log('Order status updated:', order);
      
      // Determine notification type based on status
      let notifType = 'info';
      let emoji = 'ℹ️';
      if (order.status === 'SERVED' || order.status === 'COMPLETED') {
        notifType = 'success';
        emoji = '✅';
      } else if (order.status === 'CANCELLED') {
        notifType = 'error';
        emoji = '❌';
      } else if (order.status === 'READY') {
        notifType = 'warning';
        emoji = '🔔';
      }
      
      // Show toast notification
      addNotification({
        type: notifType,
        title: `${emoji} Order ${order.status}`,
        message: `Order ${order.orderNo} - Table ${order.tableNo}`,
        duration: 5000,
      });
      
      // Browser notification for important status
      if (window.Notification && Notification.permission === 'granted' && order.status === 'READY') {
        new Notification('Order Ready!', {
          body: `Order ${order.orderNo} for Table ${order.tableNo} is ready to serve`,
          icon: '/logo192.png',
          tag: 'order-ready',
        });
      }
      
      // Refresh stats
      fetchStats();
    });

    return () => {
      unsubscribeRefresh();
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
    };
  }, [connected, subscribe, fetchStats, addNotification]);

  // Request notification permission (for browser notifications as backup)
  useEffect(() => {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getStatusBadge = (status) => {
    const statusMap = {
      'NEW': { class: 'warning', label: 'New' },
      'ACCEPTED': { class: 'info', label: 'Accepted' },
      'COOKING': { class: 'primary', label: 'Cooking' },
      'READY': { class: 'success', label: 'Ready' },
      'SERVED': { class: 'success', label: 'Completed' },
      'CANCELLED': { class: 'danger', label: 'Cancelled' }
    };
    return statusMap[status] || { class: 'secondary', label: status };
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
  };

  const isSuperAdmin = user?.role === 'super_admin';

  if (user?.role === 'kitchen') {
    return <Navigate to="/kitchen/dashboard" replace />;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="dashboard-content">
          <div className="container-fluid">
            {/* Welcome Header */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="welcome-card" key={animTrigger}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <motion.h2
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: {
                            transition: {
                              staggerChildren: 0.05
                            }
                          }
                        }}
                      >
                        <i className="fas fa-store me-2"></i>
                        {`Welcome back, ${user?.name || user?.email?.split('@')[0] || 'User'}!`.split("").map((char, index) => (
                          <motion.span
                            key={index}
                            variants={{
                              hidden: { opacity: 0 },
                              visible: { opacity: 1 }
                            }}
                          >
                            {char}
                          </motion.span>
                        ))}
                      </motion.h2>
                      <motion.p 
                        className="text-white mb-0" 
                        style={{ opacity: 0.9 }}
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: {
                            transition: {
                              staggerChildren: 0.03,
                              delayChildren: 0.5
                            }
                          }
                        }}
                      >
                        {"Here's what's happening with your restaurant today".split("").map((char, index) => (
                          <motion.span
                            key={index}
                            variants={{
                              hidden: { opacity: 0 },
                              visible: { opacity: 1 }
                            }}
                          >
                            {char}
                          </motion.span>
                        ))}
                      </motion.p>
                    </div>
                    <div>
                      {connected ? (
                        <span className="badge bg-success">
                          <i className="fas fa-circle me-1"></i>
                          Live Updates Active
                        </span>
                      ) : (
                        <span className="badge bg-warning">
                          <i className="fas fa-circle me-1"></i>
                          Connecting...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <motion.div 
              className="row g-4 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="col-xl-3 col-md-6">
                <div className="stats-card gradient-blue">
                  <div className="stats-icon">
                    <i className="fas fa-receipt"></i>
                  </div>
                  <div className="stats-content">
                    <h3>{stats.todayOrders}</h3>
                    <p>Today's Orders</p>
                  </div>
                </div>
              </div>

              <div className="col-xl-3 col-md-6">
                <div className="stats-card gradient-green">
                  <div className="stats-icon">
                    <i className="fas fa-wallet"></i>
                  </div>
                  <div className="stats-content">
                    <h3>${stats.totalRevenue.toLocaleString()}</h3>
                    <p>Total Revenue</p>
                  </div>
                </div>
              </div>

              <div className="col-xl-3 col-md-6">
                <div className="stats-card gradient-orange">
                  <div className="stats-icon">
                    <i className="fas fa-hourglass-half"></i>
                  </div>
                  <div className="stats-content">
                    <h3>{stats.pendingOrders}</h3>
                    <p>Pending Orders</p>
                  </div>
                </div>
              </div>

              <div className="col-xl-3 col-md-6">
                <div className="stats-card gradient-purple">
                  <div className="stats-icon">
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                  <div className="stats-content">
                    <h3>{stats.activeMenus}</h3>
                    <p>Active Menus</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Charts and Recent Orders */}
            <div className="row g-4">
              {/* Recent Orders */}
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="mb-0">
                      <i className="fas fa-concierge-bell me-2"></i>
                      Recent Orders
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Table/Room</th>
                            <th>Items</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan="6" className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              </td>
                            </tr>
                          ) : stats.recentOrders && stats.recentOrders.length > 0 ? (
                            stats.recentOrders.map((order) => {
                              const statusBadge = getStatusBadge(order.status);
                              return (
                                <tr key={order.orderId}>
                                  <td><span className="badge bg-primary">#{order.orderNo}</span></td>
                                  <td>{order.tableNo || (order.roomNo ? `Room ${order.roomNo}` : 'N/A')}</td>
                                  <td>{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</td>
                                  <td>${parseFloat(order.totalAmount).toFixed(2)}</td>
                                  <td><span className={`badge bg-${statusBadge.class}`}>{statusBadge.label}</span></td>
                                  <td>{getTimeAgo(order.createdAt)}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="6" className="text-center py-4 text-muted">
                                No recent orders
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
