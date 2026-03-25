import React, { useState } from 'react';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import './DailyReport.css';

function DailyReport() {
  const [selectedDate, setSelectedDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    if (!selectedDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Date Required',
        text: 'Please select a date'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get('/reports/daily', {
        params: { date: selectedDate }
      });
      setReportData(response.data);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Report generated successfully',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error generating report:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to generate report'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!reportData) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'Please generate a report first'
      });
      return;
    }

    try {
      const response = await apiClient.get('/reports/daily/csv', {
        params: { date: selectedDate },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-report-${selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: 'success',
        title: 'Downloaded',
        text: 'CSV file downloaded successfully',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error downloading CSV:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to download CSV file'
      });
    }
  };

  const handlePrint = () => {
    if (!reportData) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'Please generate a report first'
      });
      return;
    }
    window.print();
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="daily-report-container">
          {/* Header */}
          <div className="report-header no-print">
            <div>
              <h2>Daily Report</h2>
              <p className="text-muted">View and download daily sales reports</p>
            </div>
            {reportData && (
              <div className="report-actions">
                <button className="btn btn-success" onClick={handleDownloadCSV}>
                  <i className="fas fa-download me-2"></i>
                  Download CSV
                </button>
                <button className="btn btn-primary" onClick={handlePrint}>
                  <i className="fas fa-print me-2"></i>
                  Print Report
                </button>
              </div>
            )}
          </div>

          {/* Filter Section */}
          <div className="filter-section no-print">
            <div className="filter-card">
              <h5>Select Date</h5>
              <div className="filter-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <button
                  className="btn btn-primary generate-btn"
                  onClick={handleGenerateReport}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-chart-line me-2"></i>
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Report Content */}
          {reportData && (
            <>
              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card orders-card">
                  <div className="card-icon">
                    <i className="fas fa-shopping-cart"></i>
                  </div>
                  <div className="card-content">
                    <h3>{reportData.totalOrders}</h3>
                    <p>Total Orders</p>
                  </div>
                </div>
                <div className="summary-card revenue-card">
                  <div className="card-icon">
                    <i className="fas fa-dollar-sign"></i>
                  </div>
                  <div className="card-content">
                    <h3>{formatCurrency(reportData.totalRevenue)}</h3>
                    <p>Total Revenue</p>
                  </div>
                </div>
              </div>

              {/* Report Table */}
              <div className="report-table-container">
                <div className="report-table-header">
                  <h5>{reportData.periodLabel}</h5>
                </div>
                <div className="table-responsive">
                  <table className="table report-table">
                    <thead>
                      <tr>
                        <th>Order No</th>
                        <th>Table No</th>
                        <th>Date & Time</th>
                        <th>Item Name</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rows.length > 0 ? (
                        reportData.rows.map((row, index) => (
                          <tr key={index}>
                            <td>{row.orderNo}</td>
                            <td>{row.tableNo}</td>
                            <td>{new Date(row.createdAt).toLocaleString()}</td>
                            <td>{row.itemName}</td>
                            <td>{row.qty}</td>
                            <td>{formatCurrency(row.unitPrice)}</td>
                            <td>{formatCurrency(row.lineTotal)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">
                            No orders found for this date
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {reportData.rows.length > 0 && (
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan="6" className="text-end"><strong>Grand Total:</strong></td>
                          <td><strong>{formatCurrency(reportData.totalRevenue)}</strong></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {!reportData && !loading && (
            <div className="empty-state">
              <i className="fas fa-calendar-day"></i>
              <h4>No Report Generated</h4>
              <p>Select a date and click "Generate Report" to view daily sales data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyReport;
