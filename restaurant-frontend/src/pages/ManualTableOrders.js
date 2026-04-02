import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Swal from 'sweetalert2';
import './ManualOrders.css';

const ManualTableOrders = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/orders/manual-accounts/TABLE');
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching table accounts:', error);
            Swal.fire('Error', 'Failed to fetch table orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const printOrder = (order, tableNo = null) => {
        const printWindow = window.open('', '_blank');
        const content = `
            <html>
                <head>
                    <title>Print Order - ${order.orderNo}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; width: 300px; }
                        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        .item-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
                        .total-section { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; }
                        .total-row { display: flex; justify-content: space-between; font-weight: bold; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2 style="margin:0">ANAWUMA</h2>
                        <p style="margin:5px 0">Order Receipt</p>
                        <p style="margin:2px 0">#${order.orderNo}</p>
                        <p style="margin:2px 0">${new Date(order.createdAt).toLocaleString()}</p>
                        ${tableNo ? `<p style="margin:2px 0">Table: ${tableNo}</p>` : ''}
                    </div>
                    <div class="items">
                        ${order.orderItems.map(item => `
                            <div class="item-row">
                                <span>${item.itemName} x${item.qty}</span>
                                <span>${parseFloat(item.lineTotal).toFixed(0)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="total-section">
                        <div class="item-row">
                            <span>Subtotal:</span>
                            <span>${parseFloat(order.subtotal).toFixed(0)}</span>
                        </div>
                        <div class="item-row">
                            <span>Service Charge (10%):</span>
                            <span>${parseFloat(order.serviceCharge).toFixed(0)}</span>
                        </div>
                        <div class="total-row" style="font-size:18px; margin-top:5px">
                            <span>TOTAL:</span>
                            <span>Rs. ${parseFloat(order.totalAmount).toFixed(0)}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Thank You!</p>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const printAccountBill = (account, id) => {
        const printWindow = window.open('', '_blank');
        const content = `
            <html>
                <head>
                    <title>Print Bill - Table ${id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; width: 350px; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                        .order-block { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dotted #ccc; }
                        .item-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
                        .total-section { border-top: 2px solid #000; margin-top: 15px; padding-top: 10px; }
                        .grand-total { display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-top: 5px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 style="margin:0">ANAWUMA</h1>
                        <h3>ACCUMULATED TABLE BILL</h3>
                        <p>Table Number: ${id}</p>
                        <p>Printed: ${new Date().toLocaleString()}</p>
                    </div>
                    
                    ${account.orders.map(order => `
                        <div class="order-block">
                            <div style="font-weight:bold; font-size: 11px; margin-bottom: 5px;">#${order.orderNo} (${new Date(order.createdAt).toLocaleTimeString()})</div>
                            ${order.orderItems.map(item => `
                                <div class="item-row">
                                    <span>${item.itemName} x${item.qty}</span>
                                    <span>${parseFloat(item.lineTotal).toFixed(0)}</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}

                    <div class="total-section">
                        <div class="grand-total">
                            <span>TOTAL DUE:</span>
                            <span>Rs. ${parseFloat(account.totalAmount).toFixed(0)}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Please present this at the cashier for settlement.</p>
                        <p>Thank You for Dining with Anawuma!</p>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handleFinalizePaid = async (account, tableNo) => {
        try {
            const orderIds = account.orders.map(o => o.orderId);
            const response = await apiClient.post('/billing/manual/finalize', {
                orderIds,
                identifier: tableNo,
                isPaid: false // Set to false so it appears in the PENDING queue as requested "comes to cashier queue"
            });

            if (response.data) {
                // 1. Show success message
                Swal.fire({
                    title: 'Payment Successful',
                    text: `Bill for Table ${tableNo} has been sent to the Cashier Queue.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                // 2. Trigger Print
                printAccountBill(account, tableNo);

                // 3. Refresh accounts
                setTimeout(() => fetchAccounts(), 1000);
            }
        } catch (error) {
            console.error('Error finalizing manual order:', error);
            Swal.fire('Error', error.response?.data?.message || 'Failed to finalize payment', 'error');
        }
    };

    const handleTableClick = (tableNo, account) => {
        // Modern Modal Content
        let itemsHtml = `
      <div class="bill-detail-container">
        ${account.orders.map((order, idx) => `
          <div class="order-group">
            <div class="order-group-header">
              <span class="order-group-no">
                <i class="fas fa-receipt me-1"></i> ${order.orderNo}
                <button class="btn btn-sm btn-light ms-2 print-single-order" data-index="${idx}" title="Print this order">
                  <i class="fas fa-print"></i>
                </button>
              </span>
              <span class="order-group-date">${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="item-list">
              ${order.orderItems.map(item => `
                <div class="item-row">
                  <span class="item-name">${item.itemName} <small class="text-muted">x${item.qty}</small></span>
                  <span class="item-price">Rs. ${parseFloat(item.lineTotal).toFixed(0)}</span>
                </div>
              `).join('')}
            </div>
            <div class="order-group-footer">
              <div class="d-flex justify-content-between small text-muted">
                <span>Subtotal:</span>
                <span>Rs. ${parseFloat(order.subtotal).toFixed(0)}</span>
              </div>
              <div class="d-flex justify-content-between small text-muted">
                <span>Service Charge (10%):</span>
                <span>Rs. ${parseFloat(order.serviceCharge).toFixed(0)}</span>
              </div>
              <div class="d-flex justify-content-between font-weight-bold mt-1" style="border-top: 1px dashed #ccc; padding-top: 5px; color: #4e73df">
                <span>Order Total:</span>
                <span>Rs. ${parseFloat(order.totalAmount).toFixed(0)}</span>
              </div>
            </div>
          </div>
        `).join('')}
        
        <div class="bill-summary">
          <div class="bill-total-label">ACCUMULATED GRAND TOTAL (Inc. 10% SC)</div>
          <div class="bill-total-value">Rs. ${parseFloat(account.totalAmount).toFixed(0)}</div>
        </div>
      </div>
    `;

        Swal.fire({
            title: `<h3 style="margin-bottom:0; color:#4e73df">Table ${tableNo} Bill</h3>`,
            html: itemsHtml,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Paid & Finalize',
            cancelButtonText: 'Close',
            confirmButtonColor: '#1cc88a',
            cancelButtonColor: '#858796',
            footer: `<button class="btn btn-dark w-100 py-2" id="print-all-bill-btn"><i class="fas fa-print me-1"></i> Print Bill Snapshot</button>`,
            didOpen: () => {
                const popup = Swal.getPopup();

                // Single order print buttons
                const printBtns = popup.querySelectorAll('.print-single-order');
                printBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = btn.getAttribute('data-index');
                        printOrder(account.orders[idx], tableNo);
                    });
                });

                // Overall bill print button in footer
                const printAllBtn = popup.querySelector('#print-all-bill-btn');
                printAllBtn.addEventListener('click', () => {
                    printAccountBill(account, tableNo);
                });
            },
            customClass: {
                popup: 'modal-radius'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                handleFinalizePaid(account, tableNo);
            }
        });
    };

    return (
        <div className="sb-nav-fixed">
            <Navbar />
            <div id="layoutSidenav">
                <div id="layoutSidenav_nav">
                    <Sidebar />
                </div>
                <div id="layoutSidenav_content">
                    <main className="manual-orders-container">
                        <div className="container-fluid px-4">
                            <div className="page-title-section d-flex justify-content-between align-items-center">
                                <div>
                                    <h1 className="h3 mb-0 text-gray-800">Manual Table Orders</h1>
                                    <p className="text-muted small mb-0">Active manual orders for dine-in tables</p>
                                </div>
                                <button className="btn btn-outline-primary btn-sm rounded-pill shadow-sm" onClick={fetchAccounts}>
                                    <i className="fas fa-sync-alt me-2"></i> REFRESH DATA
                                </button>
                            </div>

                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="accounts-grid">
                                    {accounts.length === 0 ? (
                                        <div className="col-12 mt-5">
                                            <div className="text-center py-5 rounded-3 bg-white shadow-sm border border-dashed">
                                                <i className="fas fa-chair fa-4x text-muted opacity-25 mb-3"></i>
                                                <h4 className="text-muted">No Active Manual Table Orders</h4>
                                                <p className="text-muted small">Orders created manually via the cashier terminal will appear here.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        accounts.map(account => (
                                            <div
                                                key={account.identifier}
                                                className="account-card has-orders"
                                                onClick={() => handleTableClick(account.identifier, account)}
                                            >
                                                <div className="account-card-body">
                                                    <div className="account-icon-wrapper">
                                                        <i className="fas fa-chair fa-2x"></i>
                                                    </div>
                                                    <div className="account-id">TABLE {account.identifier}</div>
                                                    <div className="badge bg-primary-soft text-primary order-count-badge">
                                                        {account.orders.length} Active Orders
                                                    </div>
                                                    <div className="account-total-amount">
                                                        Rs. {account.totalAmount.toLocaleString()}
                                                    </div>
                                                    <div className="last-order-time">
                                                        Updated: {new Date(account.lastOrderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            <style>{`
        .bg-primary-soft {
          background-color: #f0f7ff;
        }
        .modal-radius {
          border-radius: 20px !important;
        }
        .border-dashed {
          border: 2px dashed #d1d3e2 !important;
        }
      `}</style>
        </div>
    );
};

export default ManualTableOrders;
