import React, { useCallback, useEffect, useRef, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import { billingAPI } from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import './ServiceBillingDashboard.css';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function normalizeWhatsAppNumber(raw) {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '94' + digits.slice(1);
  if (!digits.startsWith('94')) digits = '94' + digits;
  return '+' + digits;
}

function formatCurrency(val) {
  return 'Rs. ' + parseFloat(val || 0).toFixed(2);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOrderAge(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m ago`;
}

// ---------------------------------------------------------------------------
// Printable Invoice component (rendered off-screen, triggered by window.print)
// ---------------------------------------------------------------------------

function PrintableInvoice({ invoice, restaurantName }) {
  const items = Array.isArray(invoice.orderItemsJson) ? invoice.orderItemsJson : [];
  return (
    <div id="printable-invoice" className="printable-invoice">
      <div className="pi-header">
        <div className="pi-restaurant">{restaurantName || 'Restaurant'}</div>
        <div className="pi-title">TAX INVOICE</div>
        <div className="pi-meta">
          <span><strong>Invoice #:</strong> {invoice.invoiceNumber}</span>
          <span>
            <strong>Order #:</strong> {invoice.orderNo || (invoice.orderId ? `#${invoice.orderId}` : '–')}
          </span>
        </div>
        <div className="pi-meta">
          <span><strong>Date:</strong> {formatDateTime(invoice.createdAt)}</span>
        </div>
        {invoice.tableNo && (
          <div className="pi-meta">
            <span><strong>Table:</strong> {invoice.tableNo}</span>
            {invoice.customerName && (
              <span><strong>Customer:</strong> {invoice.customerName}</span>
            )}
          </div>
        )}
      </div>

      <table className="pi-items">
        <thead>
          <tr>
            <th>Item</th>
            <th className="pi-center">Qty</th>
            <th className="pi-right">Unit</th>
            <th className="pi-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>{item.itemName}{item.notes ? <span className="pi-note"> ({item.notes})</span> : ''}</td>
              <td className="pi-center">{item.qty}</td>
              <td className="pi-right">{formatCurrency(item.unitPrice)}</td>
              <td className="pi-right">{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pi-totals">
        <div className="pi-total-row"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
        {parseFloat(invoice.taxAmount) > 0 && (
          <div className="pi-total-row"><span>Tax</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
        )}
        {parseFloat(invoice.serviceCharge) > 0 && (
          <div className="pi-total-row"><span>Service Charge</span><span>{formatCurrency(invoice.serviceCharge)}</span></div>
        )}
        {parseFloat(invoice.discountAmount) > 0 && (
          <div className="pi-total-row pi-discount"><span>Discount</span><span>– {formatCurrency(invoice.discountAmount)}</span></div>
        )}
        <div className="pi-total-row pi-grand-total"><span>TOTAL</span><span>{formatCurrency(invoice.totalAmount)}</span></div>
      </div>

      <div className="pi-footer">Thank you for dining with us!</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice Detail Modal
// ---------------------------------------------------------------------------

function InvoiceModal({ invoice, restaurantName, onClose, onMarkServed, onMarkPaid }) {
  const printRef = useRef();

  const handlePrint = async () => {
    if (invoice.onBeforePrint) {
      await invoice.onBeforePrint();
    }
    const printModeClass = 'billing-invoice-print-mode';
    const cleanupPrintMode = () => {
      document.body.classList.remove(printModeClass);
    };

    document.body.classList.add(printModeClass);
    window.addEventListener('afterprint', cleanupPrintMode, { once: true });
    window.print();
    window.setTimeout(cleanupPrintMode, 1000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-modal-header">
          <h5>Invoice #{invoice.invoiceNumber}</h5>
          <button className="btn-icon" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="invoice-modal-body" ref={printRef}>
          <PrintableInvoice invoice={invoice} restaurantName={restaurantName} />
        </div>

        <div className="invoice-modal-footer">
          <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          {invoice.invoiceStatus === 'PENDING' && (
            <button className="btn btn-success btn-sm" onClick={onMarkPaid}>
              <i className="fas fa-check-circle me-1"></i>Mark Paid
            </button>
          )}
          {onMarkServed && (
            <button className="btn btn-primary btn-sm" onClick={onMarkServed}>
              <i className="fas fa-concierge-bell me-1"></i>Mark Served
            </button>
          )}
          <button className="btn btn-dark btn-sm" onClick={handlePrint}>
            <i className="fas fa-print me-1"></i>Print
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Invoice Modal (charge extras before printing)
// ---------------------------------------------------------------------------

function CreateInvoiceModal({ order, onConfirm, onClose, loading }) {
  const [taxAmount, setTaxAmount] = useState('0');
  const [serviceCharge, setServiceCharge] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');

  const subtotal = parseFloat(order.totalAmount || 0);
  const tax = parseFloat(taxAmount) || 0;
  const charge = parseFloat(serviceCharge) || 0;
  const discount = parseFloat(discountAmount) || 0;
  const total = subtotal + tax + charge - discount;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ orderId: order.orderId, taxAmount: tax, serviceCharge: charge, discountAmount: discount });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="create-invoice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-modal-header">
          <h5>Create Invoice – Order {order.orderNo}</h5>
          <button className="btn-icon" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="invoice-modal-body">
            <div className="ci-row">
              <label>Subtotal</label>
              <span className="ci-value">{formatCurrency(subtotal)}</span>
            </div>
            <div className="ci-row ci-input-row">
              <label htmlFor="tax">Tax Amount</label>
              <input
                id="tax"
                type="number" min="0" step="0.01"
                className="form-control form-control-sm ci-input"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
              />
            </div>
            <div className="ci-row ci-input-row">
              <label htmlFor="service">Service Charge</label>
              <input
                id="service"
                type="number" min="0" step="0.01"
                className="form-control form-control-sm ci-input"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
              />
            </div>
            <div className="ci-row ci-input-row">
              <label htmlFor="discount">Discount</label>
              <input
                id="discount"
                type="number" min="0" step="0.01"
                className="form-control form-control-sm ci-input"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div className="ci-row ci-grand-total">
              <label>Grand Total</label>
              <span className="ci-value ci-total">{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="invoice-modal-footer">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</>
              ) : (
                <><i className="fas fa-print me-1"></i>Save & Print Invoice</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

const ServiceBillingDashboard = ({
  pageTitle = 'Service & Billing',
  pageIcon = 'fas fa-file-invoice-dollar',
  cashierTab = 'queue',
}) => {
  const { user } = useAuthStore();
  const { subscribe, connected } = useWebSocket();
  const isCashierDashboard = user?.role === 'cashier';
  const resolvedCashierTab = isCashierDashboard ? cashierTab : 'queue';
  const showCashierTransfersSection =
    isCashierDashboard && resolvedCashierTab === 'transfers';
  const showCashierQueueSection =
    !isCashierDashboard || resolvedCashierTab === 'queue';
  const showInvoiceHistorySection =
    !isCashierDashboard || resolvedCashierTab === 'history';
  const autoTransferStorageKey = `cashier-auto-transfer:${user?.restaurantId || 'global'}`;
  const autoSendInFlightRef = useRef(false);
  const toastTimerRef = useRef(null);

  // Ready orders state
  const [readyOrders, setReadyOrders] = useState([]);
  const [loadingReady, setLoadingReady] = useState(true);
  const [readyError, setReadyError] = useState('');

  // Cashier queue state
  const [cashierQueue, setCashierQueue] = useState([]);
  const [loadingCashierQueue, setLoadingCashierQueue] = useState(true);
  const [cashierQueueError, setCashierQueueError] = useState('');

  // Cashier -> Accountant transfer state
  const [transferDate, setTransferDate] = useState(getLocalDateString());
  const [cashierTransactions, setCashierTransactions] = useState([]);
  const [selectedTransferIds, setSelectedTransferIds] = useState(new Set());
  const [loadingTransferTransactions, setLoadingTransferTransactions] = useState(true);
  const [transferError, setTransferError] = useState('');
  const [sendingToAccountant, setSendingToAccountant] = useState(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState(() => {
    const raw = localStorage.getItem('cashier-auto-send-enabled');
    return raw == null ? true : raw === '1';
  });

  // Invoice history state
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [invError, setInvError] = useState('');

  // Filter state for invoice history
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterTable, setFilterTable] = useState('');

  // Modal state
  const [createModalOrder, setCreateModalOrder] = useState(null);
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);

  // Notification helper
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const getTransferEligibleIds = useCallback((transactions) => {
    return (Array.isArray(transactions) ? transactions : [])
      .filter((invoice) => (invoice.accountantTransferStatus || 'NONE') !== 'PENDING')
      .map((invoice) => invoice.invoiceId);
  }, []);

  // Fetch READY orders
  const fetchReadyOrders = useCallback(async () => {
    try {
      setReadyError('');
      const res = await billingAPI.getReadyOrders();
      setReadyOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setReadyError(err?.response?.data?.message || 'Failed to load ready orders.');
    } finally {
      setLoadingReady(false);
    }
  }, []);

  const fetchCashierQueue = useCallback(async () => {
    try {
      setCashierQueueError('');
      const res = await billingAPI.getCashierQueue();
      setCashierQueue(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCashierQueueError(err?.response?.data?.message || 'Failed to load cashier queue.');
    } finally {
      setLoadingCashierQueue(false);
    }
  }, []);

  const fetchCashierTransactions = useCallback(async (dateValue) => {
    if (!isCashierDashboard) return;

    try {
      setTransferError('');
      const res = await billingAPI.getCashierDayTransactions({ date: dateValue });
      const transactions = Array.isArray(res.data) ? res.data : [];
      setCashierTransactions(transactions);

      const validIds = new Set(transactions.map((invoice) => invoice.invoiceId));
      setSelectedTransferIds((prev) => {
        const next = new Set();
        prev.forEach((id) => {
          if (validIds.has(id)) next.add(id);
        });
        return next;
      });
    } catch (err) {
      setTransferError(err?.response?.data?.message || 'Failed to load cashier transactions.');
      setCashierTransactions([]);
      setSelectedTransferIds(new Set());
    } finally {
      setLoadingTransferTransactions(false);
    }
  }, [isCashierDashboard]);

  // Fetch invoice history
  const fetchInvoices = useCallback(async () => {
    try {
      setInvError('');
      const params = {};
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (filterTable) params.tableNo = filterTable;
      const res = await billingAPI.getInvoices(params);
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setInvError(err?.response?.data?.message || 'Failed to load invoices.');
    } finally {
      setLoadingInvoices(false);
    }
  }, [filterFrom, filterTo, filterTable]);

  useEffect(() => {
    fetchCashierQueue();
    fetchReadyOrders();
  }, [fetchCashierQueue, fetchReadyOrders]);
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    if (!isCashierDashboard) return;
    setLoadingTransferTransactions(true);
    fetchCashierTransactions(transferDate);
  }, [fetchCashierTransactions, isCashierDashboard, transferDate]);

  // Auto-refresh via WebSocket
  useEffect(() => {
    if (!connected) return;
    const unsubscribers = [
      subscribe('dashboard:refresh', () => {
        fetchCashierQueue();
        fetchReadyOrders();
        if (isCashierDashboard) {
          fetchCashierTransactions(transferDate);
        }
        fetchInvoices();
      }),
      subscribe('cashier:queue-update', fetchCashierQueue),
      subscribe('accountant:transfer-updated', (payload) => {
        if (!isCashierDashboard || payload?.restaurantId !== user?.restaurantId) return;
        fetchCashierTransactions(transferDate);
      }),
      subscribe('accountant:transfer-reviewed', (payload) => {
        if (!isCashierDashboard || payload?.restaurantId !== user?.restaurantId) return;
        fetchCashierTransactions(transferDate);
        showToast(
          payload?.action === 'ACCEPTED'
            ? `${payload.count || 0} transaction(s) accepted by accountant.`
            : `${payload.count || 0} transaction(s) were kept with cashier.`,
          payload?.action === 'ACCEPTED' ? 'success' : 'error',
        );
      }),
      subscribe('order:status-update', () => {
        fetchReadyOrders();
      }),
      subscribe('order:new', () => {
        fetchReadyOrders();
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    connected,
    fetchCashierQueue,
    fetchCashierTransactions,
    fetchInvoices,
    fetchReadyOrders,
    isCashierDashboard,
    showToast,
    subscribe,
    transferDate,
    user?.restaurantId,
  ]);

  // Polling fallback (30s)
  useEffect(() => {
    const id = setInterval(() => {
      fetchCashierQueue();
      fetchReadyOrders();
      if (isCashierDashboard) {
        fetchCashierTransactions(transferDate);
      }
    }, 120000); // 2 minute safety fallback
    return () => clearInterval(id);
  }, [fetchCashierQueue, fetchCashierTransactions, fetchReadyOrders, isCashierDashboard, transferDate]);

  useEffect(() => {
    localStorage.setItem('cashier-auto-send-enabled', autoSendEnabled ? '1' : '0');
  }, [autoSendEnabled]);

  const sendTransactionsToAccountant = useCallback(async ({
    dateValue,
    mode = 'MANUAL',
    invoiceIds,
    silentNoData = false,
  }) => {
    const payload = {
      date: dateValue,
      mode,
    };

    if (Array.isArray(invoiceIds) && invoiceIds.length > 0) {
      payload.invoiceIds = invoiceIds;
    }

    try {
      setSendingToAccountant(true);
      const res = await billingAPI.sendTransactionsToAccountant(payload);
      const sentCount = res?.data?.count || invoiceIds?.length || 0;
      showToast(
        mode === 'AUTO'
          ? `Auto-sent ${sentCount} transaction(s) to accountant.`
          : res?.data?.message || 'Transactions sent to accountant.',
      );

      if (mode === 'AUTO') {
        localStorage.setItem(autoTransferStorageKey, dateValue);
      }

      setSelectedTransferIds(new Set());
      fetchCashierTransactions(transferDate === dateValue ? dateValue : transferDate);
      fetchCashierQueue();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send transactions to accountant.';
      if (!silentNoData || !msg.toLowerCase().includes('no eligible transactions')) {
        showToast(msg, 'error');
      }
      throw err;
    } finally {
      setSendingToAccountant(false);
    }
  }, [
    autoTransferStorageKey,
    fetchCashierQueue,
    fetchCashierTransactions,
    showToast,
    transferDate,
  ]);

  const handleManualSendToAccountant = async () => {
    const eligibleIds = getTransferEligibleIds(cashierTransactions);
    if (eligibleIds.length === 0) {
      showToast('All transactions are already waiting for accountant review.', 'error');
      return;
    }

    const requestedIds = Array.from(selectedTransferIds);
    const selectedEligibleIds = requestedIds.filter((id) => eligibleIds.includes(id));
    const invoiceIds = selectedEligibleIds.length > 0 ? selectedEligibleIds : eligibleIds;

    await sendTransactionsToAccountant({
      dateValue: transferDate,
      mode: 'MANUAL',
      invoiceIds,
    });
  };

  const runAutoSendIfDue = useCallback(async () => {
    if (!isCashierDashboard || !autoSendEnabled || autoSendInFlightRef.current) {
      return;
    }

    const now = new Date();
    const currentDate = getLocalDateString(now);
    const lastAutoSentDate = localStorage.getItem(autoTransferStorageKey);

    if (lastAutoSentDate === currentDate) {
      return;
    }

    const isEndOfDayWindow = now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 55);
    if (!isEndOfDayWindow) {
      return;
    }

    autoSendInFlightRef.current = true;
    try {
      const hasSameDateLoaded = transferDate === currentDate;
      const transactions = hasSameDateLoaded
        ? cashierTransactions
        : (await billingAPI.getCashierDayTransactions({ date: currentDate }))?.data || [];

      const eligibleIds = getTransferEligibleIds(transactions);
      if (eligibleIds.length === 0) {
        localStorage.setItem(autoTransferStorageKey, currentDate);
        return;
      }

      await sendTransactionsToAccountant({
        dateValue: currentDate,
        mode: 'AUTO',
        invoiceIds: eligibleIds,
        silentNoData: true,
      });
    } catch {
      // A visible toast is already shown by sendTransactionsToAccountant.
    } finally {
      autoSendInFlightRef.current = false;
    }
  }, [
    autoSendEnabled,
    autoTransferStorageKey,
    cashierTransactions,
    getTransferEligibleIds,
    isCashierDashboard,
    sendTransactionsToAccountant,
    transferDate,
  ]);

  useEffect(() => {
    if (!isCashierDashboard || !autoSendEnabled) return;

    runAutoSendIfDue();
    const timerId = setInterval(runAutoSendIfDue, 60 * 1000);
    return () => clearInterval(timerId);
  }, [autoSendEnabled, isCashierDashboard, runAutoSendIfDue]);

  const transferEligibleIds = getTransferEligibleIds(cashierTransactions);
  const selectedTransferCount = Array.from(selectedTransferIds).filter((id) => transferEligibleIds.includes(id)).length;
  const selectableTransferCount = transferEligibleIds.length;
  const allTransferRowsSelected =
    selectableTransferCount > 0 &&
    transferEligibleIds.every((id) => selectedTransferIds.has(id));

  const toggleTransferSelection = (invoiceId) => {
    setSelectedTransferIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const toggleAllTransferSelection = () => {
    if (allTransferRowsSelected) {
      setSelectedTransferIds(new Set());
      return;
    }

    setSelectedTransferIds(new Set(transferEligibleIds));
  };

  // Create invoice flow
  const handleOpenCreateModal = (order) => setCreateModalOrder(order);

  const handleConfirmCreateInvoice = async (dto) => {
    setCreatingLoading(true);
    try {
      const res = await billingAPI.createInvoice(dto);
      setCreatingLoading(false);
      setCreateModalOrder(null);
      showToast(`Invoice ${res.data.invoiceNumber} saved!`);
      // Remove order from ready list, refresh invoices & open preview
      setReadyOrders((prev) => prev.filter((o) => o.orderId !== dto.orderId));
      setViewInvoice(res.data);
      fetchInvoices();
    } catch (err) {
      setCreatingLoading(false);
      showToast(err?.response?.data?.message || 'Failed to create invoice.', 'error');
    }
  };

  // Mark served
  const handleMarkServed = async (orderId) => {
    try {
      await billingAPI.markServed(orderId);
      setViewInvoice(null);
      showToast('Order marked as served!');
      fetchInvoices();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to mark as served.', 'error');
    }
  };

  // Mark paid
  const handleMarkPaid = async (invoiceId) => {
    try {
      const res = await billingAPI.markInvoicePaid(invoiceId);
      setViewInvoice(res.data);
      fetchCashierQueue();
      fetchInvoices();
      showToast('Invoice marked as paid!');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed.', 'error');
    }
  };

  const handleCashierPrint = async (invoice) => {
    try {
      if (!invoice.isPrinted) {
        const res = await billingAPI.markInvoicePrinted(invoice.invoiceId);
        const updatedInvoice = res.data;
        setCashierQueue((prev) => prev.map((item) => (
          item.invoiceId === updatedInvoice.invoiceId ? updatedInvoice : item
        )));
        setInvoices((prev) => prev.map((item) => (
          item.invoiceId === updatedInvoice.invoiceId ? updatedInvoice : item
        )));
        setViewInvoice((prev) => (prev?.invoiceId === updatedInvoice.invoiceId ? updatedInvoice : prev));
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to record invoice print.', 'error');
    }
  };

  const restaurantName = user?.restaurantName || 'Restaurant';

  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="content-title">
                <i className={`${pageIcon} me-2 text-primary`}></i>
                {pageTitle}
              </h1>
              <div className="d-flex align-items-center gap-2">
                <span className={`ws-badge ${connected ? 'ws-connected' : 'ws-disconnected'}`}>
                  <i className={`fas fa-circle me-1 ${connected ? 'text-success' : 'text-danger'}`}></i>
                  {connected ? 'Live' : 'Offline'}
                </span>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    if (isCashierDashboard) {
                      fetchCashierQueue();
                      fetchCashierTransactions(transferDate);
                    } else {
                      fetchReadyOrders();
                    }
                    fetchInvoices();
                  }}
                >
                  <i className="fas fa-sync-alt me-1"></i>Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="container-fluid">

            {showCashierTransfersSection && (
              <section className="billing-section mb-4">
                <div className="section-heading d-flex justify-content-between align-items-center gap-2 flex-wrap">
                  <span>
                    <i className="fas fa-share-square text-success me-2"></i>
                    Cashier to Accountant Transfers
                  </span>
                  <span className="badge bg-success-subtle text-success-emphasis border">
                    {cashierTransactions.length} transactions
                  </span>
                </div>

                <div className="transfer-toolbar mb-3">
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="auto-send-switch"
                      checked={autoSendEnabled}
                      onChange={(e) => setAutoSendEnabled(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="auto-send-switch">
                      Auto send at end of day (11:55 PM)
                    </label>
                  </div>

                  <input
                    type="date"
                    className="form-control form-control-sm transfer-date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />

                  <button
                    className="btn btn-sm btn-success"
                    onClick={handleManualSendToAccountant}
                    disabled={sendingToAccountant || selectableTransferCount === 0}
                  >
                    {sendingToAccountant ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-1"></i>
                        Send to Accountant
                      </>
                    )}
                  </button>
                </div>

                {selectedTransferCount > 0 && (
                  <div className="alert alert-info py-2 px-3 mb-3 small">
                    {selectedTransferCount} selected transaction(s) will be sent.
                  </div>
                )}

                {loadingTransferTransactions ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-success"></div>
                  </div>
                ) : transferError ? (
                  <div className="alert alert-danger">{transferError}</div>
                ) : cashierTransactions.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-file-invoice-dollar text-muted fa-2x mb-2"></i>
                    <p className="mb-0">No PAID transactions found for selected date.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover invoice-table mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <input
                              type="checkbox"
                              checked={allTransferRowsSelected}
                              onChange={toggleAllTransferSelection}
                            />
                          </th>
                          <th>Invoice #</th>
                          <th>Order #</th>
                          <th>Table</th>
                          <th>Total</th>
                          <th>Paid At</th>
                          <th>Transfer Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashierTransactions.map((inv) => {
                          const isPendingReview = (inv.accountantTransferStatus || 'NONE') === 'PENDING';
                          return (
                            <tr key={inv.invoiceId}>
                              <td>
                                <input
                                  type="checkbox"
                                  disabled={isPendingReview}
                                  checked={selectedTransferIds.has(inv.invoiceId)}
                                  onChange={() => toggleTransferSelection(inv.invoiceId)}
                                />
                              </td>
                              <td><code>{inv.invoiceNumber}</code></td>
                              <td>{inv.orderNo || inv.orderId}</td>
                              <td>{inv.tableNo || '–'}</td>
                              <td>{formatCurrency(inv.totalAmount)}</td>
                              <td>{formatDateTime(inv.updatedAt)}</td>
                              <td>
                                <span className={`badge ${isPendingReview ? 'bg-warning text-dark' : 'bg-primary'}`}>
                                  {isPendingReview ? 'Pending Accountant' : 'With Cashier'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ── SECTION 1: Ready to Bill ── */}
            {showCashierQueueSection && !isCashierDashboard && (
              <section className="billing-section mb-4">
                <div className="section-heading">
                  <i className="fas fa-bell text-warning me-2"></i>
                  Ready to Bill
                  <span className="badge bg-warning text-dark ms-2">{readyOrders.length}</span>
                </div>

                {loadingReady ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary"></div>
                  </div>
                ) : readyError ? (
                  <div className="alert alert-danger">{readyError}</div>
                ) : readyOrders.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-check-circle text-success fa-2x mb-2"></i>
                    <p className="mb-0">No orders waiting to be billed.</p>
                  </div>
                ) : (
                  <div className="ready-orders-grid">
                    {readyOrders.map((order) => (
                      <ReadyOrderCard
                        key={order.orderId}
                        order={order}
                        onBill={() => handleOpenCreateModal(order)}
                        onWhatsApp={() => {
                          const phone = normalizeWhatsAppNumber(order.whatsappNumber);
                          if (!phone) { showToast('No WhatsApp number.', 'error'); return; }
                          const itemLines = (order.orderItems || []).map((i) => `  • ${i.itemName} x${i.qty}`).join('\n');
                          const msg = `🍽️ *Order Ready!*\nOrder: ${order.orderNo}\nTable: ${order.tableNo || '–'}\n\n${itemLines}\n\n*Total: ${formatCurrency(order.totalAmount)}*`;
                          window.open(`https://api.whatsapp.com/send?phone=${phone.replace('+', '')}&text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── SECTION 1.5: Cashier Queue ── */}
            {showCashierQueueSection && (
              <section className="billing-section">
                <div className="section-heading">
                  <i className="fas fa-cash-register text-primary me-2"></i>
                  Cashier Queue
                  <span className="badge bg-primary ms-2">{cashierQueue.length}</span>
                </div>

                {loadingCashierQueue ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary"></div>
                  </div>
                ) : cashierQueueError ? (
                  <div className="alert alert-danger">{cashierQueueError}</div>
                ) : cashierQueue.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-inbox text-primary fa-2x mb-2"></i>
                    <p className="mb-0">No payment details waiting for cashier.</p>
                  </div>
                ) : (
                  <div className="ready-orders-grid">
                    {cashierQueue.map((invoice) => (
                      <CashierQueueCard
                        key={invoice.invoiceId}
                        invoice={invoice}
                        onOpen={() => setViewInvoice(invoice)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── SECTION 2: Invoice History ── */}
            {showInvoiceHistorySection && (
              <section className={`billing-section ${showCashierQueueSection ? 'mt-4' : ''}`.trim()}>
              <div className="section-heading">
                <i className="fas fa-history text-primary me-2"></i>
                Invoice History
              </div>

              {/* Filters */}
              <div className="invoice-filters mb-3">
                <input
                  type="date"
                  className="form-control form-control-sm filter-field"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  placeholder="From"
                  title="From date"
                />
                <input
                  type="date"
                  className="form-control form-control-sm filter-field"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  placeholder="To"
                  title="To date"
                />
                <input
                  type="text"
                  className="form-control form-control-sm filter-field"
                  value={filterTable}
                  onChange={(e) => setFilterTable(e.target.value)}
                  placeholder="Table #"
                />
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterTable(''); }}
                >
                  <i className="fas fa-times me-1"></i>Clear
                </button>
              </div>

              {loadingInvoices ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary"></div>
                </div>
              ) : invError ? (
                <div className="alert alert-danger">{invError}</div>
              ) : invoices.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-file-alt text-muted fa-2x mb-2"></i>
                  <p className="mb-0">No invoices found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover invoice-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Table</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.invoiceId}>
                          <td><code>{inv.invoiceNumber}</code></td>
                          <td>{inv.tableNo || '–'}</td>
                          <td>{inv.customerName || '–'}</td>
                          <td>{formatCurrency(inv.totalAmount)}</td>
                          <td>
                            <span className={`badge ${inv.invoiceStatus === 'PAID' ? 'bg-success' : 'bg-secondary'}`}>
                              {inv.invoiceStatus}
                            </span>
                          </td>
                          <td className="text-muted small">{formatDateTime(inv.createdAt)}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setViewInvoice(inv)}
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
              </section>
            )}

          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {createModalOrder && (
        <CreateInvoiceModal
          order={createModalOrder}
          loading={creatingLoading}
          onConfirm={handleConfirmCreateInvoice}
          onClose={() => setCreateModalOrder(null)}
        />
      )}

      {viewInvoice && (
        <InvoiceModal
          invoice={{
            ...viewInvoice,
            onBeforePrint: isCashierDashboard ? () => handleCashierPrint(viewInvoice) : undefined,
          }}
          restaurantName={restaurantName}
          onClose={() => setViewInvoice(null)}
          onMarkServed={
            !isCashierDashboard && viewInvoice.orderId
              ? () => handleMarkServed(viewInvoice.orderId)
              : null
          }
          onMarkPaid={() => handleMarkPaid(viewInvoice.invoiceId)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`billing-toast billing-toast-${toast.type}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2`}></i>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Ready Order Card sub-component
// ---------------------------------------------------------------------------

function ReadyOrderCard({ order, onBill, onWhatsApp }) {
  const items = order.orderItems || [];
  const age = getOrderAge(order.createdAt);

  return (
    <div className="ready-order-card">
      <div className="roc-header">
        <span className="roc-order-no">{order.orderNo}</span>
        <span className="roc-age text-muted">{age}</span>
        <span className="badge bg-success ms-auto">READY</span>
      </div>
      <div className="roc-meta">
        {order.tableNo && <span><i className="fas fa-chair me-1"></i>Table {order.tableNo}</span>}
        {order.customerName && <span><i className="fas fa-user me-1"></i>{order.customerName}</span>}
      </div>
      <ul className="roc-items">
        {items.slice(0, 4).map((item, i) => (
          <li key={i}>
            <span>{item.itemName}</span>
            <span className="text-muted">&times;{item.qty}</span>
          </li>
        ))}
        {items.length > 4 && <li className="text-muted small">+{items.length - 4} more…</li>}
      </ul>
      <div className="roc-total">{formatCurrency(order.totalAmount)}</div>
      <div className="roc-actions">
        <button className="btn btn-primary btn-sm flex-grow-1" onClick={onBill}>
          <i className="fas fa-print me-1"></i>Print Invoice
        </button>
        {order.whatsappNumber && (
          <button className="btn btn-whatsapp btn-sm" onClick={onWhatsApp} title="Send via WhatsApp">
            <i className="fab fa-whatsapp"></i>
          </button>
        )}
      </div>
    </div>
  );
}

function CashierQueueCard({ invoice, onOpen }) {
  return (
    <div className="ready-order-card">
      <div className="roc-header">
        <span className="roc-order-no">{invoice.invoiceNumber}</span>
        <span className="badge bg-primary ms-auto">CASHIER</span>
      </div>
      <div className="roc-meta">
        {invoice.tableNo && <span><i className="fas fa-chair me-1"></i>Table {invoice.tableNo}</span>}
        {invoice.customerName && <span><i className="fas fa-user me-1"></i>{invoice.customerName}</span>}
      </div>
      <ul className="roc-items">
        {(Array.isArray(invoice.orderItemsJson) ? invoice.orderItemsJson : []).slice(0, 4).map((item, i) => (
          <li key={i}>
            <span>{item.itemName}</span>
            <span className="text-muted">&times;{item.qty}</span>
          </li>
        ))}
      </ul>
      <div className="roc-total">{formatCurrency(invoice.totalAmount)}</div>
      <div className="roc-meta mb-2">
        <span><i className="fas fa-clock me-1"></i>{formatDateTime(invoice.sentToCashierAt || invoice.createdAt)}</span>
      </div>
      <div className="roc-actions">
        <button className="btn btn-primary btn-sm flex-grow-1" onClick={onOpen}>
          <i className="fas fa-print me-1"></i>{invoice.isPrinted ? 'Reprint Bill' : 'Print Bill'}
        </button>
      </div>
    </div>
  );
}

export default ServiceBillingDashboard;
