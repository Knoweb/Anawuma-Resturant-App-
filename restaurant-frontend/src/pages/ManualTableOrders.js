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
                            <div style="font-weight:bold; font-size: 11px; margin-bottom: 5px;">#${order.orderNo} (${order.originalRoomNo ? `Room: ${order.originalRoomNo}` : (order.roomNo ? `Room: ${order.roomNo}` : `Table: ${order.tableNo}`)}) - ${new Date(order.createdAt).toLocaleTimeString()}</div>
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

    const finalizeCheckout = async (account, tableNo) => {
        try {
            const orderIds = account.orders.map(o => o.orderId);
            const response = await apiClient.post('/billing/manual/finalize', {
                orderIds,
                identifier: tableNo,
                type: 'TABLE'
            });

            if (response.data) {
                Swal.fire({
                    title: 'Payment Successful!',
                    text: `Invoice #${response.data.invoiceNumber} has been marked as PAID and sent to Accountant.`,
                    icon: 'success',
                    confirmButtonColor: '#1cc88a'
                });
                fetchAccounts(); // Refresh the list
            }
        } catch (error) {
            console.error('Checkout error:', error);
            Swal.fire('Error', 'Failed to finalize checkout', 'error');
        }
    };

    const showInvoiceModal = (account, tableNo) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        // Generate a temporary invoice number for preview
        const tempInv = `INV-MAN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-TEMP`;

        const invoiceHtml = `
            <div class="invoice-container modern-invoice">
                <div class="invoice-header text-center mb-4">
                    <h2 class="mb-0">serene1</h2>
                    <div class="border-top border-bottom my-2 py-1 font-weight-bold">TAX INVOICE</div>
                    <div class="small d-flex justify-content-between px-2">
                        <span>Invoice #: ${tempInv}</span>
                    </div>
                    <div class="small d-flex justify-content-between px-2">
                        <span>Date: ${dateStr}, ${timeStr}</span>
                    </div>
                    <div class="small d-flex justify-content-between px-2">
                        <span>Table: ${tableNo}</span>
                        <span>Customer: Manual Order</span>
                    </div>
                </div>

                <div class="invoice-body">
                    <table class="table table-sm table-borderless">
                        <thead>
                            <tr class="border-bottom">
                                <th class="text-start">Item</th>
                                <th class="text-center">Qty</th>
                                <th class="text-center">Unit</th>
                                <th class="text-end">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${account.orders.map(order => `
                                <tr class="bg-light shadow-none">
                                    <td colspan="4" class="text-start py-1" style="font-size: 0.9em; background: #f8f9fa;">
                                        <strong>Order #${order.orderNo}</strong> 
                                        <small class="badge bg-light text-dark ms-1 border" style="font-size:0.7em">${order.originalRoomNo ? `Room: ${order.originalRoomNo}` : (order.roomNo ? `Room: ${order.roomNo}` : `Table: ${order.tableNo}`)}</small>
                                        <small class="text-muted ms-2">${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                    </td>
                                </tr>
                                ${order.orderItems.map(item => `
                                    <tr>
                                        <td class="text-start ps-3 small">${item.itemName}</td>
                                        <td class="text-center small">${item.qty}</td>
                                        <td class="text-center small">Rs. ${parseFloat(item.unitPrice).toFixed(2)}</td>
                                        <td class="text-end small">Rs. ${parseFloat(item.lineTotal).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="invoice-footer border-top pt-2">
                    <div class="d-flex justify-content-between px-2 mb-1">
                        <span>Subtotal</span>
                        <span>Rs. ${parseFloat(account.orders.reduce((sum, o) => sum + parseFloat(o.subtotal), 0)).toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between px-2 mb-1">
                        <span>Service Charge</span>
                        <span>Rs. ${parseFloat(account.orders.reduce((sum, o) => sum + parseFloat(o.serviceCharge), 0)).toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between px-2 font-weight-bold border-top pt-1 h5">
                        <span>TOTAL</span>
                        <span>Rs. ${parseFloat(account.totalAmount).toFixed(2)}</span>
                    </div>
                    <div class="text-center mt-3 small italic">
                        <div class="border-top border-bottom py-1">Thank you for dining with us!</div>
                    </div>
                </div>
            </div>
        `;

        Swal.fire({
            title: `<div class="d-flex justify-content-between align-items-center w-100 pe-3">
                        <span class="small text-muted">Invoice #${tempInv}</span>
                        <span class="badge bg-success-soft text-success small" style="font-size:0.5em"><i class="fas fa-print"></i> DRAFT</span>
                    </div>`,
            html: invoiceHtml,
            width: '500px',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Mark Paid',
            cancelButtonText: 'Close',
            denyButtonText: '<i class="fas fa-print me-1"></i> Print',
            showDenyButton: true,
            confirmButtonColor: '#1cc88a', // Green
            denyButtonColor: '#2c3e50', // Dark
            cancelButtonColor: '#858796',
            customClass: {
                popup: 'modal-radius'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                finalizeCheckout(account, tableNo);
            } else if (result.isDenied) {
                printAccountBill(account, tableNo);
                // Reshow after print if they want
                showInvoiceModal(account, tableNo);
            }
        });
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
                <small class="badge bg-light text-dark ms-1 border" style="font-size:0.7em">${order.originalRoomNo ? `Room: ${order.originalRoomNo}` : (order.roomNo ? `Room: ${order.roomNo}` : `Table: ${order.tableNo}`)}</small>
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
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Print/Proceed',
            cancelButtonText: 'Close',
            confirmButtonColor: '#4e73df', // Primary Blue
            cancelButtonColor: '#858796',
            didOpen: () => {
                const popup = Swal.getPopup();
                const printBtns = popup.querySelectorAll('.print-single-order');
                printBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = btn.getAttribute('data-index');
                        printOrder(account.orders[idx], tableNo);
                    });
                });
            },
            customClass: {
                popup: 'modal-radius'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                showInvoiceModal(account, tableNo);
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
                                                <button className="btn btn-primary mt-3 px-4 rounded-pill" onClick={() => navigate('/manual-orders/create')}>
                                                    <i className="fas fa-plus me-2"></i> Create New Order
                                                </button>
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
                                                    <div className="account-id-badge">TABLE</div>
                                                    <div className="account-id">{account.identifier}</div>
                                                    <div className="badge bg-primary-soft text-primary order-count-badge">
                                                        {account.orders.length} Active Orders
                                                    </div>
                                                    <div className="account-total-amount">
                                                        Rs. {parseFloat(account.totalAmount).toLocaleString()}
                                                    </div>
                                                    <div className="last-order-time">
                                                        Last Order: {new Date(account.lastOrderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="card-footer-action mt-3 pt-3 border-top">
                                                        <span className="text-primary small fw-bold">VIEW DETAILS <i className="fas fa-chevron-right ms-1"></i></span>
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
        .bg-success-soft {
          background-color: #e8fff3;
        }
        .modal-radius {
          border-radius: 20px !important;
        }
        .border-dashed {
          border: 2px dashed #d1d3e2 !important;
        }
        .modern-invoice {
            font-family: 'Courier New', Courier, monospace;
            background: #fff;
            padding: 10px;
            color: #333;
        }
        .modern-invoice table th {
            text-transform: uppercase;
            font-size: 0.8em;
            color: #666;
        }
        .modern-invoice .h5 {
            font-size: 1.25rem;
        }
        .italic { font-style: italic; }
      `}</style>
        </div>
    );
};

export default ManualTableOrders;
