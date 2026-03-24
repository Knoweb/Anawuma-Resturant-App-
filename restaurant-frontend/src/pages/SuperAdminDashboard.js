import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import axios from 'axios';
import './SuperAdminDashboard.css';

function SuperAdminDashboard({ children }) {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('manage-restaurants');
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const { socket, isConnected } = useWebSocket();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasLoggedBackendUnavailableRef = useRef(false);

  const API_URL = (() => {
    const envApiUrl = (
      process.env.REACT_APP_API_URL ||
      process.env.REACT_APP_API_BASE_URL ||
      ''
    ).trim();

    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocalFrontend = host === 'localhost' || host === '127.0.0.1';
      if (isLocalFrontend) {
        return 'http://localhost:3000/api';
      }
    }

    return envApiUrl || 'http://localhost:3000/api';
  })();

  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/settings-requests/pending/count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        hasLoggedBackendUnavailableRef.current = false;
        setPendingCount(response.data.data.count);
      }
    } catch (error) {
      if (!error?.response) {
        setPendingCount(0);
        if (!hasLoggedBackendUnavailableRef.current) {
          console.warn('Backend unavailable. Pending approval counters will resume once the API is reachable.');
          hasLoggedBackendUnavailableRef.current = true;
        }
        return;
      }

      console.error('Error fetching pending count:', error);
    }
  }, [API_URL, token]);

  const fetchPendingRegCount = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/restaurant/registrations/pending/count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        hasLoggedBackendUnavailableRef.current = false;
        setPendingRegCount(response.data.data.count);
      }
    } catch (error) {
      if (!error?.response) {
        setPendingRegCount(0);
        if (!hasLoggedBackendUnavailableRef.current) {
          console.warn('Backend unavailable. Pending registration counters will resume once the API is reachable.');
          hasLoggedBackendUnavailableRef.current = true;
        }
        return;
      }

      console.error('Error fetching pending registration count:', error);
    }
  }, [API_URL, token]);

  useEffect(() => {
    // Check if user is logged in and is super admin
    if (!isAuthenticated || !token || !user) {
      navigate('/login');
      return;
    }

    const userRole = user?.role?.toString().trim().toLowerCase();
    if (userRole !== 'super_admin' && userRole !== 'superadmin') {
      navigate('/login');
      return;
    }

    // Fetch pending count
    fetchPendingCount();
    fetchPendingRegCount();
  }, [isAuthenticated, token, user, navigate, fetchPendingCount, fetchPendingRegCount]);

  // WebSocket subscription for new settings requests
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewRequest = () => {
      setPendingCount(prev => prev + 1);
    };

    const handleReviewedRequest = () => {
      fetchPendingCount();
    };

    socket.on('settings-request:new', handleNewRequest);
    socket.on('settings-request:reviewed', handleReviewedRequest);

    return () => {
      socket.off('settings-request:new', handleNewRequest);
      socket.off('settings-request:reviewed', handleReviewedRequest);
    };
  }, [socket, isConnected, fetchPendingCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const loadContent = (view) => {
    setActiveView(view);
    navigate(`/super-admin/${view}`);
    // Refresh counts when navigating
    if (view !== 'pending-approvals') {
      fetchPendingCount();
    }
    if (view !== 'pending-registrations') {
      fetchPendingRegCount();
    }
  };

  return (
    <div className="sa-layout">

      {/* ── Fixed Navbar ── */}
      <nav className="sa-navbar">
        <button className="sa-hamburger" onClick={toggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <span className="sa-brand">Super Admin</span>
        <button className="sa-logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </nav>

      {/* ── Body (sidebar + content side by side) ── */}
      <div className="sa-body">

        {/* Mobile overlay */}
        {sidebarOpen && <div className="sa-overlay" onClick={closeSidebar}></div>}

        {/* Sidebar */}
        <aside className={`sa-sidebar${sidebarOpen ? ' open' : ''}`}>

          <nav className="sa-sidebar-nav">
            <button
              type="button"
              className={`sa-nav-link${activeView === 'manage-restaurants' ? ' active' : ''}`}
              onClick={() => { loadContent('manage-restaurants'); closeSidebar(); }}
            >
              <i className="fas fa-hotel"></i> All Hotels
            </button>
            <button
              type="button"
              className={`sa-nav-link${activeView === 'add-hotel' ? ' active' : ''}`}
              onClick={() => { loadContent('add-hotel'); closeSidebar(); }}
            >
              <i className="fas fa-plus-square"></i> Add Hotel
            </button>
            <button
              type="button"
              className={`sa-nav-link${activeView === 'add-admin' ? ' active' : ''}`}
              onClick={() => { loadContent('add-admin'); closeSidebar(); }}
            >
              <i className="fas fa-user-plus"></i> Add Admin
            </button>
            <button
              type="button"
              className={`sa-nav-link${activeView === 'pending-approvals' ? ' active' : ''}`}
              onClick={() => { loadContent('pending-approvals'); closeSidebar(); }}
            >
              <i className="fas fa-bell"></i> Pending Approvals
              {pendingCount > 0 && (
                <span className="sa-notification-badge">{pendingCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`sa-nav-link${activeView === 'pending-registrations' ? ' active' : ''}`}
              onClick={() => { loadContent('pending-registrations'); closeSidebar(); }}
            >
              <i className="fas fa-user-clock"></i> Pending Registrations
              {pendingRegCount > 0 && (
                <span className="sa-notification-badge">{pendingRegCount}</span>
              )}
            </button>
          </nav>
          <div className="sa-sidebar-footer">
            <div className="sa-footer-label">Logged in as:</div>
            <div className="sa-footer-email">{user?.email}</div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`sa-content${sidebarOpen ? ' sidebar-open' : ''}`}>
          <main>{children}</main>
          <footer className="sa-footer">
            <span>Copyright &copy; Knoweb PVT LTD {new Date().getFullYear()}</span>
          </footer>
        </div>

      </div>
    </div>
  );
}

export default SuperAdminDashboard;
