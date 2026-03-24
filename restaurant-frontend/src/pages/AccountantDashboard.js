import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import { billingAPI, reportsAPI } from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';

const todayDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (value) => `Rs. ${parseFloat(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function AccountantDashboard() {
  const { user } = useAuthStore();
  const { subscribe, connected } = useWebSocket();

  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [acceptedTransactions, setAcceptedTransactions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingAccepted, setLoadingAccepted] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [acceptedError, setAcceptedError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [dailySummary, setDailySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);

  const selectedCount = selectedIds.size;

  const fetchPendingTransactions = useCallback(async () => {
    try {
      setPendingError('');
      const res = await billingAPI.getAccountantPendingTransactions({ date: selectedDate });
      const data = Array.isArray(res.data) ? res.data : [];
      setPendingTransactions(data);
    } catch (error) {
      setPendingError(error?.response?.data?.message || 'Failed to load pending transfers.');
    } finally {
      setLoadingPending(false);
    }
  }, [selectedDate]);

  const fetchAcceptedTransactions = useCallback(async () => {
    try {
      setAcceptedError('');
      const res = await billingAPI.getAccountantAcceptedTransactions({ date: selectedDate });
      const data = Array.isArray(res.data) ? res.data : [];
      setAcceptedTransactions(data);
    } catch (error) {
      setAcceptedError(error?.response?.data?.message || 'Failed to load accepted transfers.');
    } finally {
      setLoadingAccepted(false);
    }
  }, [selectedDate]);

  const fetchReportSummary = useCallback(async () => {
    const dateForSummary = selectedDate || todayDateString();

    try {
      setSummaryError('');
      const summaryRes = await reportsAPI.getSummary(dateForSummary);
      const daily = summaryRes?.data?.daily || {};
      const monthly = summaryRes?.data?.monthly || {};

      if (daily && typeof daily === 'object') {
        setDailySummary({
          periodLabel: daily.periodLabel || '',
          totalOrders:
            typeof daily.totalOrders === 'number'
              ? daily.totalOrders
              : Number(daily.totalOrders),
          totalRevenue:
            typeof daily.totalRevenue === 'number'
              ? daily.totalRevenue
              : Number(daily.totalRevenue),
        });
      } else {
        setDailySummary(null);
      }

      if (monthly && typeof monthly === 'object') {
        setMonthlySummary({
          periodLabel: monthly.periodLabel || '',
          totalOrders:
            typeof monthly.totalOrders === 'number'
              ? monthly.totalOrders
              : Number(monthly.totalOrders),
          totalRevenue:
            typeof monthly.totalRevenue === 'number'
              ? monthly.totalRevenue
              : Number(monthly.totalRevenue),
        });
      } else {
        setMonthlySummary(null);
      }
    } catch (error) {
      setSummaryError(error?.response?.data?.message || 'Failed to load report summary.');
      setDailySummary(null);
      setMonthlySummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedDate]);

  const refreshAll = useCallback(() => {
    setLoadingPending(true);
    setLoadingAccepted(true);
    setSummaryLoading(true);
    fetchPendingTransactions();
    fetchAcceptedTransactions();
    fetchReportSummary();
  }, [fetchAcceptedTransactions, fetchPendingTransactions, fetchReportSummary]);

  useEffect(() => {
    setSelectedIds(new Set());
    refreshAll();
  }, [refreshAll, selectedDate]);

  useEffect(() => {
    if (!connected) return;

    const unsubscribeTransferRequest = subscribe('accountant:transfer-request', (event) => {
      if (event?.restaurantId !== user?.restaurantId) return;

      Swal.fire({
        icon: 'info',
        title: 'New Transfer Request',
        text: `${event.count || 0} transaction(s) received from cashier (${event.mode || 'MANUAL'}).`,
        toast: true,
        position: 'top-end',
        timer: 2800,
        showConfirmButton: false,
      });

      refreshAll();
    });

    return () => {
      unsubscribeTransferRequest();
    };
  }, [connected, refreshAll, subscribe, user?.restaurantId]);

  const selectablePendingIds = useMemo(
    () => pendingTransactions.map((invoice) => invoice.invoiceId),
    [pendingTransactions],
  );

  const allSelected =
    selectablePendingIds.length > 0 && selectablePendingIds.every((id) => selectedIds.has(id));

  const toggleSelection = (invoiceId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const dailyAcceptedRevenue = useMemo(() => {
    return acceptedTransactions.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0);
  }, [acceptedTransactions]);

  const dailyAcceptedCount = acceptedTransactions.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(selectablePendingIds));
  };

  const acceptTransfers = async () => {
    if (pendingTransactions.length === 0) {
      Swal.fire('No Data', 'There are no pending transfers to accept.', 'info');
      return;
    }

    const invoiceIds = selectedCount > 0 ? Array.from(selectedIds) : selectablePendingIds;

    const confirmed = await Swal.fire({
      icon: 'question',
      title: 'Accept Transfers?',
      text: `Accept ${invoiceIds.length} transaction(s)? Accepted transactions will be removed from cashier queue.`,
      showCancelButton: true,
      confirmButtonText: 'Accept',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed.isConfirmed) return;

    setProcessingAction(true);
    try {
      const res = await billingAPI.acceptTransactionsByAccountant({
        date: selectedDate,
        invoiceIds,
      });
      const message = res?.data?.message || 'Transactions accepted successfully.';
      Swal.fire('Accepted', message, 'success');
      setSelectedIds(new Set());
      refreshAll();
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Failed to accept transactions.', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const rejectTransfers = async () => {
    if (pendingTransactions.length === 0) {
      Swal.fire('No Data', 'There are no pending transfers to reject.', 'info');
      return;
    }

    const invoiceIds = selectedCount > 0 ? Array.from(selectedIds) : selectablePendingIds;

    const confirmed = await Swal.fire({
      icon: 'warning',
      title: 'Reject Transfers?',
      text: `Reject ${invoiceIds.length} transaction(s)? They will remain with the cashier.`,
      showCancelButton: true,
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
    });

    if (!confirmed.isConfirmed) return;

    setProcessingAction(true);
    try {
      const res = await billingAPI.rejectTransactionsByAccountant({
        date: selectedDate,
        invoiceIds,
      });
      const message = res?.data?.message || 'Transactions kept with cashier.';
      Swal.fire('Rejected', message, 'success');
      setSelectedIds(new Set());
      refreshAll();
    } catch (error) {
      Swal.fire('Error', error?.response?.data?.message || 'Failed to reject transactions.', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid d-flex justify-content-between align-items-center">
            <h1 className="content-title mb-0">
              <i className="fas fa-calculator me-2 text-primary"></i>
              Accountant Dashboard
            </h1>
            <div className="d-flex gap-2 align-items-center">
              <input
                type="date"
                className="form-control form-control-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ minWidth: '170px' }}
              />
              <button className="btn btn-sm btn-outline-primary" onClick={refreshAll}>
                <i className="fas fa-sync-alt me-1"></i>Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="container-fluid">
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <div className="text-muted small">Pending Transfer Requests</div>
                    <div className="h4 mb-0 text-primary">{pendingTransactions.length}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <div className="text-muted small">Accepted Transfers</div>
                    <div className="h4 mb-0 text-success">{acceptedTransactions.length}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <div className="text-muted small">Selected Pending Rows</div>
                    <div className="h4 mb-0 text-dark">{selectedCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card shadow-sm mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Report Summary</strong>
                <Link className="btn btn-sm btn-outline-primary" to="/reports/sales">
                  <i className="fas fa-chart-line me-1"></i>Open Reports Module
                </Link>
              </div>
              <div className="card-body">
                {summaryLoading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-primary"></div>
                  </div>
                ) : summaryError ? (
                  <div className="alert alert-danger mb-0">{summaryError}</div>
                ) : !dailySummary && !monthlySummary ? (
                  <div className="text-muted text-center py-3">No report data available for selected date.</div>
                ) : (
                  <div className="row g-3">
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 h-100">
                        <div className="text-muted small">Accepted Daily Revenue</div>
                        <div className="h5 text-success mb-1">
                          {formatCurrency(dailyAcceptedRevenue)}
                        </div>
                        <div className="small text-muted">{dailySummary?.periodLabel || formatDateTime(selectedDate).split(',')[0]}</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 h-100">
                        <div className="text-muted small">Accepted Daily Transfers</div>
                        <div className="h5 text-primary mb-1">
                          {dailyAcceptedCount}
                        </div>
                        <div className="small text-muted">{dailySummary?.periodLabel || formatDateTime(selectedDate).split(',')[0]}</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 h-100">
                        <div className="text-muted small">Monthly Revenue</div>
                        <div className="h5 text-success mb-1">
                          {Number.isFinite(monthlySummary?.totalRevenue)
                            ? formatCurrency(monthlySummary.totalRevenue)
                            : '-'}
                        </div>
                        <div className="small text-muted">{monthlySummary?.periodLabel || '-'}</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="border rounded p-3 h-100">
                        <div className="text-muted small">Monthly Orders</div>
                        <div className="h5 text-primary mb-1">
                          {Number.isFinite(monthlySummary?.totalOrders)
                            ? monthlySummary.totalOrders
                            : '-'}
                        </div>
                        <div className="small text-muted">{monthlySummary?.periodLabel || '-'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card shadow-sm mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Pending From Cashier</strong>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={acceptTransfers}
                    disabled={processingAction || pendingTransactions.length === 0}
                  >
                    <i className="fas fa-check me-1"></i>Accept
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={rejectTransfers}
                    disabled={processingAction || pendingTransactions.length === 0}
                  >
                    <i className="fas fa-times me-1"></i>Reject
                  </button>
                </div>
              </div>

              <div className="card-body">
                {loadingPending ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-primary"></div>
                  </div>
                ) : pendingError ? (
                  <div className="alert alert-danger mb-0">{pendingError}</div>
                ) : pendingTransactions.length === 0 ? (
                  <div className="text-muted text-center py-3">No pending transfer requests for this date.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                          </th>
                          <th>Invoice</th>
                          <th>Order</th>
                          <th>Table</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Sent At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingTransactions.map((invoice) => (
                          <tr key={invoice.invoiceId}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(invoice.invoiceId)}
                                onChange={() => toggleSelection(invoice.invoiceId)}
                              />
                            </td>
                            <td><code>{invoice.invoiceNumber}</code></td>
                            <td>{invoice.orderNo || invoice.orderId}</td>
                            <td>{invoice.tableNo || '-'}</td>
                            <td>{invoice.customerName || '-'}</td>
                            <td>{formatCurrency(invoice.totalAmount)}</td>
                            <td>{formatDateTime(invoice.sentToAccountantAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-header">
                <strong>Accepted Transfers</strong>
              </div>
              <div className="card-body">
                {loadingAccepted ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-success"></div>
                  </div>
                ) : acceptedError ? (
                  <div className="alert alert-danger mb-0">{acceptedError}</div>
                ) : acceptedTransactions.length === 0 ? (
                  <div className="text-muted text-center py-3">No accepted transfers for this date.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-striped mb-0">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Order</th>
                          <th>Table</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Accepted At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptedTransactions.map((invoice) => (
                          <tr key={invoice.invoiceId}>
                            <td><code>{invoice.invoiceNumber}</code></td>
                            <td>{invoice.orderNo || invoice.orderId}</td>
                            <td>{invoice.tableNo || '-'}</td>
                            <td>{invoice.customerName || '-'}</td>
                            <td>{formatCurrency(invoice.totalAmount)}</td>
                            <td>{formatDateTime(invoice.acceptedByAccountantAt)}</td>
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
      </div>
    </div>
  );
}

export default AccountantDashboard;
