import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import './DailyReport.css';

function DailyReport() {
  const [selectedDate, setSelectedDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cashiers, setCashiers] = useState([]);
  const [selectedCashier, setSelectedCashier] = useState('all');

  useEffect(() => {
    fetchCashiers();
  }, []);

  const fetchCashiers = async () => {
    try {
      const response = await apiClient.get('/auth/restaurant-staff');
      if (response.data.success) {
        // Filter only cashiers from the staff list
        const onlyCashiers = response.data.data.filter(s => s.role === 'cashier' || s.role === 'admin');
        setCashiers(onlyCashiers);
      }
    } catch (error) {
      console.error('Error fetching cashiers:', error);
    }
  };

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
    if (amount === '–') return '–';
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
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
              <div className="filter-row-flex">
                <div className="filter-group">
                  <label>Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="filter-group">
                  <label>Cashier</label>
                  <select 
                    className="form-control"
                    value={selectedCashier}
                    onChange={(e) => setSelectedCashier(e.target.value)}
                  >
                    <option value="all">All Cashiers</option>
                    {cashiers.map(c => (
                      <option key={c.adminId} value={c.email}>{c.email}</option>
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
            const filteredRows = reportData.rows.filter(row => selectedCashier === 'all' || row.cashier === selectedCashier);
            
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
                <div className="summary-cards">
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
                          <th>Total</th>
                          <th>Service Charge</th>
                          <th>Payment</th>
                          <th>Cashier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedFilteredRows.length > 0 ? (
                          groupedFilteredRows.map((row, index) => (
                            <tr key={index}>
                              <td>{row.orderNo}</td>
                              <td>{row.roomNo ? `Room ${row.roomNo}` : (row.tableNo ? `Table - ${row.tableNo}` : '–')}</td>
                              <td>{new Date(row.createdAt).toLocaleString()}</td>
                              <td>{row.itemName}</td>
                              <td>{row.qty}</td>
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
                            <td colSpan="8" className="text-center text-muted py-4">
                              No orders found for this selection
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {filteredRows.length > 0 && (
                        <tfoot>
                          <tr className="total-row bg-light">
                            <td colSpan="7" className="text-end border-0 pb-1">Food Total:</td>
                            <td className="border-0 pb-1">{formatCurrency(displayFoodTotal)}</td>
                          </tr>
                          <tr className="total-row bg-light">
                            <td colSpan="7" className="text-end border-0 py-1">Service Charge:</td>
                            <td className="border-0 py-1">{formatCurrency(displayServiceCharge)}</td>
                          </tr>
                          <tr className="total-row">
                            <td colSpan="7" className="text-end"><strong>Grand Total:</strong></td>
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
