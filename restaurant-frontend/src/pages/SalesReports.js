import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import apiClient, { BASE_URL, sanitizeUrl } from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import './SalesReports.css';
import { useAuthStore } from '../store/authStore';

/* ── date helpers ──────────────────────────────────────────────────────────── */
const toISO = (d) => d.toISOString().split('T')[0];

const getWeekRange = (base) => {
  const d = new Date(base);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: toISO(mon), to: toISO(sun) };
};

const getMonthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return {
    from: toISO(new Date(y, m - 1, 1)),
    to:   toISO(new Date(y, m, 0)),
  };
};

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

/* ══════════════════════════════════════════════════════════════════════════ */
const SalesReports = () => {
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

  // tabs: 'single' | 'weekly' | 'monthly' | 'range' | 'history'
  const [activeTab, setActiveTab]   = useState('single');

  // filter states
  const [singleDate, setSingleDate] = useState(today);
  const [weekBase,   setWeekBase]   = useState(today);
  const [weekFrom,   setWeekFrom]   = useState(getWeekRange(today).from);
  const [weekTo,     setWeekTo]     = useState(getWeekRange(today).to);
  const [monthYear,  setMonthYear]  = useState(today.slice(0, 7));
  const [fromDate,   setFromDate]   = useState(today);
  const [toDate,     setToDate]     = useState(today);

  // data
  const [reportData,   setReportData]   = useState(null);
  const [historyData,  setHistoryData]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [cashiers,     setCashiers]     = useState([]);
  const [selectedCashier, setSelectedCashier] = useState('all');

  /* ── cashiers list ─────────────────────────────────────────────────────── */
  useEffect(() => {
    apiClient.get('/auth/restaurant-staff')
      .then(res => {
        if (res.data.success) {
          setCashiers(res.data.data.filter(s => s.role === 'cashier' || s.role === 'admin'));
        }
      })
      .catch(err => console.error('Error fetching cashiers:', err));
  }, []);

  /* ── history ───────────────────────────────────────────────────────────── */
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/history?limit=20');
      setHistoryData(res.data || []);
    } catch {
      Swal.fire('Error', 'Failed to load report history', 'error');
    } finally {
      setLoading(false);
    }
  }, []);


  /* ── unified fetch ─────────────────────────────────────────────────────── */
  const fetchRange = async (from, to, endpoint = 'range') => {
    try {
      setLoading(true);
      setReportData(null);
      let res;
      if (endpoint === 'daily') {
        res = await apiClient.get(`/reports/daily?date=${from}`);
      } else {
        res = await apiClient.get(`/reports/range?from=${from}&to=${to}`);
      }
      setReportData({ ...res.data, _from: from, _to: to, _tab: activeTab });
    } catch (err) {
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

  /* ── filter handler ────────────────────────────────────────────────────── */
  const handleFilter = () => {
    if (activeTab === 'single') {
      if (!singleDate) { Swal.fire('Validation', 'Please select a date', 'warning'); return; }
      fetchRange(singleDate, singleDate, 'daily');
    } else if (activeTab === 'weekly') {
      if (!weekFrom || !weekTo) { Swal.fire('Validation', 'Please select both week dates', 'warning'); return; }
      if (new Date(weekFrom) > new Date(weekTo)) {
        Swal.fire('Validation', 'From date must be before To date', 'warning'); return;
      }
      fetchRange(weekFrom, weekTo);
    } else if (activeTab === 'monthly') {
      const { from, to } = getMonthRange(monthYear);
      fetchRange(from, to);
    } else if (activeTab === 'range') {
      if (!fromDate || !toDate) { Swal.fire('Validation', 'Please select both dates', 'warning'); return; }
      if (new Date(fromDate) > new Date(toDate)) {
        Swal.fire('Validation', 'From date must be before To date', 'warning'); return;
      }
      fetchRange(fromDate, toDate);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else {
      handleFilter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, singleDate, weekFrom, weekTo, monthYear, fromDate, toDate, fetchHistory]);

  /* ── period label ──────────────────────────────────────────────────────── */
  const getPeriodLabel = () => {
    if (!reportData) return '';
    if (reportData.periodLabel) return reportData.periodLabel;
    const f = reportData._from;
    const t = reportData._to;
    if (!f) return '';
    if (activeTab === 'weekly') return `Week: ${f} → ${t}`;
    if (activeTab === 'monthly') {
      const d = new Date(f + 'T00:00:00');
      return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
    return f === t ? f : `${f} → ${t}`;
  };

  /* ── CSV download ──────────────────────────────────────────────────────── */
  const handleDownloadCSV = async () => {
    if (!reportData) { Swal.fire('Info', 'Please generate a report first', 'info'); return; }
    try {
      const f = reportData._from || singleDate;
      const t = reportData._to   || singleDate;
      let endpoint = 'range';
      let params = {};
      
      if (activeTab === 'single') {
        endpoint = 'daily';
        params = { date: f };
      } else if (activeTab === 'monthly') {
        endpoint = 'monthly';
        const [y, m] = monthYear.split('-').map(Number);
        params = { year: y, month: m };
      } else {
        params = { from: f, to: t };
      }
      
      const res = await apiClient.get(`/reports/${endpoint}/csv`, { params, responseType: 'blob' });
      const suffix = activeTab === 'single' ? f : (activeTab === 'monthly' ? monthYear : `${f}-to-${t}`);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `sales-report-${suffix}.csv`; a.click();
      URL.revokeObjectURL(url);
      Swal.fire('Success', 'Report downloaded successfully', 'success');
    } catch {
      Swal.fire('Error', 'Failed to download report', 'error');
    }
  };

  const handlePrint = () => {
    if (!reportData) { Swal.fire('Info', 'Please generate a report first', 'info'); return; }
    window.print();
  };

  /* ── history reload ────────────────────────────────────────────────────── */
  const loadHistoryReport = async (report) => {
    const isDaily = report.reportType === 'daily';
    setActiveTab(isDaily ? 'single' : 'range');
    if (isDaily) setSingleDate(report.fromDate);
    else { setFromDate(report.fromDate); setToDate(report.toDate); }
    try {
      setLoading(true);
      const res = isDaily
        ? await apiClient.get(`/reports/daily?date=${report.fromDate}`)
        : await apiClient.get(`/reports/range?from=${report.fromDate}&to=${report.toDate}`);
      setReportData({ ...res.data, _from: report.fromDate, _to: report.toDate });
    } catch { Swal.fire('Error', 'Failed to load report', 'error'); }
    finally { setLoading(false); }
  };

  /* ── format helpers ────────────────────────────────────────────────────── */
  const fmt   = (v) => v === '–' ? '–' : `Rs. ${parseFloat(v || 0).toFixed(2)}`;
  const fmtDT = (v) => new Date(v).toLocaleString();

  /* ── derived display ───────────────────────────────────────────────────── */
  const allRows = reportData?.rows || [];
  const filteredRows = allRows.filter(r =>
    selectedCashier === 'all' || r.cashier === selectedCashier
  );

  const groupRowsByInvoice = (rowsList) => {
    const groupedMap = new Map();
    rowsList.forEach((row) => {
      const key = row.invoiceId || row.invoiceNumber;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          ...row,
          itemsList: [{ name: row.itemName, qty: row.qty }],
          lineTotalSum: parseFloat(row.lineTotal || 0),
          serviceChargeSum: parseFloat(row.serviceCharge || 0),
        });
      } else {
        const existing = groupedMap.get(key);
        existing.itemsList.push({ name: row.itemName, qty: row.qty });
        existing.lineTotalSum += parseFloat(row.lineTotal || 0);
        existing.serviceChargeSum += parseFloat(row.serviceCharge || 0);
      }
    });

    return Array.from(groupedMap.values()).map((g) => {
      const combinedItemNames = g.itemsList.map(it => `${it.name} x ${it.qty}`).join(', ');
      const totalQty = g.itemsList.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);
      return {
        ...g,
        itemName: combinedItemNames,
        qty: totalQty,
        unitPrice: '–',
        lineTotal: g.lineTotalSum,
        serviceCharge: g.serviceChargeSum,
      };
    });
  };

  const groupedFilteredRows = groupRowsByInvoice(filteredRows);

  const uniqueInvoiceIds = new Set(filteredRows.map(r => r.invoiceId));

  const displayFoodTotal = filteredRows.reduce((s, r) => s + parseFloat(r.lineTotal || 0), 0);
  const displaySvcCharge = selectedCashier === 'all'
    ? (reportData?.serviceCharge || 0)
    : Array.from(uniqueInvoiceIds).reduce((s, id) => {
        const r = filteredRows.find(x => x.invoiceId === id);
        return s + parseFloat(r?.invoiceServiceCharge || 0);
      }, 0);
  const displayGrandTotal   = displayFoodTotal + displaySvcCharge;
  const displayTotalOrders  = uniqueInvoiceIds.size;

  const uniqueInvoicesList = Array.from(uniqueInvoiceIds).map(id => {
    const items = filteredRows.filter(r => r.invoiceId === id);
    const foodTotal = items.reduce((s, r) => s + parseFloat(r.lineTotal || 0), 0);
    const svc = parseFloat(items[0]?.invoiceServiceCharge || 0);
    return {
      invoiceId: id,
      total: foodTotal + svc,
      paymentMethod: items[0]?.paymentMethod || 'CASH'
    };
  });

  const displayCashRevenue = selectedCashier === 'all'
    ? (reportData?.cashRevenue || 0)
    : uniqueInvoicesList.filter(inv => inv.paymentMethod === 'CASH').reduce((s, inv) => s + inv.total, 0);

  const displayCardRevenue = selectedCashier === 'all'
    ? (reportData?.cardRevenue || 0)
    : uniqueInvoicesList.filter(inv => inv.paymentMethod === 'CARD').reduce((s, inv) => s + inv.total, 0);

  const weekRange = getWeekRange(weekBase);

  const TABS = [
    { key: 'single',  label: 'Single Date'  },
    { key: 'weekly',  label: 'Weekly'        },
    { key: 'monthly', label: 'Monthly'       },
    { key: 'range',   label: 'Date Range'    },
    { key: 'history', label: 'Report History'},
  ];

  const logoPath = restaurantInfo?.logo || user?.restaurantLogo;
  const restaurantLogoUrl = logoPath
    ? sanitizeUrl(logoPath.startsWith('http')
      ? logoPath
      : `${BASE_URL}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`)
    : null;

  /* ═══════════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="sales-reports-container" style={{ minHeight: 'calc(100vh - 85px)' }}>

          {/* ── Header ── */}
          <div className="no-print d-flex justify-content-between align-items-center mb-4 pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <h2 className="mb-0" style={{ color: '#1e293b', fontWeight: '700', fontSize: '1.75rem' }}>
              <i className="fas fa-chart-line me-2 text-primary"></i>
              Sales Reports
            </h2>
            <div className="d-flex gap-2">
              <button className="btn btn-success d-flex align-items-center gap-2" onClick={handleDownloadCSV} style={{ padding: '9px 18px', borderRadius: '10px', fontWeight: '600' }}>
                <i className="fas fa-download"></i>Download CSV
              </button>
              <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '9px 18px', borderRadius: '10px', fontWeight: '600' }}>
                <i className="fas fa-print"></i>Print
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="report-tabs no-print">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Filter Section ── */}
          {activeTab !== 'history' && (
            <div className="filter-section no-print">
              <div className="filter-row-flex">

                {/* Single Date */}
                {activeTab === 'single' && (
                  <div className="filter-group">
                    <label>Select Date</label>
                    <input type="date" className="form-control"
                      value={singleDate} max={today}
                      onChange={(e) => setSingleDate(e.target.value)} />
                  </div>
                )}

                {/* Weekly */}
                {activeTab === 'weekly' && (
                  <>
                    <div className="filter-group">
                      <label>Base Day (Auto Week)</label>
                      <input type="date" className="form-control"
                        value={weekBase} max={today}
                        onChange={(e) => handleWeekBaseChange(e.target.value)} />
                    </div>
                    <div className="filter-group">
                      <label>From</label>
                      <input type="date" className="form-control"
                        value={weekFrom} max={today}
                        onChange={(e) => setWeekFrom(e.target.value)} />
                    </div>
                    <div className="filter-group">
                      <label>To</label>
                      <input type="date" className="form-control"
                        value={weekTo} max={today}
                        onChange={(e) => setWeekTo(e.target.value)} />
                    </div>
                  </>
                )}

                {/* Monthly */}
                {activeTab === 'monthly' && (
                  <div className="filter-group">
                    <label>Select Month</label>
                    <input type="month" className="form-control"
                      value={monthYear} max={today.slice(0, 7)}
                      onChange={(e) => setMonthYear(e.target.value)} />
                  </div>
                )}

                {/* Date Range */}
                {activeTab === 'range' && (
                  <>
                    <div className="filter-group">
                      <label>From</label>
                      <input type="date" className="form-control"
                        value={fromDate} max={today}
                        onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="filter-group">
                      <label>To</label>
                      <input type="date" className="form-control"
                        value={toDate} max={today}
                        onChange={(e) => setToDate(e.target.value)} />
                    </div>
                  </>
                )}

                {/* Cashier filter — single & range only */}
                {(activeTab === 'single' || activeTab === 'range') && (
                  <div className="filter-group">
                    <label>Cashier</label>
                    <select className="form-control"
                      value={selectedCashier}
                      onChange={(e) => setSelectedCashier(e.target.value)}>
                      <option value="all">All Cashiers</option>
                      {cashiers.map(c => (
                        <option key={c.adminId} value={c.email}>{c.email}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="filter-btn-container">
                  <button className="btn btn-primary filter-btn-wide"
                    onClick={handleFilter} disabled={loading}>
                    <i className="fas fa-filter me-2"></i>
                    {loading ? 'Loading...' : 'Filter'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {/* ── Report History Tab ── */}
          {activeTab === 'history' && !loading && (
            <div className="history-section">
              {historyData.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-history fa-4x text-muted mb-3"></i>
                  <h5>No Report History</h5>
                  <p className="text-muted">Generate reports to see them here</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Report Type</th><th>Period</th><th>Total Orders</th>
                        <th>Total Revenue</th><th>Generated At</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map(r => (
                        <tr key={r.reportId}>
                          <td>
                            <span className={`badge bg-${r.reportType === 'daily' ? 'info' : 'primary'}`}>
                              {r.reportType === 'daily' ? 'Daily' : 'Range'}
                            </span>
                          </td>
                          <td>
                            {r.reportType === 'daily'
                              ? new Date(r.fromDate).toLocaleDateString()
                              : `${new Date(r.fromDate).toLocaleDateString()} - ${new Date(r.toDate).toLocaleDateString()}`}
                          </td>
                          <td>{r.totalOrders}</td>
                          <td>{fmt(r.totalRevenue)}</td>
                          <td>{fmtDT(r.generatedAt)}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary"
                              onClick={() => loadHistoryReport(r)}>
                              <i className="fas fa-eye me-1"></i>View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Report Results ── */}
          {!loading && reportData && activeTab !== 'history' && (() => {
            return (
              <div className="report-results">
                {/* Print-only header */}
                <div className="report-print-header mb-4">
                  {restaurantLogoUrl && (
                    <img src={restaurantLogoUrl} alt="Logo" className="print-logo" />
                  )}
                  <div className="print-header-info">
                    <h2 className="print-restaurant-name">{restaurantInfo?.restaurantName || user?.restaurantName || 'Restaurant'}</h2>
                    <p className="print-restaurant-address">{restaurantInfo?.address || 'Hotel Address'}</p>
                    {restaurantInfo?.contactNumber && (
                      <p className="print-restaurant-contact">Tel: {restaurantInfo.contactNumber}</p>
                    )}
                    <p className="print-restaurant-cashier">
                      Cashier: {user?.name || user?.email?.split('@')[0] || 'User'}
                    </p>
                  </div>
                </div>
                <hr className="print-header-divider print-only" />

                <div className="report-period no-print">
                  <h5>
                    Reports for: {getPeriodLabel()}
                    {selectedCashier !== 'all' && (activeTab === 'single' || activeTab === 'range')
                      ? ` (Cashier: ${selectedCashier})` : ''}
                  </h5>
                </div>

                {/* Summary Cards */}
                <div className="row g-3 mb-4 no-print">
                  <div className="col-md-3">
                    <div className="summary-card">
                      <div className="summary-icon"><i className="fas fa-file-invoice"></i></div>
                      <div className="summary-content">
                        <h6>Total Invoices</h6>
                        <h3>{displayTotalOrders}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="summary-card revenue">
                      <div className="summary-icon"><i className="fas fa-wallet"></i></div>
                      <div className="summary-content">
                        <h6>Grand Total</h6>
                        <h3>{fmt(displayGrandTotal)}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="summary-card bg-light border">
                      <div className="summary-icon text-primary"><i className="fas fa-utensils"></i></div>
                      <div className="summary-content">
                        <h6>Food Total</h6>
                        <h3 className="text-primary">{fmt(displayFoodTotal)}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="summary-card bg-light border">
                      <div className="summary-icon text-warning"><i className="fas fa-bell"></i></div>
                      <div className="summary-content">
                        <h6>Service Charge</h6>
                        <h3 className="text-warning">{fmt(displaySvcCharge)}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="col-md-6">
                    <div className="summary-card cash">
                      <div className="summary-icon"><i className="fas fa-money-bill-wave"></i></div>
                      <div className="summary-content">
                        <h6>Cash Revenue</h6>
                        <h3>{fmt(displayCashRevenue)}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="summary-card card-type">
                      <div className="summary-icon"><i className="fas fa-credit-card"></i></div>
                      <div className="summary-content">
                        <h6>Card Revenue</h6>
                        <h3>{fmt(displayCardRevenue)}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Table */}
                {filteredRows.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-striped report-table admin-report-table">
                      <thead>
                        <tr>
                          <th>Ord No</th><th>Table No</th><th>Date/Time</th>
                          <th>Item Name</th><th>Qty</th>
                          <th>Total</th><th>Service Charge</th><th>Payment</th><th>Cashier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedFilteredRows.map((row, i) => (
                          <tr key={i}>
                            <td>{row.orderNo}</td>
                            <td>{row.roomNo ? `Room ${row.roomNo}` : (row.tableNo ? `Table - ${row.tableNo}` : '–')}</td>
                            <td>{fmtDT(row.createdAt)}</td>
                            <td>{row.itemName}</td>
                            <td>{row.qty}</td>
                            <td>{fmt(parseFloat(row.lineTotal || 0) + parseFloat(row.serviceCharge || 0))}</td>
                            <td>{fmt(row.serviceCharge)}</td>
                            <td>
                              <span className={`badge ${row.paymentMethod === 'CARD' ? 'bg-info' : 'bg-secondary'}`}>
                                {row.paymentMethod || 'CASH'}
                              </span>
                            </td>
                            <td>{row.cashier || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-light report-total-row">
                          <td colSpan="5" className="text-end py-1 border-0">Food Total:</td>
                          <td className="py-1 border-0">{fmt(displayFoodTotal)}</td>
                          <td colSpan="3" className="border-0"></td>
                        </tr>
                        <tr className="table-light report-total-row">
                          <td colSpan="5" className="text-end py-1 border-0">Service Charge:</td>
                          <td className="py-1 border-0">{fmt(displaySvcCharge)}</td>
                          <td colSpan="3" className="border-0"></td>
                        </tr>
                        <tr className="table-secondary report-grand-total-row">
                          <td colSpan="5" className="text-end"><strong>Grand Total:</strong></td>
                          <td><strong>{fmt(displayGrandTotal)}</strong></td>
                          <td colSpan="3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-search fa-4x text-muted mb-3"></i>
                    <h5>No Data Found</h5>
                    <p className="text-muted">No orders found for this selection</p>
                  </div>
                )}

                {/* Print-only footer */}
                <div className="report-print-footer">
                  <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
                  <div className="print-footer-sig">
                    <div className="print-footer-sig-line"></div>
                    <div>Authorized Signature</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Empty Prompt ── */}
          {!loading && !reportData && activeTab !== 'history' && (
            <div className="empty-state">
              <i className="fas fa-calendar-alt fa-4x text-muted mb-3"></i>
              <h5>No Report Generated</h5>
              <p className="text-muted">Select filters and click Filter to generate report</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SalesReports;
