import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiClient from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import './SalesReports.css';

const SalesReports = () => {
  const [activeTab, setActiveTab] = useState('single'); // 'single', 'range', 'history'
  const [singleDate, setSingleDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    setSingleDate(today);
    setFromDate(today);
    setToDate(today);
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/history?limit=20');
      setHistoryData(response.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      Swal.fire('Error', 'Failed to load report history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleDateFilter = async () => {
    if (!singleDate) {
      Swal.fire('Validation', 'Please select a date', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get(`/reports/daily?date=${singleDate}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching daily report:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to generate report', 'error');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeFilter = async () => {
    if (!fromDate || !toDate) {
      Swal.fire('Validation', 'Please select both dates', 'warning');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      Swal.fire('Validation', 'From date must be before To date', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get(`/reports/range?from=${fromDate}&to=${toDate}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching range report:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to generate report', 'error');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!reportData) {
      Swal.fire('Info', 'Please generate a report first', 'info');
      return;
    }

    try {
      let response;
      let filename;

      if (activeTab === 'single') {
        response = await apiClient.get('/reports/daily/csv', {
          params: { date: singleDate },
          responseType: 'blob',
        });
        filename = `sales-report-${singleDate}.csv`;
      } else if (activeTab === 'range') {
        response = await apiClient.get('/reports/range/csv', {
          params: { from: fromDate, to: toDate },
          responseType: 'blob',
        });
        filename = `sales-report-${fromDate}-to-${toDate}.csv`;
      }

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      Swal.fire('Success', 'Report downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      Swal.fire('Error', 'Failed to download report', 'error');
    }
  };

  const handlePrint = () => {
    if (!reportData) {
      Swal.fire('Info', 'Please generate a report first', 'info');
      return;
    }
    window.print();
  };

  const loadHistoryReport = async (report) => {
    if (report.reportType === 'daily') {
      setSingleDate(report.fromDate);
      setActiveTab('single');
      try {
        setLoading(true);
        const response = await apiClient.get(`/reports/daily?date=${report.fromDate}`);
        setReportData(response.data);
      } catch (error) {
        Swal.fire('Error', 'Failed to load report', 'error');
      } finally {
        setLoading(false);
      }
    } else if (report.reportType === 'range') {
      setFromDate(report.fromDate);
      setToDate(report.toDate);
      setActiveTab('range');
      try {
        setLoading(true);
        const response = await apiClient.get(`/reports/range?from=${report.fromDate}&to=${report.toDate}`);
        setReportData(response.data);
      } catch (error) {
        Swal.fire('Error', 'Failed to load report', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="sales-reports-container">
          {/* Header */}
          <div className="reports-header">
            <h2>
              <i className="fas fa-chart-line me-2"></i>
              Sales Reports
            </h2>
            <div className="header-actions no-print">
              <button className="btn btn-success me-2" onClick={handleDownloadCSV}>
                <i className="fas fa-download me-2"></i>
                Download CSV
              </button>
              <button className="btn btn-success" onClick={handlePrint}>
                <i className="fas fa-print me-2"></i>
                Print
              </button>
            </div>
          </div>

          {/* Tabs */}
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
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => { setActiveTab('history'); setReportData(null); }}
            >
              Report History
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Single Date Tab */}
            {activeTab === 'single' && (
              <div className="filter-section no-print">
                <div className="row align-items-end">
                  <div className="col-md-6">
                    <label className="form-label">Select Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <button
                      className="btn btn-primary"
                      onClick={handleSingleDateFilter}
                      disabled={loading}
                    >
                      <i className="fas fa-filter me-2"></i>
                      {loading ? 'Loading...' : 'Filter'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Date Range Tab */}
            {activeTab === 'range' && (
              <div className="filter-section no-print">
                <div className="row align-items-end">
                  <div className="col-md-5">
                    <label className="form-label">From Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label">To Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-2">
                    <button
                      className="btn btn-primary w-100"
                      onClick={handleRangeFilter}
                      disabled={loading}
                    >
                      <i className="fas fa-filter me-2"></i>
                      {loading ? 'Loading...' : 'Filter'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Report History Tab */}
            {activeTab === 'history' && (
              <div className="history-section">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : historyData.length === 0 ? (
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
                          <th>Report Type</th>
                          <th>Period</th>
                          <th>Total Orders</th>
                          <th>Total Revenue</th>
                          <th>Generated At</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.map((report) => (
                          <tr key={report.reportId}>
                            <td>
                              <span className={`badge bg-${report.reportType === 'daily' ? 'info' : 'primary'}`}>
                                {report.reportType === 'daily' ? 'Daily' : 'Range'}
                              </span>
                            </td>
                            <td>
                              {report.reportType === 'daily'
                                ? new Date(report.fromDate).toLocaleDateString()
                                : `${new Date(report.fromDate).toLocaleDateString()} - ${new Date(report.toDate).toLocaleDateString()}`}
                            </td>
                            <td>{report.totalOrders}</td>
                            <td>{formatCurrency(report.totalRevenue)}</td>
                            <td>{formatDateTime(report.generatedAt)}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => loadHistoryReport(report)}
                              >
                                <i className="fas fa-eye me-1"></i>
                                View
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

            {/* Report Results */}
            {(activeTab === 'single' || activeTab === 'range') && (
              <>
                {reportData && (
                  <div className="report-results">
                    <div className="report-period">
                      <h5>Showing reports for: {reportData.periodLabel}</h5>
                    </div>

                    {/* Summary Cards */}
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <div className="summary-card">
                          <div className="summary-icon">
                            <i className="fas fa-shopping-cart"></i>
                          </div>
                          <div className="summary-content">
                            <h6>Total Orders</h6>
                            <h3>{reportData.totalOrders}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="summary-card">
                          <div className="summary-icon revenue">
                            <i className="fas fa-dollar-sign"></i>
                          </div>
                          <div className="summary-content">
                            <h6>Total Revenue</h6>
                            <h3>{formatCurrency(reportData.totalRevenue)}</h3>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Report Table */}
                    {reportData.rows && reportData.rows.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-striped report-table">
                          <thead>
                            <tr>
                              <th>Order No</th>
                              <th>Table No</th>
                              <th>Date/Time</th>
                              <th>Item Name</th>
                              <th>Qty</th>
                              <th>Unit Price</th>
                              <th>Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.rows.map((row, index) => (
                              <tr key={index}>
                                <td>{row.orderNo}</td>
                                <td>{row.tableNo}</td>
                                <td>{formatDateTime(row.createdAt)}</td>
                                <td>{row.itemName}</td>
                                <td>{row.qty}</td>
                                <td>{formatCurrency(row.unitPrice)}</td>
                                <td>{formatCurrency(row.lineTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <i className="fas fa-chart-line fa-4x text-muted mb-3"></i>
                        <h5>No Sales Data</h5>
                        <p className="text-muted">No served orders found for the selected period</p>
                      </div>
                    )}
                  </div>
                )}

                {!reportData && !loading && (activeTab === 'single' || activeTab === 'range') && (
                  <div className="empty-state">
                    <i className="fas fa-calendar-alt fa-4x text-muted mb-3"></i>
                    <h5>No Report Generated</h5>
                    <p className="text-muted">Select a date and click Filter to generate report</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReports;
