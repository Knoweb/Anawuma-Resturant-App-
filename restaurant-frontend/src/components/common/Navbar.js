import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import apiClient, { BASE_URL, sanitizeUrl } from '../../api/apiClient';
import Swal from 'sweetalert2';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const { subscribe, connected } = useWebSocket();

  const getRoleLabel = (role) => {
    const normalizedRole = role?.toString().trim().toLowerCase();
    switch (normalizedRole) {
      case 'super_admin':
      case 'superadmin':
        return 'Super Admin';
      case 'kitchen':
        return 'Kitchen';
      case 'housekeeper':
        return 'Housekeeper';
      case 'cashier':
        return 'Cashier';
      case 'accountant':
        return 'Accountant';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  // Listen for new orders and update notification count
  useEffect(() => {
    if (!connected) return;

    const unsubscribeNewOrder = subscribe('order:new', (order) => {
      setNotificationCount(prev => prev + 1);

      // Add to notification history
      const newNotif = {
        id: Date.now(),
        type: 'order',
        title: 'New Order',
        message: `Order ${order.orderNo} from Table ${order.tableNo}`,
        amount: order.totalAmount,
        time: new Date().toLocaleTimeString(),
        icon: 'shopping-cart',
        color: 'success'
      };

      setNotifications(prev => [newNotif, ...prev].slice(0, 10)); // Keep last 10
    });

    const unsubscribeStatusUpdate = subscribe('order:status-update', (order) => {
      setNotificationCount(prev => prev + 1);

      // Add to notification history
      const statusColors = {
        'READY': 'warning',
        'SERVED': 'success',
        'COMPLETED': 'success',
        'CANCELLED': 'danger'
      };

      const newNotif = {
        id: Date.now(),
        type: 'status',
        title: 'Order Updated',
        message: `Order ${order.orderNo} is ${order.status}`,
        time: new Date().toLocaleTimeString(),
        icon: 'info-circle',
        color: statusColors[order.status] || 'info'
      };

      setNotifications(prev => [newNotif, ...prev].slice(0, 10)); // Keep last 10
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
    };
  }, [connected, subscribe]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      // When opening, mark as read
      setNotificationCount(0);
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setNotificationCount(0);
    setShowNotifications(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out from the system',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#266668',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout!'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        Swal.fire({
          icon: 'success',
          title: 'Logged Out',
          text: 'You have been successfully logged out',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => {
          navigate('/login');
        }, 1000);
      }
    });
  };

  const toggleSidebar = () => {
    document.body.classList.toggle('sb-sidenav-toggled');
  };

  useEffect(() => {
    return () => {
      document.body.classList.remove('sb-sidenav-toggled');
    };
  }, []);

  const restaurantName = user?.restaurantName || 'Restaurant';
  const restaurantLogoUrl = user?.restaurantLogo
    ? sanitizeUrl(user.restaurantLogo.startsWith('http')
      ? user.restaurantLogo
      : `${BASE_URL}${user.restaurantLogo.startsWith('/') ? '' : '/'}${user.restaurantLogo}`)
    : null;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-gradient-primary">
      <div className="container-fluid">
        <div className="hotel-brand" title={restaurantName}>
          {restaurantLogoUrl ? (
            <img src={restaurantLogoUrl} alt={restaurantName} className="hotel-brand-logo" />
          ) : (
            <i className="fas fa-hotel hotel-brand-fallback"></i>
          )}
          <span className="hotel-brand-name">{restaurantName}</span>
        </div>

        <button className="btn btn-link text-white sidebar-toggle-btn" onClick={toggleSidebar} type="button">
          <i className="fas fa-bars"></i>
        </button>

        <div className="ms-auto d-flex align-items-center">
          {/* Notifications */}
          <div className="dropdown me-3 position-relative">
            <button
              className="btn btn-link text-white position-relative"
              type="button"
              onClick={toggleNotifications}
              title="Notifications"
            >
              <i className="fas fa-bell fa-lg"></i>
              {notificationCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger notification-badge">
                  {notificationCount}
                  <span className="visually-hidden">unread messages</span>
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="dropdown-menu dropdown-menu-end show" style={{
                width: '350px',
                maxHeight: '400px',
                overflowY: 'auto',
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '0.5rem'
              }}>
                <div className="dropdown-header d-flex justify-content-between align-items-center">
                  <span><i className="fas fa-bell me-2"></i>Notifications</span>
                  {notifications.length > 0 && (
                    <button
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={clearAllNotifications}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="dropdown-divider"></div>

                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="fas fa-bell-slash fa-2x mb-2"></i>
                    <p className="mb-0">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="dropdown-item-text border-bottom">
                      <div className="d-flex align-items-start py-2">
                        <div className={`me-3 text-${notif.color}`}>
                          <i className={`fas fa-${notif.icon} fa-lg`}></i>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1" style={{ fontSize: '0.9rem' }}>
                            {notif.title}
                          </h6>
                          <p className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
                            {notif.message}
                          </p>
                          {notif.amount && (
                            <p className="mb-0 text-success fw-bold" style={{ fontSize: '0.85rem' }}>
                              Rs. {parseFloat(notif.amount).toFixed(2)}
                            </p>
                          )}
                          <small className="text-muted">{notif.time}</small>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="dropdown">
            <button
              className="btn btn-link text-white dropdown-toggle d-flex align-items-center"
              type="button"
              style={{ textDecoration: 'none' }}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="user-avatar-modern me-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: '22px', height: '22px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div className="user-info text-start d-none d-md-block">
                <div className="user-name">{user?.name || user?.email?.split('@')[0] || 'User'}</div>
                <div className="user-role">{getRoleLabel(user?.role)}</div>
              </div>
            </button>

            {showDropdown && (
              <ul className="dropdown-menu dropdown-menu-end show">
                <li>
                  <a className="dropdown-item" href="/settings/profile">
                    <i className="fas fa-user me-2"></i>
                    Profile
                  </a>
                </li>
                <li>
                  <a className="dropdown-item" href="/settings/password">
                    <i className="fas fa-key me-2"></i>
                    Change Password
                  </a>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{ cursor: 'pointer' }}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                  </a>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
