import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import './CashierReport.css';

const CashierReport = () => {
  const user = useAuthStore((s) => s.user);
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return {
      from: mon.toISOString().split('T')[0],
      to: date,
    };
  };

  const getMonthRange = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    return {
      from: new Date(year, month, 1).toISOString().split('T')[0],
      to: new Date(year, month + 1, 0).toISOString().split('T')[0],
    };
  };

  const getRangeForTab = useCallback((tab) => {
    if (tab === 'daily') return { from: selectedDate, to: selectedDate };
    if (tab === 'weekly') return getWeekRange(selectedDate);
    return getMonthRange(selectedDate);
  }, [selectedDate]);

  // ── fetch summary (3 periods at once) ────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await apiClient.get(`/reports/cashier-summary?date=${selectedDate}`);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err?.response?.data?.message || 'Failed to load summary', 'error');
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedDate]);

  // ── fetch transactions for active tab ────────────────────────────────────
  const fetchTransactions = useCallback(async (tab) => {
    const { from, to } = getRangeForTab(tab);
    try {
      setLoadingTx(true);
      const res = await apiClient.get(`/reports/cashier-transactions?from=${from}&to=${to}`);
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err?.response?.data?.message || 'Failed to load transactions', 'error');
    } finally {
      setLoadingTx(false);
    }
  }, [getRangeForTab]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchTransactions(activeTab);
  }, [activeTab, fetchTransactions]);

  // ── CSV download ──────────────────────────────────────────────────────────
  const downloadCSV = () => {
    if (!transactions || !transactions.rows?.length) {
      Swal.fire('Info', 'No transactions to download', 'info');
      return;
    }
    const { from, to } = getRangeForTab(activeTab);
    let csv = 'Invoice No,Table/Room,Date & Time,Item,Qty,Unit Price,Line Total,Payment\n';
    transactions.rows.forEach((r) => {
      const dt = new Date(r.createdAt).toLocaleString();
      csv += `${r.invoiceNumber},"${r.tableNo || '–'}","${dt}","${r.itemName}",${r.qty},${r.unitPrice},${r.lineTotal},${r.paymentMethod}\n`;
    });
    csv += `\n,,,,,,Food Total,${transactions.foodRevenue}\n`;
    csv += `,,,,,,Service Charge,${transactions.serviceCharge}\n`;
    csv += `,,,,,,Grand Total,${transactions.totalRevenue}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-report-${from}${from !== to ? `-to-${to}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  const fmt = (v) => `Rs. ${parseFloat(v || 0).toFixed(2)}`;
  const fmtDT = (v) => new Date(v).toLocaleString();

  const TABS = ['daily', 'weekly', 'monthly'];
  const TAB_LABELS = { daily: '📅 Today', weekly: '📆 This Week', monthly: '🗓️ This Month' };
  const summaryForTab = summary ? summary[activeTab] : null;

  return (
    <div className="sb-nav-fixed">
      <Navbar />
      <div id="layoutSidenav">
        <div id="layoutSidenav_nav"><Sidebar /></div>
        <div id="layoutSidenav_content">
          <main className="cashier-report-main">
            <div className="cr-container">

              {/* ── Header ── */}
              <div className="cr-header no-print">
                <div className="cr-header-left">
                  <div className="cr-icon-wrap"><i className="fas fa-chart-bar"></i></div>
                  <div>
                    <h1 className="cr-title">My Sales Report</h1>
                    <p className="cr-sub">Transactions processed by <strong>{user?.email || 'you'}</strong></p>
                  </div>
                </div>
                <div className="cr-header-right">
                  <div className="cr-date-group">
                    <label className="cr-date-label">Select Date</label>
                    <input
                      type="date"
                      className="cr-date-input"
                      value={selectedDate}
                      max={today}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <button className="cr-btn cr-btn-csv" onClick={downloadCSV}>
                    <i className="fas fa-download me-1"></i> CSV
                  </button>
                  <button className="cr-btn cr-btn-print" onClick={handlePrint}>
                    <i className="fas fa-print me-1"></i> Print
                  </button>
                </div>
              </div>

              {/* ── Summary Cards ── */}
              {loadingSummary ? (
                <div className="cr-spinner-wrap"><div className="spinner-border text-primary" /></div>
              ) : summary && (
                <div className="cr-summary-grid no-print">
                  {TABS.map((tab) => {
                    const s = summary[tab];
                    return (
                      <div
                        key={tab}
                        className={`cr-summary-card ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        <div className="cr-sc-label">{TAB_LABELS[tab]}</div>
                        <div className="cr-sc-period">{s?.periodLabel}</div>
                        <div className="cr-sc-revenue">{fmt(s?.totalRevenue)}</div>
                        <div className="cr-sc-meta">
                          <span><i className="fas fa-file-invoice me-1"></i>{s?.totalOrders} Invoices</span>
                          <span><i className="fas fa-money-bill me-1 text-success"></i>{fmt(s?.cashRevenue)}</span>
                          <span><i className="fas fa-credit-card me-1 text-info"></i>{fmt(s?.cardRevenue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Tabs ── */}
              <div className="cr-tabs no-print">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    className={`cr-tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>

              {/* ── Transactions Table ── */}
              <div className="cr-table-section">
                {/* Print header */}
                <div className="print-only cr-print-header">
                  <h2>My Sales Report — {TAB_LABELS[activeTab]}</h2>
                  <p>Cashier: {user?.email} | Period: {transactions?.periodLabel}</p>
                </div>

                {/* Totals bar */}
                {transactions && (
                  <div className="cr-totals-bar">
                    <div className="cr-total-pill">
                      <span className="cr-tp-label">Invoices</span>
                      <span className="cr-tp-val">{transactions.totalInvoices}</span>
                    </div>
                    <div className="cr-total-pill">
                      <span className="cr-tp-label">Food Total</span>
                      <span className="cr-tp-val">{fmt(transactions.foodRevenue)}</span>
                    </div>
                    <div className="cr-total-pill">
                      <span className="cr-tp-label">Service Charge</span>
                      <span className="cr-tp-val">{fmt(transactions.serviceCharge)}</span>
                    </div>
                    <div className="cr-total-pill highlight">
                      <span className="cr-tp-label">Grand Total</span>
                      <span className="cr-tp-val">{fmt(transactions.totalRevenue)}</span>
                    </div>
                    <div className="cr-total-pill cash">
                      <span className="cr-tp-label"><i className="fas fa-money-bill-wave me-1"></i>Cash</span>
                      <span className="cr-tp-val">{fmt(transactions.cashRevenue)}</span>
                    </div>
                    <div className="cr-total-pill card">
                      <span className="cr-tp-label"><i className="fas fa-credit-card me-1"></i>Card</span>
                      <span className="cr-tp-val">{fmt(transactions.cardRevenue)}</span>
                    </div>
                  </div>
                )}

                {loadingTx ? (
                  <div className="cr-spinner-wrap"><div className="spinner-border text-primary" /></div>
                ) : !transactions || transactions.rows?.length === 0 ? (
                  <div className="cr-empty">
                    <i className="fas fa-receipt fa-3x mb-3 text-muted"></i>
                    <h5>No Transactions Found</h5>
                    <p className="text-muted">No paid invoices recorded for this period</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="cr-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Invoice No</th>
                          <th>Table / Room</th>
                          <th>Date & Time</th>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Line Total</th>
                          <th>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.rows.map((row, idx) => (
                          <tr key={idx}>
                            <td className="text-muted small">{idx + 1}</td>
                            <td><span className="cr-inv-badge">{row.invoiceNumber}</span></td>
                            <td>{row.tableNo || '–'}</td>
                            <td className="small">{fmtDT(row.createdAt)}</td>
                            <td>{row.itemName}</td>
                            <td className="text-center">{row.qty}</td>
                            <td>{fmt(row.unitPrice)}</td>
                            <td className="fw-bold">{fmt(row.lineTotal)}</td>
                            <td>
                              <span className={`cr-pay-badge ${row.paymentMethod === 'CARD' ? 'card' : 'cash'}`}>
                                {row.paymentMethod || 'CASH'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="cr-foot-row">
                          <td colSpan="7" className="text-end fw-bold">Food Total:</td>
                          <td className="fw-bold">{fmt(transactions.foodRevenue)}</td>
                          <td></td>
                        </tr>
                        <tr className="cr-foot-row">
                          <td colSpan="7" className="text-end fw-bold">Service Charge:</td>
                          <td className="fw-bold">{fmt(transactions.serviceCharge)}</td>
                          <td></td>
                        </tr>
                        <tr className="cr-foot-grand">
                          <td colSpan="7" className="text-end fw-bold">Grand Total:</td>
                          <td className="fw-bold">{fmt(transactions.totalRevenue)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CashierReport;
