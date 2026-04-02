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

    const handleTableClick = (tableNo, account) => {
        // Modern Modal Content
        let itemsHtml = `
      <div class="bill-detail-container">
        ${account.orders.map(order => `
          <div class="order-group">
            <div class="order-group-header">
              <span class="order-group-no"><i class="fas fa-receipt me-1"></i> ${order.orderNo}</span>
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
          <div class="bill-total-value">Rs. ${account.totalAmount.toFixed(0)}</div>
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
            confirmButtonColor: '#1cc88a',
            cancelButtonColor: '#858796',
            customClass: {
                popup: 'modal-radius'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Checkout Preview',
                    text: 'This feature will generate the final invoice and clear the table bill.',
                    icon: 'success',
                    confirmButtonColor: '#4e73df'
                });
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
