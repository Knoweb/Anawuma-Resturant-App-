import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Swal from 'sweetalert2';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import './ManualOrders.css';

const ManualRoomOrders = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProcessingManual, setIsProcessingManual] = useState(false);
    const user = useAuthStore(state => state.user);
    const restaurantName = user?.restaurantName || user?.restaurant?.restaurantName || 'Restaurant';
    const rooms = [
        ...Array.from({ length: 16 }, (_, i) => `SV - ${201 + i}`),
        ...Array.from({ length: 8 }, (_, i) => `HB - ${String(i + 1).padStart(2, '0')}`)
    ];

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

    const { subscribe } = useWebSocket();

    useEffect(() => {
        fetchAccounts();
        
        // Listen for real-time dashboard refreshes
        const unsubscribe = subscribe('dashboard:refresh', () => {
            console.log('🔄 Dashboard refresh received for manual accounts');
            fetchAccounts();
        });

        return () => unsubscribe();
    }, [subscribe]);

    const getAccountForRoom = (roomNo) => {
        return accounts.find(acc => acc.identifier === roomNo);
    };

    const printOrder = (order, roomNo = null) => {
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
                        <h2 style="margin:0">${restaurantName}</h2>
                        <p style="margin:5px 0">Order Receipt</p>
                        <p style="margin:2px 0">Order No: ${order.orderNo}</p>
                        <p style="margin:2px 0">${new Date(order.createdAt).toLocaleString()}</p>
                        ${roomNo ? `<p style="margin:2px 0">${roomNo}</p>` : ''}
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

    const printAccountBill = (account, id, currency = 'LKR', rate = 1, symbol = 'Rs.') => {
        const printWindow = window.open('', '_blank');
        const subtotal = account.orders.reduce((sum, o) => sum + parseFloat(o.subtotal), 0);
        const serviceCharge = account.orders.reduce((sum, o) => sum + parseFloat(o.serviceCharge), 0);
        const total = parseFloat(account.totalAmount);

        const content = `
            <html>
                <head>
                    <title>Bill - ${id}</title>
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
                        <h1 style="margin:0">${restaurantName}</h1>
                        <h3>BILL SUMMARY (${id})</h3>
                        <p>Currency: ${currency}</p>
                        <p>Printed: ${new Date().toLocaleString()}</p>
                    </div>
                    
                    ${account.orders.map(order => `
                        <div class="order-block">
                            <div style="font-weight:bold; font-size: 11px; margin-bottom: 5px;">Order No: ${order.orderNo} - ${new Date(order.createdAt).toLocaleTimeString()}</div>
                            ${order.orderItems.map(item => `
                                <div class="item-row">
                                    <span>${item.itemName} x${item.qty}</span>
                                    <span>${symbol} ${(parseFloat(item.lineTotal) / rate).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}

                    <div class="total-section">
                        <div class="item-row" style="font-size: 14px; margin-bottom: 5px;">
                            <span>Subtotal:</span>
                            <span>${symbol} ${(subtotal / rate).toFixed(2)}</span>
                        </div>
                        <div class="item-row" style="font-size: 14px; margin-bottom: 5px;">
                            <span>Service Charge (10%):</span>
                            <span>${symbol} ${(serviceCharge / rate).toFixed(2)}</span>
                        </div>
                        <div class="grand-total" style="border-top: 1px solid #000; padding-top: 5px;">
                            <span>TOTAL DUE:</span>
                            <span>${symbol} ${(total / rate).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 8px; font-weight: bold; border-top: 1px dashed #000; padding-top: 5px;">
                            <span>PAYMENT METHOD:</span>
                            <span>${(account.selectedPaymentMethod || 'CASH').toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Thank You For Dining With Us!</p>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };


    const normalizeWhatsAppNumber = (raw) => {
        if (!raw) return null;
        let digits = raw.replace(/\D/g, '');
        if (digits.startsWith('0')) digits = '94' + digits.slice(1);
        if (!digits.startsWith('94')) digits = '94' + digits;
        return digits;
    };

    const handleWhatsAppBill = (order) => {
        const phone = normalizeWhatsAppNumber(order.whatsappNumber);
        if (!phone) {
            Swal.fire({
                title: 'No WhatsApp Number',
                text: 'This order does not have a WhatsApp number associated with it.',
                icon: 'warning',
                confirmButtonColor: '#4e73df'
            });
            return;
        }
        
        const itemLines = (order.orderItems || []).map((i) => `  • ${i.itemName} x${i.qty} - Rs. ${parseFloat(i.lineTotal).toFixed(2)}`).join('\n');
        
        const subtotal = parseFloat(order.subtotal);
        const serviceCharge = parseFloat(order.serviceCharge);
        const total = parseFloat(order.totalAmount);
        const roomIdentifier = order.roomNo || order.originalRoomNo || '–';

        const msg = `Hello Guest 👋\nHere is your bill for order #${order.orderNo}.\n\nOrder ID: ${order.orderNo}\nRoom: ${roomIdentifier}\n\nItems:\n${itemLines}\n\nSubtotal: Rs. ${subtotal.toFixed(2)}\nService Charge (10%): Rs. ${serviceCharge.toFixed(2)}\n*Total: Rs. ${total.toFixed(2)}*\n\nThank you for ordering with us 🍔`;
        
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
    };

    const finalizeCheckout = async (account, roomNo, paymentMethod = 'CASH', shouldPrint = false) => {
        if (isProcessingManual) return;
        setIsProcessingManual(true);
        try {
            const orderIds = account.orders.map(o => o.orderId);
            const response = await apiClient.post('/billing/manual/finalize', {
                orderIds,
                identifier: roomNo,
                type: 'ROOM',
                paymentMethod
            });

            if (response.data) {
                // Set final state before printing
                account.selectedPaymentMethod = paymentMethod;

                if (shouldPrint) {
                    printAccountBill(account, roomNo);
                }

                Swal.fire({
                    title: 'Payment Successful!',
                    text: `Invoice #${response.data.invoiceNumber} has been marked as PAID. The transaction details have also been sent to the accountant.`,
                    icon: 'success',
                    confirmButtonColor: '#1cc88a'
                }).then(() => {
                    fetchAccounts(); 
                });
            }
        } catch (error) {
            console.error('Checkout error:', error);
            Swal.fire('Error', error?.response?.data?.message || 'Failed to finalize checkout', 'error');
        } finally {
            setIsProcessingManual(false);
        }
    };

    const showInvoiceModal = (account, roomNo) => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const tempInv = `INV-MAN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-TEMP`;

        // Default Exchange Rates
        const exchangeRates = {
            'LKR': { rate: 1, symbol: 'Rs.' },
            'USD': { rate: 300, symbol: '$' },
            'EUR': { rate: 325, symbol: '€' }
        };

        // Modal Local State
        let selectedCurrency = 'LKR';
        let currentRate = 1;
        const totalLKR = parseFloat(account.totalAmount);

        const updateInvoiceDisplay = (currency, rateValue) => {
            const rate = parseFloat(rateValue) || 1;
            const symbol = exchangeRates[currency].symbol;
            const subtotal = account.orders.reduce((sum, o) => sum + parseFloat(o.subtotal), 0);
            const serviceCharge = account.orders.reduce((sum, o) => sum + parseFloat(o.serviceCharge), 0);

            const subtotalEl = document.getElementById('modal-subtotal');
            const scEl = document.getElementById('modal-service-charge');
            const totalEl = document.getElementById('modal-grand-total');

            if (subtotalEl) subtotalEl.innerText = `${symbol} ${(subtotal / rate).toFixed(2)}`;
            if (scEl) scEl.innerText = `${symbol} ${(serviceCharge / rate).toFixed(2)}`;
            if (totalEl) totalEl.innerText = `${symbol} ${(totalLKR / rate).toFixed(2)}`;
        };

        const invoiceHtml = `
            <div class="invoice-container modern-invoice">
                <div class="invoice-header text-center mb-4">
                    <h2 class="mb-0">${restaurantName}</h2>
                    <div class="border-top border-bottom my-2 py-1 font-weight-bold">TAX INVOICE</div>
                    <div class="small d-flex justify-content-between px-2">
                        <span>Invoice #: ${tempInv}</span>
                        <span>Date: ${dateStr}, ${timeStr}</span>
                    </div>
                </div>

                <div class="currency-config-section mb-3 px-2 bg-light p-2 rounded border">
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="small fw-bold text-muted mb-1 d-block text-start">CURRENCY</label>
                            <select id="modal-currency-select" class="form-select form-select-sm shadow-none">
                                <option value="LKR">LKR (Rs.)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                        <div class="col-6" id="rate-input-wrapper" style="display: none;">
                            <label class="small fw-bold text-muted mb-1 d-block text-start">RATE (1 CUR = ? LKR)</label>
                            <input type="number" id="modal-exchange-rate-input" class="form-control form-select-sm shadow-none" step="0.01">
                        </div>
                    </div>
                </div>

                <div class="invoice-body">
                    <table class="table table-sm table-borderless">
                        <thead>
                            <tr class="border-bottom">
                                <th class="text-start">Item</th>
                                <th class="text-center">Qty</th>
                                <th class="text-end">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                             ${account.orders.map(order => `
                                ${order.orderItems.map(item => `
                                    <tr>
                                        <td class="text-start small">${item.itemName}</td>
                                        <td class="text-center small">${item.qty}</td>
                                        <td class="text-end small">Rs. ${parseFloat(item.lineTotal).toFixed(0)}</td>
                                    </tr>
                                `).join('')}
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="invoice-footer border-top pt-2">
                    <div class="d-flex justify-content-between px-2 mb-1">
                        <span>Subtotal</span>
                        <span id="modal-subtotal">Rs. ${parseFloat(account.orders.reduce((sum, o) => sum + parseFloat(o.subtotal), 0)).toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between px-2 mb-1">
                        <span>Service Charge (10%)</span>
                        <span id="modal-service-charge">Rs. ${parseFloat(account.orders.reduce((sum, o) => sum + parseFloat(o.serviceCharge), 0)).toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between px-2 font-weight-bold border-top pt-1 h5">
                        <span>TOTAL DUE</span>
                        <span id="modal-grand-total">Rs. ${totalLKR.toFixed(2)}</span>
                    </div>

                    <div class="payment-method-selector mt-4 pt-3 border-top">
                        <div class="small fw-bold text-muted mb-2 text-start px-2">
                            PAYMENT METHOD <span class="text-danger">*</span>
                        </div>
                        <div class="d-flex gap-2 px-2">
                            <button id="modal-pay-cash-btn" class="btn flex-grow-1 payment-opt-btn ${account.selectedPaymentMethod !== 'CARD' ? 'active' : ''}">
                                <i class="fas fa-money-bill-wave me-2"></i> CASH
                            </button>
                            <button id="modal-pay-card-btn" class="btn flex-grow-1 payment-opt-btn ${account.selectedPaymentMethod === 'CARD' ? 'active' : ''}">
                                <i class="fas fa-credit-card me-2"></i> CARD
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        Swal.fire({
            title: `<div class="d-flex justify-content-between align-items-center w-100 pe-3">
                        <span class="small text-muted">Invoice Preview</span>
                        <span class="badge bg-success-soft text-success small" style="font-size:0.5em"><i class="fas fa-print"></i> DRAFT</span>
                    </div>`,
            html: invoiceHtml,
            width: '450px',
            showConfirmButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Pay & Print',
            cancelButtonText: 'Close',
            denyButtonText: '<i class="fas fa-print me-1"></i> Print LKR Draft',
            showDenyButton: true,
            confirmButtonColor: '#1cc88a',
            denyButtonColor: '#2c3e50',
            cancelButtonColor: '#858796',
            customClass: { popup: 'modal-radius' },
            didOpen: () => {
                const popup = Swal.getPopup();
                if (!account.selectedPaymentMethod) account.selectedPaymentMethod = 'CASH';
                
                const cashBtn = popup.querySelector('#modal-pay-cash-btn');
                const cardBtn = popup.querySelector('#modal-pay-card-btn');
                const currencySelect = popup.querySelector('#modal-currency-select');
                const rateInput = popup.querySelector('#modal-exchange-rate-input');
                const rateWrapper = popup.querySelector('#rate-input-wrapper');
                
                cashBtn.addEventListener('click', () => {
                    account.selectedPaymentMethod = 'CASH';
                    cashBtn.classList.add('active');
                    cardBtn.classList.remove('active');
                });
                
                cardBtn.addEventListener('click', () => {
                    account.selectedPaymentMethod = 'CARD';
                    cardBtn.classList.add('active');
                    cashBtn.classList.remove('active');
                });

                currencySelect.addEventListener('change', (e) => {
                    selectedCurrency = e.target.value;
                    const config = exchangeRates[selectedCurrency];
                    currentRate = config.rate;
                    
                    if (selectedCurrency === 'LKR') {
                        rateWrapper.style.display = 'none';
                    } else {
                        rateWrapper.style.display = 'block';
                        rateInput.value = currentRate;
                    }
                    updateInvoiceDisplay(selectedCurrency, currentRate);
                });

                rateInput.addEventListener('input', (e) => {
                    currentRate = parseFloat(e.target.value) || 1;
                    updateInvoiceDisplay(selectedCurrency, currentRate);
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const symbol = exchangeRates[selectedCurrency].symbol;
                printAccountBill(account, roomNo, selectedCurrency, currentRate, symbol);
                finalizeCheckout(account, roomNo, account.selectedPaymentMethod || 'CASH', false);
            } else if (result.isDenied) {
                printAccountBill(account, roomNo, 'LKR', 1, 'Rs.');
            }
        });
    };

    const handleCancelOrder = async (orderId, orderNo) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you really want to cancel order #${orderNo}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, cancel it!',
            cancelButtonText: 'No, keep it'
        });

        if (result.isConfirmed) {
            try {
                await apiClient.post(`/orders/${orderId}/cancel`);
                Swal.fire('Cancelled!', `Order #${orderNo} has been cancelled.`, 'success');
                fetchAccounts(); 
                Swal.close(); 
            } catch (error) {
                console.error('Cancellation error:', error);
                Swal.fire('Error', error?.response?.data?.message || 'Failed to cancel order', 'error');
            }
        }
    };

    const handleRoomClick = (roomNo, account) => {
        if (!account) {
            Swal.fire({
                title: 'Empty Room',
                text: `${roomNo} has no active manual orders.`,
                icon: 'info',
                confirmButtonColor: '#4e73df'
            });
            return;
        }

        // Modern Modal Content
        let itemsHtml = `
      <div class="bill-detail-container">
        ${account.orders.map((order, idx) => `
          <div class="order-group">
            <div class="order-group-header">
              <span class="order-group-no">
                <i class="fas fa-receipt me-1"></i> ${order.orderNo}
                <small class="badge bg-light text-dark ms-2 border">ID: ${order.originalRoomNo || order.roomNo}</small>
                <small class="badge ${order.orderType === 'MANUAL_CASHIER' ? 'bg-info' : 'bg-warning'} text-white ms-2" style="font-size: 0.7em;">
                    <i class="fas ${order.orderType === 'MANUAL_CASHIER' ? 'fa-user-edit' : 'fa-qrcode'} me-1"></i>
                    ${order.orderType === 'MANUAL_CASHIER' ? 'Manual' : 'QR Scan'}
                </small>
                ${order.orderType !== 'MANUAL_CASHIER' ? `
                  <button class="btn btn-sm btn-success ms-2 whatsapp-single-order" data-index="${idx}" title="Send via WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                  </button>
                ` : ''}
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
            title: `<h3 style="margin-bottom:0; color:#4e73df">${roomNo} Bill</h3>`,
            html: itemsHtml,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-money-check-alt me-1"></i> Mark as Paid',
            cancelButtonText: 'Close',
            confirmButtonColor: '#1cc88a', // Success Green
            cancelButtonColor: '#858796',
            didOpen: () => {
                const popup = Swal.getPopup();
                const printBtns = popup.querySelectorAll('.print-single-order');
                printBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = btn.getAttribute('data-index');
                        printOrder(account.orders[idx], roomNo);
                    });
                });

                const cancelBtns = popup.querySelectorAll('.cancel-single-order');
                cancelBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.getAttribute('data-id');
                        const no = btn.getAttribute('data-no');
                        handleCancelOrder(id, no);
                    });
                });

                const whatsappBtns = popup.querySelectorAll('.whatsapp-single-order');
                whatsappBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = btn.getAttribute('data-index');
                        handleWhatsAppBill(account.orders[idx]);
                    });
                });
            },
            customClass: {
                popup: 'modal-radius'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                showInvoiceModal(account, roomNo);
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
                                                    <div className="account-id">{roomNo}</div>
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
        
        .payment-opt-btn {
          border: 2px solid #eaecf4;
          background: #fff;
          color: #858796;
          border-radius: 10px;
          height: 45px;
          transition: all 0.2s;
        }
        .payment-opt-btn:hover {
          background: #f8f9fa;
          color: #4e73df;
          border-color: #4e73df;
        }
        .payment-opt-btn.active {
          background: #4e73df;
          color: #fff;
          border-color: #4e73df;
          box-shadow: 0 4px 10px rgba(78, 115, 223, 0.3);
        }
      `}</style>
        </div>
    );
};

export default ManualRoomOrders;
