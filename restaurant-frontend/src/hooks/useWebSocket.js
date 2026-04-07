import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const WebSocketContext = createContext(null);

const isIpv4Host = (host) => /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

const shouldUseEnvApiUrl = (envApiUrl, frontendHost) => {
  if (!envApiUrl) {
    return false;
  }

  try {
    const resolved = new URL(envApiUrl, window.location.origin);
    const envHost = resolved.hostname;

    // If frontend is opened via LAN IP, ignore stale env host values.
    if (isIpv4Host(frontendHost) && envHost !== frontendHost) {
      return false;
    }

    return true;
  } catch {
    // If env URL is malformed, fall back to current host logic.
    return false;
  }
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuthStore();
  const socketRef = useRef(null);
  const connectTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const hasLoggedUnavailableRef = useRef(false);

  const clearConnectTimer = useCallback(() => {
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    clearConnectTimer();
    clearRetryTimer();

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setSocket(null);
    setConnected(false);
  }, [clearConnectTimer, clearRetryTimer]);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
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
          return 'http://localhost:3000';
        }

        if (shouldUseEnvApiUrl(envApiUrl, host)) {
          return envApiUrl.replace(/\/api\/?$/, '');
        }

        const protocol = window.location.protocol || 'http:';
        return `${protocol}//${host}:3000`;
      }

      return (envApiUrl || 'http://localhost:3000/api').replace(/\/api\/?$/, '');
    })();

    let disposed = false;

    const scheduleReconnect = () => {
      if (
        disposed ||
        retryTimeoutRef.current ||
        connectTimeoutRef.current ||
        socketRef.current
      ) {
        return;
      }

      retryTimeoutRef.current = window.setTimeout(() => {
        retryTimeoutRef.current = null;
        void connectSocket();
      }, 10000);
    };

    const logUnavailableOnce = () => {
      if (hasLoggedUnavailableRef.current) {
        return;
      }

      console.warn(
        'Backend is unavailable on port 3000. WebSocket connection will retry automatically once the API is reachable.',
      );
      hasLoggedUnavailableRef.current = true;
    };

    const connectSocket = async () => {
      if (disposed || socketRef.current) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }
      } catch (error) {
        setConnected(false);
        logUnavailableOnce();
        scheduleReconnect();
        return;
      }

      if (disposed) return;

      hasLoggedUnavailableRef.current = false;

      const newSocket = io(`${API_URL}/events`, {
        transports: ['polling', 'websocket'],
        reconnection: false,
        timeout: 10000,
        autoConnect: false,
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on('connect', () => {
        if (disposed) {
          return;
        }

        setConnected(true);
        // Read latest user from ref - no dependency needed
        const currentUser = userRef.current;
        if (currentUser) {
          newSocket.emit('authenticate', {
            userId: currentUser.id,
            role: currentUser.role,
          });
        }
      });

      newSocket.on('disconnect', (reason) => {
        if (disposed) {
          return;
        }

        if (socketRef.current === newSocket) {
          socketRef.current = null;
          setSocket(null);
        }

        setConnected(false);

        if (reason !== 'io client disconnect') {
          scheduleReconnect();
        }
      });

      newSocket.on('connect_error', () => {
        if (disposed) {
          return;
        }

        if (socketRef.current === newSocket) {
          socketRef.current = null;
          setSocket(null);
        }

        setConnected(false);
        logUnavailableOnce();
        newSocket.disconnect();
        scheduleReconnect();
      });

      newSocket.connect();
    };

    connectTimeoutRef.current = window.setTimeout(() => {
      connectTimeoutRef.current = null;
      void connectSocket();
    }, 0);

    return () => {
      disposed = true;
      clearConnectTimer();
      disconnectSocket();
    };
  }, [clearConnectTimer, disconnectSocket]); // Removed 'user' - use userRef instead

  const subscribe = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  }, [socket]);

  const emit = useCallback((event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  }, [socket, connected]);

  const value = {
    socket,
    connected,
    isConnected: connected,
    subscribe,
    emit,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
