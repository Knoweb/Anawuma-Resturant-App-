import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiClient, { BASE_URL, sanitizeUrl } from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import './SalesReports.css';

import { useAuthStore } from '../store/authStore';

/* ── date helpers ─────────────────────────────────────────────────────────── */
const toISO = (d) => d.toISOString().split('T')[0];

const getWeekRange = (baseDate) => {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: toISO(mon), to: toISO(sun) };
};

const getMonthRange = (baseDate) => {
  const d = new Date(baseDate);
  return {
    from: toISO(new Date(d.getFullYear(), d.getMonth(), 1)),
    to:   toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/* ═══════════════════════════════════════════════════════════════════════════ */
const CashierReport = () => {
  const today = toISO(new Date());
  const { user } = useAuthStore();
  const [restaurantInfo, setRestaurantInfo] = useState(null);

  useEffect(() => {
    if (user?.restaurantId) {
      apiClient.get(`/restaurant/${user.restaurantId}`)
        .then(res => {
          if (res.data.success) {
            setRestaurantInfo(res.data.data);
          }
        })
        .catch(err => console.error('Error fetching restaurant info for report:', err));
    }
  }, [user]);

  // tab: 'single' | 'weekly' | 'monthly' | 'range'
  const [activeTab, setActiveTab]   = useState('single');
  const [singleDate, setSingleDate] = useState(today);
  const [fromDate, setFromDate]     = useState(today);
  const [toDate, setToDate]         = useState(today);

  // week/month selectors
  const [weekBase, setWeekBase]   = useState(today);   // any date in the desired week
  const [weekFrom, setWeekFrom]   = useState(getWeekRange(today).from);
  const [weekTo, setWeekTo]       = useState(getWeekRange(today).to);
  const [monthYear, setMonthYear] = useState(today.slice(0, 7)); // YYYY-MM

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading]       = useState(false);

  /* ── fetch ──────────────────────────────────────────────────────────────── */
  const fetchReport = async (from, to) => {
    try {
      setLoading(true);
      setReportData(null);
      const res = await apiClient.get(`/reports/cashier-transactions?from=${from}&to=${to}`);
      setReportData({ ...res.data, fetchedFrom: from, fetchedTo: to });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err?.response?.data?.message || 'Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWeekBaseChange = (val) => {
    setWeekBase(val);
    const range = getWeekRange(val);
    setWeekFrom(range.from);
    setWeekTo(range.to);
  };

  /* ── handle filter click per tab ─────────────────────────────────────────── */
  const handleFilter = () => {
    if (activeTab === 'single') {
      if (!singleDate) { Swal.fire('Validation', 'Please select a date', 'warning'); return; }
      fetchReport(singleDate, singleDate);
    } else if (activeTab === 'weekly') {
      if (!weekFrom || !weekTo) { Swal.fire('Validation', 'Please select both week dates', 'warning'); return; }
      if (new Date(weekFrom) > new Date(weekTo)) {
        Swal.fire('Validation', 'From date must be before To date', 'warning'); return;
      }
      fetchReport(weekFrom, weekTo);
    } else if (activeTab === 'monthly') {
      const [y, m] = monthYear.split('-').map(Number);
      const from = toISO(new Date(y, m - 1, 1));
      const to   = toISO(new Date(y, m, 0));
      fetchReport(from, to);
    } else if (activeTab === 'range') {
      if (!fromDate || !toDate) { Swal.fire('Validation', 'Please select both dates', 'warning'); return; }
      if (new Date(fromDate) > new Date(toDate)) {
        Swal.fire('Validation', 'From date must be before To date', 'warning'); return;
      }
      fetchReport(fromDate, toDate);
    }
  };

  /* ── auto-filter when switching tabs (optional convenience) ─────────────── */
  const switchTab = (tab) => {
    setActiveTab(tab);
    setReportData(null);
  };

  useEffect(() => {
    handleFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, singleDate, weekFrom, weekTo, monthYear, fromDate, toDate]);

  /* ── label for period ────────────────────────────────────────────────────── */
  const getPeriodLabel = () => {
    if (!reportData) return '';
    const f = reportData.fetchedFrom;
    const t = reportData.fetchedTo;
    if (f === t) return f;
    if (activeTab === 'weekly') return `Week: ${f} → ${t}`;
    if (activeTab === 'monthly') {
      const d = new Date(f);
      return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
    return `${f} → ${t}`;
  };

  /* ── CSV download ────────────────────────────────────────────────────────── */
  const handleDownloadCSV = () => {
    if (!reportData?.rows?.length) {
      Swal.fire('Info', 'No transactions to download', 'info'); return;
    }
    const f = reportData.fetchedFrom;
    const t = reportData.fetchedTo;
    const suffix = f === t ? f : `${f}-to-${t}`;

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
    a.href = url; a.download = `my-report-${suffix}.csv`; a.click();
    URL.revokeObjectURL(url);
    Swal.fire('Downloaded!', 'CSV file saved successfully', 'success');
  };

  const handlePrint = () => {
    if (!reportData) { Swal.fire('Info', 'Please generate a report first', 'info'); return; }
    window.print();
  };

  const fmt   = (v) => `Rs. ${parseFloat(v || 0).toFixed(2)}`;
  const fmtDT = (v) => new Date(v).toLocaleString();

  const rows          = reportData?.rows          || [];
  const foodTotal     = reportData?.foodRevenue   || 0;
  const svcCharge     = reportData?.serviceCharge || 0;
  const grandTotal    = reportData?.totalRevenue  || 0;
  const totalInvoices = reportData?.totalInvoices || 0;
  const cashRev       = reportData?.cashRevenue   || 0;
  const cardRev       = reportData?.cardRevenue   || 0;

  /* ── week display helper ─────────────────────────────────────────────────── */
  const weekRange = getWeekRange(weekBase);

  const logoPath = restaurantInfo?.logo || user?.restaurantLogo;
  const restaurantLogoUrl = logoPath
    ? sanitizeUrl(logoPath.startsWith('http')
      ? logoPath
      : `${BASE_URL}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`)
    : null;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="sales-reports-container" style={{ marginTop: '85px', padding: '30px', minHeight: 'calc(100vh - 85px)' }}>

          {/* ── Header ── */}
          <div className="no-print d-flex justify-content-between align-items-center mb-4 pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <h2 className="mb-0" style={{ color: '#1e293b', fontWeight: '700', fontSize: '1.75rem' }}>
              <i className="fas fa-chart-bar me-2 text-primary"></i>
              My Sales Report
            </h2>
            <div className="d-flex gap-2">
              <button className="btn btn-success d-flex align-items-center gap-2" onClick={handleDownloadCSV} style={{ padding: '9px 18px', borderRadius: '10px', fontWeight: '600' }}>
                <i className="fas fa-download"></i>Download CSV
              </button>
              <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handlePrint} style={{ padding: '9px 18px', borderRadius: '10px', fontWeight: '600' }}>
                <i className="fas fa-print"></i>Print
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="report-tabs no-print">
            {[
              { key: 'single',  label: 'Single Date' },
              { key: 'weekly',  label: 'Weekly' },
              { key: 'monthly', label: 'Monthly' },
              { key: 'range',   label: 'Date Range' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                onClick={() => switchTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Filter Section ── */}
          <div className="filter-section no-print">
            <div className="filter-row-flex">

              {/* Single Date */}
              {activeTab === 'single' && (
                <div className="filter-group">
                  <label>Select Date</label>
                  <input
                    type="date" className="form-control"
                    value={singleDate} max={today}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </div>
              )}

              {/* Weekly */}
              {activeTab === 'weekly' && (
                <>
                  <div className="filter-group">
                    <label>Base Day (Auto Week)</label>
                    <input
                      type="date" className="form-control"
                      value={weekBase} max={today}
                      onChange={(e) => handleWeekBaseChange(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    <label>From</label>
                    <input
                      type="date" className="form-control"
                      value={weekFrom} max={today}
                      onChange={(e) => setWeekFrom(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    <label>To</label>
                    <input
                      type="date" className="form-control"
                      value={weekTo} max={today}
                      onChange={(e) => setWeekTo(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Monthly */}
              {activeTab === 'monthly' && (
                <div className="filter-group">
                  <label>Select Month</label>
                  <input
                    type="month" className="form-control"
                    value={monthYear} max={today.slice(0, 7)}
                    onChange={(e) => setMonthYear(e.target.value)}
                  />
                </div>
              )}

              {/* Date Range */}
              {activeTab === 'range' && (
                <>
                  <div className="filter-group">
                    <label>From</label>
                    <input
                      type="date" className="form-control"
                      value={fromDate} max={today}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    <label>To</label>
                    <input
                      type="date" className="form-control"
                      value={toDate} max={today}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="filter-btn-container">
                <button
                  className="btn btn-primary filter-btn-wide"
                  onClick={handleFilter}
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

          {/* ── Results ── */}
          {!loading && reportData && (
            <div className="report-results">
              {/* Print-only header */}
              <div className="report-print-header mb-4">
                <div className="d-flex align-items-center mb-3">
                  {restaurantLogoUrl && (
                    <img src={restaurantLogoUrl} alt="Logo" className="print-logo me-3" />
                  )}
                  <div>
                    <h2 className="print-restaurant-name m-0">{restaurantInfo?.restaurantName || user?.restaurantName || 'Restaurant'}</h2>
                  </div>
                </div>
                <hr className="print-header-divider" />
                <div className="text-start">
                  <p className="print-restaurant-address mb-1">{restaurantInfo?.address || 'Hotel Address'}</p>
                  <p className="print-restaurant-cashier mb-1">
                    <strong>Cashier:</strong> {user?.email || 'N/A'}
                  </p>
                  <p className="print-restaurant-contact mb-1">
                    <strong>Contact Number:</strong> {restaurantInfo?.contactNumber || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="report-period">
                <h5>Reports for: {getPeriodLabel()}</h5>
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
                      <h3>{fmt(grandTotal)}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="summary-card bg-light border">
                    <div className="summary-icon text-primary"><i className="fas fa-utensils"></i></div>
                    <div className="summary-content">
                      <h6>Food Total</h6>
                      <h3 className="text-primary">{fmt(foodTotal)}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="summary-card bg-light border">
                    <div className="summary-icon text-warning"><i className="fas fa-bell"></i></div>
                    <div className="summary-content">
                      <h6>Service Charge</h6>
                      <h3 className="text-warning">{fmt(svcCharge)}</h3>
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
                      <h3>{fmt(cashRev)}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="summary-card card-type">
                    <div className="summary-icon"><i className="fas fa-credit-card"></i></div>
                    <div className="summary-content">
                      <h6>Card Revenue</h6>
                      <h3>{fmt(cardRev)}</h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
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
                          <td>{fmtDT(row.createdAt)}</td>
                          <td>{row.itemName}</td>
                          <td>{row.qty}</td>
                          <td>{fmt(row.unitPrice)}</td>
                          <td className="fw-semibold">{fmt(row.lineTotal)}</td>
                          <td>
                            <span className={`badge ${row.paymentMethod === 'CARD' ? 'bg-info' : 'bg-secondary'}`}>
                              {row.paymentMethod || 'CASH'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light report-total-row">
                        <td colSpan="6" className="text-end py-2 border-0">Food Total:</td>
                        <td className="py-2 border-0">{fmt(foodTotal)}</td>
                        <td className="border-0"></td>
                      </tr>
                      <tr className="table-light report-total-row">
                        <td colSpan="6" className="text-end py-2 border-0">Service Charge:</td>
                        <td className="py-2 border-0">{fmt(svcCharge)}</td>
                        <td className="border-0"></td>
                      </tr>
                      <tr className="table-secondary report-grand-total-row">
                        <td colSpan="6" className="text-end"><strong>Grand Total:</strong></td>
                        <td><strong>{fmt(grandTotal)}</strong></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-search fa-4x text-muted mb-3"></i>
                  <h5>No Transactions Found</h5>
                  <p className="text-muted">No paid invoices recorded for this period</p>
                </div>
              )}
            </div>
          )}

          {/* ── Empty prompt ── */}
          {!loading && !reportData && (
            <div className="empty-state">
              <i className="fas fa-calendar-alt fa-4x text-muted mb-3"></i>
              <h5>No Report Generated</h5>
              <p className="text-muted">Select a period and click Filter to view your transactions</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CashierReport;
