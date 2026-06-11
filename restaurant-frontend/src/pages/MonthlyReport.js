import React, { useState } from 'react';
import Sidebar from '../components/common/Sidebar';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import Navbar from '../components/common/Navbar';
import './MonthlyReport.css';

function MonthlyReport() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState('all');

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = Array.from(
    { length: 10 },
    (_, i) => currentDate.getFullYear() - i
  );

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/reports/monthly', {
        params: { 
          year: selectedYear,
          month: selectedMonth
        }
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
      const response = await apiClient.get('/reports/monthly/csv', {
        params: { 
          year: selectedYear,
          month: selectedMonth
        },
        responseType: 'blob'
      });

      const monthName = months.find(m => m.value === selectedMonth)?.label;
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-report-${monthName}-${selectedYear}.csv`;
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
    <div className="page-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="monthly-report-container">
          {/* Header */}
          <div className="report-header no-print">
            <div>
              <h2>Monthly Report</h2>
              <p className="text-muted">View and download monthly sales reports</p>
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
              <div className="filter-row-flex">
                <div className="filter-group">
                  <label>Month</label>
                  <select
                    className="form-control"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Year</label>
                  <select
                    className="form-control"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {years.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
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
          {reportData && (() => {
            const cashierList = Array.from(new Set(reportData.rows.map(r => r.cashier))).filter(Boolean);
            
            return (
              <>
                <div className="filter-section no-print mt-3">
                  <div className="filter-card py-2">
                    <div className="filter-row justify-content-start">
                      <div className="form-group mb-0" style={{ minWidth: '250px' }}>
                        <label className="mb-1">Filter by Cashier</label>
                        <select 
                          className="form-control"
                          value={selectedCashier}
                          onChange={(e) => setSelectedCashier(e.target.value)}
                        >
                          <option value="all">All Cashiers</option>
                          {cashierList.map(email => (
                            <option key={email} value={email}>{email}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {(() => {
                  const filteredRows = reportData.rows.filter(row => selectedCashier === 'all' || row.cashier === selectedCashier);
                  const uniqueInvoiceIds = new Set(filteredRows.map(r => r.invoiceId));
                  
                  const displayServiceCharge = selectedCashier === 'all' 
                    ? reportData.serviceCharge 
                    : Array.from(uniqueInvoiceIds).reduce((sum, id) => {
                        const row = filteredRows.find(r => r.invoiceId === id);
                        return sum + parseFloat(row.invoiceServiceCharge || 0);
                      }, 0);

                  const displayFoodTotal = filteredRows.reduce((sum, row) => sum + parseFloat(row.lineTotal || 0), 0);
                  const displayGrandTotal = displayFoodTotal + displayServiceCharge;
                  const displayTotalOrders = uniqueInvoiceIds.size;

                  return (
                    <>
                      {/* Summary Cards */}
                      <div className="summary-cards mt-4">
                        <div className="summary-card orders-card">
                          <div className="card-icon">
                            <i className="fas fa-shopping-cart"></i>
                          </div>
                          <div className="card-content">
                            <h3>{displayTotalOrders}</h3>
                            <p>Total Orders</p>
                          </div>
                        </div>
                        <div className="summary-card revenue-card">
                          <div className="card-icon">
                            <i className="fas fa-money-bill-wave"></i>
                          </div>
                          <div className="card-content">
                            <h3>{formatCurrency(displayGrandTotal)}</h3>
                            <p>Total Revenue</p>
                          </div>
                        </div>
                        <div className="summary-card bg-primary text-white">
                          <div className="card-icon">
                            <i className="fas fa-utensils"></i>
                          </div>
                          <div className="card-content">
                            <h3 className="text-white">{formatCurrency(displayFoodTotal)}</h3>
                            <p className="text-white">Food Total</p>
                          </div>
                        </div>
                        <div className="summary-card bg-warning text-dark">
                          <div className="card-icon">
                            <i className="fas fa-concierge-bell"></i>
                          </div>
                          <div className="card-content">
                            <h3 className="text-dark">{formatCurrency(displayServiceCharge)}</h3>
                            <p className="text-dark">Service Charge</p>
                          </div>
                        </div>
                      </div>

                      {/* Report Table */}
                      <div className="report-table-container">
                        <div className="report-table-header">
                          <h5>{reportData.periodLabel} {selectedCashier !== 'all' ? `- Cashier: ${selectedCashier}` : ''}</h5>
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
                                <th>Service Charge</th>
                                <th>Payment</th>
                                <th>Cashier</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRows.length > 0 ? (
                                filteredRows.map((row, index) => (
                                  <tr key={index}>
                                    <td>{row.orderNo}</td>
                                    <td>{row.roomNo ? `Room ${row.roomNo}` : (row.tableNo ? `Table - ${row.tableNo}` : '–')}</td>
                                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                                    <td>{row.itemName}</td>
                                    <td>{row.qty}</td>
                                    <td>{formatCurrency(row.unitPrice)}</td>
                                    <td>{formatCurrency(parseFloat(row.lineTotal || 0) + parseFloat(row.serviceCharge || 0))}</td>
                                    <td>{formatCurrency(row.serviceCharge)}</td>
                                    <td>
                                      <span className={`badge ${row.paymentMethod === 'CARD' ? 'bg-info' : 'bg-secondary'}`}>
                                        {row.paymentMethod || 'CASH'}
                                      </span>
                                    </td>
                                    <td>{row.cashier || 'N/A'}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="9" className="text-center text-muted py-4">
                                    No orders found for this selection
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            {filteredRows.length > 0 && (
                              <tfoot>
                                <tr className="total-row bg-light">
                                  <td colSpan="8" className="text-end border-0 pb-1">Food Total:</td>
                                  <td className="border-0 pb-1">{formatCurrency(displayFoodTotal)}</td>
                                </tr>
                                <tr className="total-row bg-light">
                                  <td colSpan="8" className="text-end border-0 py-1">Service Charge:</td>
                                  <td className="border-0 py-1">{formatCurrency(displayServiceCharge)}</td>
                                </tr>
                                <tr className="total-row">
                                  <td colSpan="8" className="text-end"><strong>Grand Total:</strong></td>
                                  <td><strong>{formatCurrency(displayGrandTotal)}</strong></td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            );
          })()}

          {/* Empty State */}
          {!reportData && !loading && (
            <div className="empty-state">
              <i className="fas fa-calendar-alt"></i>
              <h4>No Report Generated</h4>
              <p>Select month and year, then click "Generate Report" to view monthly sales data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonthlyReport;
