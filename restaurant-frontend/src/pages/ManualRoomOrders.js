import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Swal from 'sweetalert2';
import './ManualOrders.css';

const ManualRoomOrders = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const rooms = Array.from({ length: 16 }, (_, i) => (i + 1).toString());

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/orders/manual-accounts/ROOM');
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching room accounts:', error);
            Swal.fire('Error', 'Failed to fetch room orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const getAccountForRoom = (roomNo) => {
        return accounts.find(acc => acc.identifier === roomNo);
    };

    const handleRoomClick = (roomNo, account) => {
        if (!account) {
            Swal.fire({
                title: 'Empty Room',
                text: `Room ${roomNo} has no active manual orders.`,
                icon: 'info',
                confirmButtonColor: '#4e73df'
            });
            return;
        }

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
              Subtotal: Rs. ${parseFloat(order.subtotal).toFixed(0)}
            </div>
          </div>
        `).join('')}
        
        <div class="bill-summary">
          <div class="bill-total-label">ACCUMULATED GRAND TOTAL (inc. SC)</div>
          <div class="bill-total-value">Rs. ${account.totalAmount.toFixed(0)}</div>
        </div>
      </div>
    `;

        Swal.fire({
            title: `<h3 style="margin-bottom:0; color:#4e73df">Room ${roomNo} Bill</h3>`,
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
                    text: 'This feature will generate the final invoice and clear the room bill.',
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
                                    <h1 className="h3 mb-0 text-gray-800">Manual Room Orders</h1>
                                    <p className="text-muted small mb-0">Aggregate bills for guests staying in rooms</p>
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
                                    {rooms.map(roomNo => {
                                        const account = getAccountForRoom(roomNo);
                                        return (
                                            <div
                                                key={roomNo}
                                                className={`account-card ${account ? 'has-orders' : 'empty'}`}
                                                onClick={() => handleRoomClick(roomNo, account)}
                                            >
                                                <div className="account-card-body">
                                                    <div className="account-icon-wrapper">
                                                        <i className="fas fa-hotel fa-2x"></i>
                                                    </div>
                                                    <div className="account-id">ROOM {roomNo}</div>
                                                    {account ? (
                                                        <>
                                                            <div className="badge bg-success-soft text-success order-count-badge">
                                                                {account.orders.length} Active Orders
                                                            </div>
                                                            <div className="account-total-amount">
                                                                Rs. {account.totalAmount.toLocaleString()}
                                                            </div>
                                                            <div className="last-order-time">
                                                                Last: {new Date(account.lastOrderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-muted small opacity-50 mt-4">NO ACTIVE BILLS</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            <style>{`
        .bg-success-soft {
          background-color: #e8fff3;
        }
        .modal-radius {
          border-radius: 20px !important;
        }
      `}</style>
        </div>
    );
};

export default ManualRoomOrders;
