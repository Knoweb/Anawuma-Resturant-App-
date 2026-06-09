import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import './SalesReports.css';

const CashierReport = () => {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'range'
  const [singleDate, setSingleDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSingleDate(today);
    setFromDate(today);
    setToDate(today);
  }, []);

  /* ── fetch helpers ──────────────────────────────────────────────────────── */
  const fetchReport = async (from, to) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/reports/cashier-transactions?from=${from}&to=${to}`);
      setReportData(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err?.response?.data?.message || 'Failed to generate report', 'error');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleDateFilter = () => {
    if (!singleDate) { Swal.fire('Validation', 'Please select a date', 'warning'); return; }
    fetchReport(singleDate, singleDate);
  };

  const handleRangeFilter = () => {
    if (!fromDate || !toDate) { Swal.fire('Validation', 'Please select both dates', 'warning'); return; }
    if (new Date(fromDate) > new Date(toDate)) {
      Swal.fire('Validation', 'From date must be before To date', 'warning'); return;
    }
    fetchReport(fromDate, toDate);
  };

  /* ── CSV download ──────────────────────────────────────────────────────── */
  const handleDownloadCSV = () => {
    if (!reportData || !reportData.rows?.length) {
      Swal.fire('Info', 'Please generate a report first', 'info'); return;
    }
    const from = activeTab === 'single' ? singleDate : fromDate;
    const to   = activeTab === 'single' ? singleDate : toDate;
    const filename = activeTab === 'single'
      ? `my-report-${singleDate}.csv`
      : `my-report-${fromDate}-to-${toDate}.csv`;

    let csv = 'Invoice No,Table/Room,Date & Time,Item Name,Qty,Unit Price,Line Total,Payment\n';
    reportData.rows.forEach((r) => {
      const dt = new Date(r.createdAt).toLocaleString();
      csv += `${r.invoiceNumber},"${r.tableNo || '–'}","${dt}","${r.itemName}",${r.qty},${r.unitPrice},${r.lineTotal},${r.paymentMethod}\n`;
    });
    csv += `\n,,,,,,Food Total,${reportData.foodRevenue}\n`;
    csv += `,,,,,,Service Charge,${reportData.serviceCharge}\n`;
    csv += `,,,,,,Grand Total,${reportData.totalRevenue}\n`;
    csv += `,,,,,,Cash Revenue,${reportData.cashRevenue}\n`;
    csv += `,,,,,,Card Revenue,${reportData.cardRevenue}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    Swal.fire('Success', 'Report downloaded successfully', 'success');
  };

  const handlePrint = () => {
    if (!reportData) { Swal.fire('Info', 'Please generate a report first', 'info'); return; }
    window.print();
  };

  const formatCurrency = (v) => `Rs. ${parseFloat(v || 0).toFixed(2)}`;
  const formatDateTime = (v) => new Date(v).toLocaleString();

  /* ── derived display values ─────────────────────────────────────────────── */
  const rows            = reportData?.rows || [];
  const foodTotal       = reportData?.foodRevenue     || 0;
  const serviceCharge   = reportData?.serviceCharge   || 0;
  const grandTotal      = reportData?.totalRevenue    || 0;
  const totalInvoices   = reportData?.totalInvoices   || 0;
  const cashRevenue     = reportData?.cashRevenue     || 0;
  const cardRevenue     = reportData?.cardRevenue     || 0;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="sales-reports-container">

          {/* ── Header ── */}
          <div className="reports-header no-print">
            <h2>
              <i className="fas fa-chart-bar me-2"></i>
              My Sales Report
            </h2>
            <div className="header-actions">
              <button className="btn btn-success me-2" onClick={handleDownloadCSV}>
                <i className="fas fa-download me-2"></i>Download CSV
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <i className="fas fa-print me-2"></i>Print
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="report-tabs no-print">
            <button
              className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
              onClick={() => { setActiveTab('single'); setReportData(null); }}
            >
              Single Date
            </button>
            <button
              className={`tab-btn ${activeTab === 'range' ? 'active' : ''}`}
              onClick={() => { setActiveTab('range'); setReportData(null); }}
            >
              Date Range
            </button>
          </div>

          {/* ── Filter Section ── */}
          <div className="filter-section no-print">
            <div className="filter-row-flex">
              {activeTab === 'single' ? (
                <div className="filter-group">
                  <label>Select Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={singleDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="filter-group">
                    <label>From</label>
                    <input
                      type="date"
                      className="form-control"
                      value={fromDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    <label>To</label>
                    <input
                      type="date"
                      className="form-control"
                      value={toDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="filter-btn-container">
                <button
                  className="btn btn-primary filter-btn-wide"
                  onClick={activeTab === 'single' ? handleSingleDateFilter : handleRangeFilter}
                  disabled={loading}
                >
                  <i className="fas fa-filter me-2"></i>
                  {loading ? 'Loading...' : 'Filter'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {/* ── Report Results ── */}
          {!loading && reportData && (
            <div className="report-results">
              <div className="report-period">
                <h5>Reports for: {reportData.periodLabel}</h5>
              </div>

              {/* Summary Cards */}
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="summary-card">
                    <div className="summary-icon"><i className="fas fa-file-invoice"></i></div>
                    <div className="summary-content">
                      <h6>Total Invoices</h6>
                      <h3>{totalInvoices}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="summary-card revenue">
                    <div className="summary-icon"><i className="fas fa-wallet"></i></div>
                    <div className="summary-content">
                      <h6>Grand Total</h6>
                      <h3>{formatCurrency(grandTotal)}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="summary-card bg-light border">
                    <div className="summary-icon text-primary"><i className="fas fa-utensils"></i></div>
                    <div className="summary-content">
                      <h6>Food Total</h6>
                      <h3 className="text-primary">{formatCurrency(foodTotal)}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="summary-card bg-light border">
                    <div className="summary-icon text-warning"><i className="fas fa-bell"></i></div>
                    <div className="summary-content">
                      <h6>Service Charge</h6>
                      <h3 className="text-warning">{formatCurrency(serviceCharge)}</h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment breakdown */}
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="summary-card cash">
                    <div className="summary-icon"><i className="fas fa-money-bill-wave"></i></div>
                    <div className="summary-content">
                      <h6>Cash Revenue</h6>
                      <h3>{formatCurrency(cashRevenue)}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="summary-card card-type">
                    <div className="summary-icon"><i className="fas fa-credit-card"></i></div>
                    <div className="summary-content">
                      <h6>Card Revenue</h6>
                      <h3>{formatCurrency(cardRevenue)}</h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Table */}
              {rows.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-striped report-table">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Table / Room</th>
                        <th>Date &amp; Time</th>
                        <th>Item Name</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx}>
                          <td><span className="badge bg-light text-dark border">{row.invoiceNumber}</span></td>
                          <td>{row.tableNo || '–'}</td>
                          <td>{formatDateTime(row.createdAt)}</td>
                          <td>{row.itemName}</td>
                          <td>{row.qty}</td>
                          <td>{formatCurrency(row.unitPrice)}</td>
                          <td>{formatCurrency(row.lineTotal)}</td>
                          <td>
                            <span className={`badge ${row.paymentMethod === 'CARD' ? 'bg-info' : 'bg-secondary'}`}>
                              {row.paymentMethod || 'CASH'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light total-row">
                        <td colSpan="6" className="text-end py-2 border-0">Food Total:</td>
                        <td className="py-2 border-0">{formatCurrency(foodTotal)}</td>
                        <td className="border-0"></td>
                      </tr>
                      <tr className="table-light total-row">
                        <td colSpan="6" className="text-end py-2 border-0">Service Charge:</td>
                        <td className="py-2 border-0">{formatCurrency(serviceCharge)}</td>
                        <td className="border-0"></td>
                      </tr>
                      <tr className="table-secondary grand-total-row">
                        <td colSpan="6" className="text-end"><strong>Grand Total:</strong></td>
                        <td><strong>{formatCurrency(grandTotal)}</strong></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-search fa-4x text-muted mb-3"></i>
                  <h5>No Transactions Found</h5>
                  <p className="text-muted">No paid invoices found for this period</p>
                </div>
              )}
            </div>
          )}

          {/* ── Empty Prompt ── */}
          {!loading && !reportData && (
            <div className="empty-state">
              <i className="fas fa-calendar-alt fa-4x text-muted mb-3"></i>
              <h5>No Report Generated</h5>
              <p className="text-muted">Select a date and click Filter to view your transactions</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CashierReport;
