import axios from 'axios';

const LOCAL_API_BASE_URL = 'http://localhost:3000/api';

const isIpv4Host = (host) => /^(\d{1,3}\.){3}\d{1,3}$/.test(host);

const shouldUseEnvApiUrl = (envApiUrl, frontendHost) => {
  if (!envApiUrl) {
    return false;
  }

  if (envApiUrl.startsWith('/')) {
    return true;
  }

  try {
    const resolved = new URL(envApiUrl, window.location.origin);
    const envHost = resolved.hostname;

    // Prevent mixed content: if frontend is on HTTPS, never use insecure HTTP
    if (window.location.protocol === 'https:' && resolved.protocol === 'http:') {
      return false;
    }

    // If frontend is opened via LAN IP, ignore stale env host values.
    if (isIpv4Host(frontendHost) && envHost !== frontendHost) {
      return false;
    }

    // If frontend is opened via a domain (e.g. anawuma.com), ignore env values pointing to an IP or different host
    if (!isIpv4Host(frontendHost) && envHost !== frontendHost) {
      return false;
    }

    return true;
  } catch {
    // If env URL is malformed, fall back to current host logic.
    return false;
  }
};

const resolveApiBaseUrl = () => {
  const envApiUrl = (
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    ''
  ).trim();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalFrontend = host === 'localhost' || host === '127.0.0.1';

    // Prevent stale LAN IP config from breaking local development sessions.
    if (isLocalFrontend) {
      return LOCAL_API_BASE_URL;
    }

    // When opened on a domain (e.g. anawuma.com) or via HTTPS, use same-origin /api through reverse proxy
    if (window.location.protocol === 'https:' || (!isIpv4Host(host) && !isLocalFrontend)) {
      if (shouldUseEnvApiUrl(envApiUrl, host)) {
        return envApiUrl;
      }
      return '/api';
    }

    if (shouldUseEnvApiUrl(envApiUrl, host)) {
      return envApiUrl;
    }

    // When the frontend is opened via LAN IP, default API calls to the same host.
    const protocol = window.location.protocol || 'http:';
    return `${protocol}//${host}:3000/api`;
  }

  return envApiUrl || LOCAL_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrl();
export const BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Dynamically corrects URLs in response data to match the current host.
 * This is crucial for environments where the server's LAN IP may change.
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return url;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const currentProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const isLocal = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
  const isHttpsOrDomain = currentProtocol === 'https:' || (!isIpv4Host(currentHostname) && !isLocal);

  // Dynamically resolve base URL for this specific sanitize call.
  // When on HTTPS or domain, Nginx reverse-proxies /uploads, so do not append :3000!
  const dynamicBaseUrl = isLocal
    ? 'http://localhost:3000'
    : isHttpsOrDomain
    ? `${currentProtocol}//${currentHostname}`
    : `${currentProtocol}//${currentHostname}:3000`;

  // If it's a relative path, resolve it based on the type of asset
  if (!url.startsWith('http')) {
    const isBackendAsset = url.startsWith('/uploads') || url.startsWith('uploads/');
    const isFrontendAsset = url.startsWith('/assets') || url.startsWith('assets/');

    if (isBackendAsset) {
      return `${dynamicBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // For frontend assets, just return the path so it hits the current host/port (frontend server)
    if (isFrontendAsset) {
      return url;
    }

    // Generic fallback for other potential assets
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(url)) {
      return `${dynamicBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    return url;
  }

  try {
    const urlObj = new URL(url);

    // If accessing via domain or LAN IP, ensure absolute URLs point to current backend host
    if (currentHostname && !isLocal) {
      if (urlObj.hostname !== currentHostname) {
        urlObj.hostname = currentHostname;
        if (isHttpsOrDomain) {
          urlObj.protocol = currentProtocol;
          urlObj.port = '';
        } else {
          if (!urlObj.port) urlObj.port = '3000';
        }
        return urlObj.toString();
      }
    }
    return url;
  } catch {
    return url;
  }
};

/** Recursive helper to sanitize all URLs in an object/array. */
const sanitizeData = (data, parentKey = '') => {
  if (!data) return data;

  // Skip sanitization for Blobs to avoid corrupting file downloads (e.g., CSV reports)
  if (typeof window !== 'undefined' && data instanceof window.Blob) {
    return data;
  }

  if (typeof data === 'string') {
    const lowerKey = parentKey.toLowerCase();
    const isUrlKey = lowerKey.includes('url') || lowerKey.includes('image') || lowerKey.includes('logo') || lowerKey === 'qrimage';
    if (isUrlKey || data.startsWith('http')) {
      return sanitizeUrl(data);
    }
    return data;
  }

  if (Array.isArray(data)) return data.map(item => sanitizeData(item, parentKey));
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value, key);
    }
    return sanitized;
  }
  return data;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Add token to requests & ensure proper multipart boundary for FormData
apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
    }
  }
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const { state } = JSON.parse(authData);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
  } catch (parseError) {
    localStorage.removeItem('auth-storage');
  }

  return config;
});

// Handle response errors and sanitize data
apiClient.interceptors.response.use(
  (response) => {
    // Automatically sanitize all URLs in the response to match current IP
    if (response.data) {
      response.data = sanitizeData(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect to login if we are on a customer-facing public page
      const path = window.location.pathname;
      if (path.includes('/qr/') || path.includes('/room/')) {
        return Promise.reject(error);
      }

      // Clear auth and redirect to login
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }),

  getProfile: () =>
    apiClient.get('/auth/profile'),

  updateProfile: (data) =>
    apiClient.patch('/auth/profile', data),

  changePassword: (data) =>
    apiClient.patch('/auth/change-password', data),
};

export const dashboardAPI = {
  getStats: () =>
    apiClient.get('/dashboard/stats'),
};

export const reportsAPI = {
  getSummary: (date) =>
    apiClient.get('/reports/summary', { params: { date } }),

  getDailyReport: (date) =>
    apiClient.get('/reports/daily', { params: { date } }),

  getRangeReport: (from, to) =>
    apiClient.get('/reports/range', { params: { from, to } }),

  getMonthlyReport: (year, month) =>
    apiClient.get('/reports/monthly', { params: { year, month } }),

  getHistory: (limit = 20) =>
    apiClient.get('/reports/history', { params: { limit } }),

  downloadDailyCsv: (date) =>
    apiClient.get('/reports/daily/csv', {
      params: { date },
      responseType: 'blob',
    }),

  downloadRangeCsv: (from, to) =>
    apiClient.get('/reports/range/csv', {
      params: { from, to },
      responseType: 'blob',
    }),

  downloadMonthlyCsv: (year, month) =>
    apiClient.get('/reports/monthly/csv', {
      params: { year, month },
      responseType: 'blob',
    }),
};

export const pricingAPI = {
  getPlans: (discount) =>
    apiClient.get('/pricing/plans', {
      params: Number.isFinite(discount) ? { discount } : {},
    }),
};

export const billingAPI = {
  /** Fetch all orders with READY status (waiting to be billed). */
  getReadyOrders: () =>
    apiClient.get('/billing/ready-orders'),

  /** Create or return an invoice snapshot for a specific order. */
  createInvoiceForOrder: (orderId) =>
    apiClient.post(`/billing/orders/${orderId}/create-invoice`),

  /**
   * Create an invoice for a READY order.
   * Transitions the order status to BILLED.
   * @param {Object} data - { orderId, taxAmount?, serviceCharge?, discountAmount? }
   */
  createInvoice: (data) =>
    apiClient.post('/billing/invoices', data),

  /** Fetch invoice history with optional query parameters. */
  getInvoices: (params) =>
    apiClient.get('/billing/invoices', { params }),

  /** Fetch invoices that were sent from KDS to cashier. */
  getCashierQueue: () =>
    apiClient.get('/billing/invoices/cashier-queue'),

  /** Fetch a single invoice by ID. */
  getInvoice: (id) =>
    apiClient.get(`/billing/invoices/${id}`),

  /** Mark a BILLED order as SERVED. */
  markServed: (orderId) =>
    apiClient.patch(`/billing/orders/${orderId}/mark-served`),

  /** Record that the WhatsApp bill was sent for an invoice. */
  markWhatsappSent: (invoiceId) =>
    apiClient.patch(`/billing/invoices/${invoiceId}/mark-whatsapp-sent`),

  /** Record that cashier printed the invoice. */
  markInvoicePrinted: (invoiceId) =>
    apiClient.patch(`/billing/invoices/${invoiceId}/mark-printed`),

  /** Push an invoice into the cashier dashboard queue. */
  sendInvoiceToCashier: (invoiceId) =>
    apiClient.patch(`/billing/invoices/${invoiceId}/send-to-cashier`),

  /** Mark an invoice as PAID. */
  markInvoicePaid: (invoiceId, data) =>
    apiClient.patch(`/billing/invoices/${invoiceId}/mark-paid`, data),

  /** Cashier day transactions for transfer review. */
  getCashierDayTransactions: (params) =>
    apiClient.get('/billing/cashier/day-transactions', { params }),

  /** Cashier sends day/selected transactions to accountant (manual/auto). */
  sendTransactionsToAccountant: (data) =>
    apiClient.post('/billing/accountant/send', data),

  /** Accountant receives pending transfer requests from cashier. */
  getAccountantPendingTransactions: (params) =>
    apiClient.get('/billing/accountant/pending', { params }),

  /** Accountant accepted transfer history. */
  getAccountantAcceptedTransactions: (params) =>
    apiClient.get('/billing/accountant/accepted', { params }),

  /** Accountant accepts pending transfers. */
  acceptTransactionsByAccountant: (data) =>
    apiClient.post('/billing/accountant/accept', data),

  rejectTransactionsByAccountant: (data) =>
    apiClient.post('/billing/accountant/reject', data),

  requestInvoiceDeletion: (invoiceId, data) =>
    apiClient.post(`/billing/invoices/${invoiceId}/delete-request`, data),

  getPendingDeleteRequests: () =>
    apiClient.get('/billing/delete-requests/pending'),

  approveDeleteRequest: (requestId, data) =>
    apiClient.post(`/billing/delete-requests/${requestId}/approve`, data),

  rejectDeleteRequest: (requestId, data) =>
    apiClient.post(`/billing/delete-requests/${requestId}/reject`, data),
};

apiClient.sanitizeUrl = sanitizeUrl;
export default apiClient;
