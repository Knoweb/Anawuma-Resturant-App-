import React, { createContext, useContext, useState, useCallback } from 'react';
import './NotificationToast.css';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      duration: notification.duration || 5000,
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const value = {
    addNotification,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-toast notification-${notification.type}`}
          >
            <div className="notification-content">
              <div className="notification-header">
                <strong>{notification.title}</strong>
                <button
                  className="notification-close"
                  onClick={() => removeNotification(notification.id)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="notification-message">{notification.message}</div>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
