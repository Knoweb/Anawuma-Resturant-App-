import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Swal from 'sweetalert2';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import { formatBillDateTime, formatBillDate, formatBillTime } from '../utils/dateUtils';
import { printThermalDocument } from '../utils/thermalPrint';
import { buildOrderReceiptDocument, buildAccountBillDocument } from '../utils/receiptTemplates';
import {
    renderDiscountSectionHtml,
    initDiscountSectionListeners,
    calculateDiscountBreakdown,
    DISCOUNT_TYPES,
} from '../components/billing/DiscountInputSection';
import './ManualOrders.css';

const ManualTakeawayOrders = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProcessingManual, setIsProcessingManual] = useState(false);
    const [activeTab, setActiveTab] = useState('ready'); // 'ready' (SERVED) vs 'kitchen' (includePreparing)
    const [searchParams, setSearchParams] = useSearchParams();
    const user = useAuthStore(state => state.user);
    const restaurantName = user?.restaurantName || user?.restaurant?.restaurantName || 'Restaurant';
    const [restaurantInfo, setRestaurantInfo] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.restaurantId) {
            apiClient.get(`/restaurant/${user.restaurantId}`)
                .then(res => {
                    if (res.data.success) {
                        setRestaurantInfo(res.data.data);
                    }
                })
                .catch(err => console.error('Error fetching restaurant info:', err));
        }
    }, [user?.restaurantId]);

    const fetchAccounts = async (tabToFetch = activeTab) => {
        try {
            setLoading(true);
            const includePreparing = tabToFetch === 'kitchen';
            const response = await apiClient.get('/orders/manual-accounts/TAKEAWAY', {
                params: { includePreparing: includePreparing ? 'true' : 'false' }
            });
            setAccounts(response.data || []);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching takeaway accounts:', error);
            Swal.fire('Error', 'Failed to fetch takeaway orders', 'error');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const { subscribe } = useWebSocket();

    useEffect(() => {
        fetchAccounts(activeTab);

        // Listen for real-time dashboard refreshes
        const unsubscribe = subscribe('dashboard:refresh', () => {
            console.log('🔄 Dashboard refresh received for takeaway accounts');
            fetchAccounts(activeTab);
        });

        return () => unsubscribe();
    }, [subscribe, activeTab]);

    // Automatically open invoice settlement modal if openOrderId parameter is provided in URL
    useEffect(() => {
        const openId = searchParams.get('openOrderId');
        if (!openId || loading || accounts.length === 0) return;

        const targetAccount = accounts.find(acc =>
            acc.orders?.some(o => String(o.orderId) === String(openId) || String(o.orderNo) === String(openId))
        );

        if (targetAccount) {
            // Remove openOrderId from URL to avoid re-triggering on subsequent actions
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('openOrderId');
            setSearchParams(nextParams, { replace: true });

            // Automatically open invoice settlement modal
            showInvoiceModal(targetAccount, targetAccount.identifier);
        }
    }, [searchParams, accounts, loading]);

    const printOrder = async (order, identifier = null) => {
        const doc = buildOrderReceiptDocument({
            restaurantName,
            order,
            locationLine: identifier ? `Take Away: ${identifier}` : 'Type: TAKE AWAY',
            formatDateTime: formatBillDateTime,
        });
        await printThermalDocument(doc);
    };

    const printAccountBill = async (account, id, currency = 'LKR', rate = 1, symbol = 'Rs.', invoiceNumber = null, discountMeta = {}) => {
        const qrUrl = `${window.location.origin}/google-review-qr.jpeg`;
        const doc = buildAccountBillDocument({
            restaurantName,
            restaurantInfo,
            account,
            summaryHeading: 'BILL SUMMARY (TAKE AWAY)',
            locationLabel: 'Order Mode',
            locationValue: 'TAKE AWAY (0% SC)',
            currency,
            rate,
            symbol,
            invoiceNumber,
            qrUrl,
            formatDateTime: formatBillDateTime,
            formatTime: formatBillTime,
            discountAmount: discountMeta.discountAmount || 0,
            discountType: discountMeta.discountType || 'NONE',
            discountValue: discountMeta.discountValue || 0,
            discountReason: discountMeta.discountReason || '',
            diningType: 'TAKEAWAY',
            finalTotalAmount: discountMeta.totalAmount ?? discountMeta.finalTotalAmount ?? null,
        });
        await printThermalDocument(doc);
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
                text: 'This takeaway order does not have a WhatsApp number associated with it.',
                icon: 'warning',
                confirmButtonColor: '#266668'
            });
            return;
        }

        const itemLines = (order.orderItems || []).map((i) => {
            const qty = Number(i.qty || 1);
            const extraPrice = parseFloat(i.extraPrice || 0);
            const basePrice = parseFloat(i.unitPrice || 0);
            if (extraPrice > 0) {
                return `  • ${i.itemName} x${qty} - Rs. ${(basePrice * qty).toFixed(2)}\n    ↳ + ${i.extraDescription || 'Extra'} x${qty} - Rs. ${(extraPrice * qty).toFixed(2)}`;
            }
            return `  • ${i.itemName} x${qty} - Rs. ${parseFloat(i.lineTotal || (basePrice * qty)).toFixed(2)}`;
        }).join('\n');

        const subtotal = parseFloat(order.subtotal);
        const total = parseFloat(order.totalAmount);

        const msg = `Hello ${order.customerName || 'Customer'} 👋\nHere is your bill for Take Away order #${order.orderNo}.\n\nOrder ID: ${order.orderNo}\nMode: TAKE AWAY\n\nItems:\n${itemLines}\n\nSubtotal: Rs. ${subtotal.toFixed(2)}\nService Charge (0% Take Away): Rs. 0.00\n*Total: Rs. ${total.toFixed(2)}*\n\nThank you for ordering with us 🍔`;

        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
    };

    const finalizeCheckout = async (account, identifier, paymentMethod = 'CASH', shouldPrint = false, printOptions = {}, discountPayload = {}) => {
        if (isProcessingManual) return;
        setIsProcessingManual(true);
        try {
            const orderIds = account.orders.map(o => o.orderId);
            const response = await apiClient.post('/billing/manual/finalize', {
                orderIds,
                identifier,
                type: 'TAKEAWAY',
                paymentMethod,
                discountType: discountPayload.discountType || 'NONE',
                discountValue: discountPayload.discountValue || 0,
                discountReason: discountPayload.discountReason || null,
                diningType: 'TAKEAWAY',
            });

            if (response.data) {
                account.selectedPaymentMethod = paymentMethod;
                const invoiceNumber = response.data.invoiceNumber || null;

                if (shouldPrint) {
                    const { currency = 'LKR', rate = 1, symbol = 'Rs.' } = printOptions;
                    await printAccountBill(account, identifier, currency, rate, symbol, invoiceNumber, {
                        discountAmount: response.data.discountAmount,
                        discountType: response.data.discountType,
                        discountValue: response.data.discountValue,
                        discountReason: response.data.discountReason,
                        diningType: 'TAKEAWAY',
                        finalTotalAmount: response.data.totalAmount,
                    });
                }

                Swal.fire({
                    title: 'Takeaway Bill Settled!',
                    text: `Invoice #${response.data.invoiceNumber} has been marked as PAID (0% Service Charge).`,
                    icon: 'success',
                    confirmButtonColor: '#1cc88a'
                }).then(() => {
                    fetchAccounts();
                });
            }
        } catch (error) {
            console.error('Checkout error:', error);
            Swal.fire('Error', error?.response?.data?.message || 'Failed to finalize takeaway bill', 'error');
        } finally {
            setIsProcessingManual(false);
        }
    };

    const showInvoiceModal = (account, identifier) => {
        const now = new Date();
        const dateStr = formatBillDate(now);
        const timeStr = formatBillTime(now);
        const tempInv = 'INV-DRAFT';

        // Default Exchange Rates
        const exchangeRates = {
            'LKR': { rate: 1, symbol: 'Rs.' },
            'USD': { rate: 300, symbol: '$' },
            'EUR': { rate: 325, symbol: '€' }
        };

        let selectedCurrency = 'LKR';
        let currentRate = 1;
        const subtotal = account.orders.reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0);

        let discountState = {
            diningType: 'TAKEAWAY',
            discountType: DISCOUNT_TYPES.NONE,
            discountValue: 0,
            discountReason: '',
            discountAmount: 0,
            serviceCharge: 0,
            totalAmount: subtotal,
        };

        const updateInvoiceDisplay = (currency, rateValue) => {
            const rate = parseFloat(rateValue) || 1;
            const symbol = exchangeRates[currency].symbol;
            const breakdown = calculateDiscountBreakdown({
                subtotal,
                serviceCharge: 0, // 0% SC for Takeaway strictly
                discountType: discountState.discountType,
                discountValue: discountState.discountValue,
            });

            discountState.serviceCharge = 0;
            discountState.discountAmount = breakdown.discountAmount;
            discountState.totalAmount = breakdown.totalAmount;

            const subtotalEl = document.getElementById('modal-subtotal-takeaway');
            const discountRowEl = document.getElementById('modal-discount-row-takeaway');
            const discountValEl = document.getElementById('modal-discount-val-takeaway');
            const totalEl = document.getElementById('modal-grand-total-takeaway');

            if (subtotalEl) subtotalEl.innerText = `${symbol} ${(breakdown.subtotal / rate).toFixed(2)}`;
            if (discountRowEl && discountValEl) {
                if (breakdown.discountAmount > 0) {
                    discountRowEl.style.display = 'flex';
                    discountValEl.innerText = `-${symbol} ${(breakdown.discountAmount / rate).toFixed(2)}`;
                } else {
                    discountRowEl.style.display = 'none';
                }
            }
            if (totalEl) totalEl.innerText = `${symbol} ${(breakdown.totalAmount / rate).toFixed(2)}`;
        };

        const invoiceHtml = `
            <div class="invoice-container modern-invoice">
                <div class="invoice-header text-center mb-4">
                    <h2 class="mb-0">${restaurantName}</h2>
                    <div class="border-top border-bottom my-2 py-1 font-weight-bold text-success">
                        🛍️ TAKE AWAY RECEIPT (0% SERVICE CHARGE)
                    </div>
                    <div class="small d-flex justify-content-between px-2">
                        <span>Invoice #: ${tempInv}</span>
                        <span>Date: ${dateStr}, ${timeStr}</span>
                    </div>
                    <div class="small px-2 mt-1 text-start">
                        <span class="text-muted">Order No(s): </span>
                        <span class="fw-bold">${account.orders.map(o => o.orderNo).join(', ')}</span>
                    </div>
                    <div class="small px-2 text-start">
                        <span class="text-muted">Customer / Token: </span>
                        <span class="fw-bold">${identifier}</span>
                    </div>
                </div>

                <div class="currency-config-section mb-3 px-2 bg-light p-2 rounded border">
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="small fw-bold text-muted mb-1 d-block text-start">CURRENCY</label>
                            <select id="modal-currency-select-takeaway" class="form-select form-select-sm shadow-none">
                                <option value="LKR">LKR (Rs.)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                        <div class="col-6" id="rate-input-wrapper-takeaway" style="display: none;">
                            <label class="small fw-bold text-muted mb-1 d-block text-start">RATE (1 CUR = ? LKR)</label>
                            <input type="number" id="modal-exchange-rate-input-takeaway" class="form-control form-select-sm shadow-none" step="0.01">
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
                                ${order.orderItems.map(item => {
            const qty = Number(item.qty || 1);
            const extraPrice = parseFloat(item.extraPrice || 0);
            const rawBasePrice = parseFloat(item.unitPrice || 0);
            const basePrice = rawBasePrice > 0 ? rawBasePrice : Math.max(0, (parseFloat(item.lineTotal || 0) / qty) - extraPrice);
            const baseTotal = basePrice * qty;
            const extraTotal = extraPrice * qty;

            if (extraPrice > 0) {
                return `
                                            <tr>
                                                <td class="text-start small">${item.itemName}</td>
                                                <td class="text-center small">${qty}</td>
                                                <td class="text-end small">Rs. ${baseTotal.toFixed(0)}</td>
                                            </tr>
                                            <tr style="font-size:11px; color:#555;">
                                                <td class="text-start ps-3">+ ${item.extraDescription || 'Extra'}</td>
                                                <td class="text-center">${qty}</td>
                                                <td class="text-end">Rs. ${extraTotal.toFixed(0)}</td>
                                            </tr>
                                        `;
            }

            return `
                                        <tr>
                                            <td class="text-start small">${item.itemName}</td>
                                            <td class="text-center small">${qty}</td>
                                            <td class="text-end small">Rs. ${parseFloat(item.lineTotal || baseTotal).toFixed(0)}</td>
                                        </tr>
                                    `;
        }).join('')}
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                ${renderDiscountSectionHtml({ idPrefix: 'modal-takeaway-discount', initialDiningType: 'TAKEAWAY' })}

                <div class="invoice-footer border-top pt-2">
                    <div class="d-flex justify-content-between px-2 mb-1">
                        <span>Subtotal</span>
                        <span id="modal-subtotal-takeaway">Rs. ${parseFloat(subtotal).toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between px-2 mb-1 text-muted">
                        <span>Service Charge (0% Take Away)</span>
                        <span>Rs. 0.00</span>
                    </div>
                    <div class="d-flex justify-content-between px-2 mb-1 text-danger fw-bold" id="modal-discount-row-takeaway" style="display: none;">
                        <span>Discount</span>
                        <span id="modal-discount-val-takeaway">-Rs. 0.00</span>
                    </div>
                    <div class="d-flex justify-content-between px-2 font-weight-bold border-top pt-1 h5 text-success">
                        <span>TOTAL DUE</span>
                        <span id="modal-grand-total-takeaway">Rs. ${subtotal.toFixed(2)}</span>
                    </div>

                    <div class="payment-method-selector mt-4 pt-3 border-top">
                        <div class="small fw-bold text-muted mb-2 text-start px-2">
                            PAYMENT METHOD <span class="text-danger">*</span>
                        </div>
                        <div class="d-flex gap-2 px-2">
                            <button id="modal-pay-cash-btn-takeaway" class="btn flex-grow-1 payment-opt-btn ${account.selectedPaymentMethod !== 'CARD' ? 'active' : ''}">
                                <i class="fas fa-money-bill-wave me-2"></i> CASH
                            </button>
                            <button id="modal-pay-card-btn-takeaway" class="btn flex-grow-1 payment-opt-btn ${account.selectedPaymentMethod === 'CARD' ? 'active' : ''}">
                                <i class="fas fa-credit-card me-2"></i> CARD
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        Swal.fire({
            title: `<div class="d-flex justify-content-between align-items-center w-100 pe-3">
                        <span class="small text-muted">Takeaway Bill Checkout</span>
                        <span class="badge bg-success-soft text-success small" style="font-size:0.5em"><i class="fas fa-shopping-bag me-1"></i> TAKE AWAY</span>
                    </div>`,
            html: invoiceHtml,
            width: '450px',
            showConfirmButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Pay & Print',
            cancelButtonText: 'Close',
            denyButtonText: '<i class="fas fa-print me-1"></i> Print Draft',
            showDenyButton: true,
            confirmButtonColor: '#1cc88a',
            denyButtonColor: '#2c3e50',
            cancelButtonColor: '#858796',
            customClass: { popup: 'modal-radius' },
            didOpen: () => {
                const popup = Swal.getPopup();
                if (!account.selectedPaymentMethod) account.selectedPaymentMethod = 'CASH';

                const cashBtn = popup.querySelector('#modal-pay-cash-btn-takeaway');
                const cardBtn = popup.querySelector('#modal-pay-card-btn-takeaway');
                const currencySelect = popup.querySelector('#modal-currency-select-takeaway');
                const rateInput = popup.querySelector('#modal-exchange-rate-input-takeaway');
                const rateWrapper = popup.querySelector('#rate-input-wrapper-takeaway');

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

                initDiscountSectionListeners({
                    popup,
                    idPrefix: 'modal-takeaway-discount',
                    subtotal,
                    serviceCharge: 0,
                    initialDiningType: 'TAKEAWAY',
                    getCurrency: () => selectedCurrency,
                    getRate: () => currentRate,
                    getSymbol: () => exchangeRates[selectedCurrency].symbol,
                    onChange: (b) => {
                        discountState.discountType = b.discountType;
                        discountState.discountValue = b.discountValue;
                        discountState.discountReason = b.discountReason;
                        discountState.serviceCharge = 0;
                        updateInvoiceDisplay(selectedCurrency, currentRate);
                    },
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const symbol = exchangeRates[selectedCurrency].symbol;
                finalizeCheckout(account, identifier, account.selectedPaymentMethod || 'CASH', true, {
                    currency: selectedCurrency,
                    rate: currentRate,
                    symbol,
                }, discountState);
            } else if (result.isDenied) {
                printAccountBill(account, identifier, 'LKR', 1, 'Rs.', null, discountState);
            }
        });
    };

    const handleCancelOrder = async (orderId, orderNo) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you really want to cancel takeaway order #${orderNo}? This action cannot be undone.`,
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
                Swal.fire('Cancelled!', `Takeaway order #${orderNo} has been cancelled.`, 'success');
                fetchAccounts();
                Swal.close();
            } catch (error) {
                console.error('Cancellation error:', error);
                Swal.fire('Error', error?.response?.data?.message || 'Failed to cancel order', 'error');
            }
        }
    };

    const handleTakeawayCardClick = (identifier, account) => {
        let itemsHtml = `
      <div class="bill-detail-container">
        ${account.orders.map((order, idx) => `
          <div class="order-group">
            <div class="order-group-header">
              <span class="order-group-no">
                <i class="fas fa-shopping-bag me-1 text-warning"></i> Order #${order.orderNo}
                <small class="badge bg-warning text-dark ms-1 border" style="font-size:0.7em">TAKE AWAY (0% SC)</small>
                ${order.whatsappNumber ? `
                  <button class="btn btn-sm btn-success ms-2 whatsapp-single-order" data-index="${idx}" title="Send via WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                  </button>
                ` : ''}
              </span>
              <span class="order-group-date">${formatBillDateTime(order.createdAt)}</span>
            </div>
            ${order.customerName && order.customerName !== 'Manual Order' && order.customerName !== 'Guest' ? `
              <div class="small fw-bold text-muted mb-2 px-1">
                <i class="fas fa-user me-1"></i> Customer: ${order.customerName}
                ${order.whatsappNumber ? ` | <i class="fab fa-whatsapp text-success me-1"></i>${order.whatsappNumber}` : ''}
              </div>
            ` : ''}
            <div class="item-list">
              ${order.orderItems.map(item => {
            const qty = Number(item.qty || 1);
            const extraPrice = parseFloat(item.extraPrice || 0);
            const rawBasePrice = parseFloat(item.unitPrice || 0);
            const basePrice = rawBasePrice > 0 ? rawBasePrice : Math.max(0, (parseFloat(item.lineTotal || 0) / qty) - extraPrice);
            const baseTotal = basePrice * qty;
            const extraTotal = extraPrice * qty;

            if (extraPrice > 0) {
                return `
                      <div class="item-row">
                        <span class="item-name">${item.itemName} <small class="text-muted">x${qty}</small></span>
                        <span class="item-price">Rs. ${baseTotal.toFixed(0)}</span>
                      </div>
                      <div class="item-row" style="padding-left:12px; font-size:0.8em; color:#555;">
                        <span>+ ${item.extraDescription || 'Extra'} <small>x${qty}</small></span>
                        <span>Rs. ${extraTotal.toFixed(0)}</span>
                      </div>
                    `;
            }

            return `
                  <div class="item-row">
                    <span class="item-name">${item.itemName} <small class="text-muted">x${qty}</small></span>
                    <span class="item-price">Rs. ${parseFloat(item.lineTotal || baseTotal).toFixed(0)}</span>
                  </div>
                `;
        }).join('')}
            </div>
            <div class="order-group-footer">
              <div class="d-flex justify-content-between small text-muted">
                <span>Subtotal:</span>
                <span>Rs. ${parseFloat(order.subtotal).toFixed(0)}</span>
              </div>
              <div class="d-flex justify-content-between small text-muted">
                <span>Service Charge (0% Take Away):</span>
                <span>Rs. 0</span>
              </div>
              <div class="d-flex justify-content-between font-weight-bold mt-1" style="border-top: 1px dashed #ccc; padding-top: 5px; color: #1cc88a">
                <span>Order Total:</span>
                <span>Rs. ${parseFloat(order.totalAmount).toFixed(0)}</span>
              </div>
            </div>
          </div>
        `).join('')}
        
        <div class="bill-summary" style="background:#1cc88a;">
          <div class="bill-total-label">ACCUMULATED TAKE AWAY TOTAL (0% SC)</div>
          <div class="bill-total-value">Rs. ${parseFloat(account.totalAmount).toFixed(0)}</div>
        </div>
      </div>
    `;

        Swal.fire({
            title: `<h3 style="margin-bottom:0; color:#1cc88a"><i class="fas fa-shopping-bag me-2"></i>${identifier}</h3>`,
            html: itemsHtml,
            width: '600px',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-money-check-alt me-1"></i> Settle Bill',
            cancelButtonText: 'Close',
            confirmButtonColor: '#1cc88a',
            cancelButtonColor: '#858796',
            didOpen: () => {
                const popup = Swal.getPopup();
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
        }).then(async (result) => {
            if (result.isConfirmed) {
                showInvoiceModal(account, identifier);
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
                            <div className="page-title-section d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div>
                                    <h1 className="h3 mb-0 text-gray-800">
                                        <i className="fas fa-shopping-bag text-warning me-2"></i>
                                        Take Away Orders
                                    </h1>
                                    <p className="text-muted small mb-0">Active walk-in takeaway orders awaiting pickup or bill settlement (0% Service Charge)</p>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-warning btn-sm rounded-pill shadow-sm fw-bold px-3 text-dark"
                                        onClick={() => navigate('/cashier/manual-order')}
                                    >
                                        <i className="fas fa-plus me-1"></i> NEW TAKE AWAY ORDER
                                    </button>
                                    <button className="btn btn-outline-primary btn-sm rounded-pill shadow-sm" onClick={fetchAccounts}>
                                        <i className="fas fa-sync-alt me-2"></i> REFRESH DATA
                                    </button>
                                </div>
                            </div>

                            {/* Tab Filters */}
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <button
                                    className={`btn btn-sm rounded-pill px-3 fw-bold ${activeTab === 'ready' ? 'btn-success text-white shadow-sm' : 'btn-outline-secondary'}`}
                                    onClick={() => {
                                        setActiveTab('ready');
                                        fetchAccounts('ready');
                                    }}
                                >
                                    <i className="fas fa-check-double me-1"></i> Ready to Settle (Served)
                                    {activeTab === 'ready' && <span className="badge bg-white text-success ms-2">{accounts.length}</span>}
                                </button>
                                <button
                                    className={`btn btn-sm rounded-pill px-3 fw-bold ${activeTab === 'kitchen' ? 'btn-warning text-dark shadow-sm' : 'btn-outline-secondary'}`}
                                    onClick={() => {
                                        setActiveTab('kitchen');
                                        fetchAccounts('kitchen');
                                    }}
                                >
                                    <i className="fas fa-fire me-1"></i> In Kitchen (Preparing / Pre-Pay)
                                    {activeTab === 'kitchen' && <span className="badge bg-dark text-warning ms-2">{accounts.length}</span>}
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
                                                <i className="fas fa-shopping-bag fa-4x text-muted opacity-25 mb-3"></i>
                                                <h4 className="text-muted">
                                                    {activeTab === 'ready'
                                                        ? 'No Take Away Orders Waiting for Settlement'
                                                        : 'No Take Away Orders in Kitchen'}
                                                </h4>
                                                <p className="text-muted small">
                                                    {activeTab === 'ready'
                                                        ? 'Orders served at the counter will appear here for payment settlement.'
                                                        : 'Orders currently being prepared in the kitchen will appear here.'}
                                                </p>
                                                <button
                                                    className="btn btn-success btn-sm rounded-pill px-4 mt-2"
                                                    onClick={() => navigate('/cashier/manual-order')}
                                                >
                                                    <i className="fas fa-plus me-1"></i> Place Take Away Order
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        accounts.map(account => {
                                            const firstOrder = account.orders[0];
                                            const custName = firstOrder?.customerName && firstOrder.customerName !== 'Manual Order' && firstOrder.customerName !== 'Guest'
                                                ? firstOrder.customerName
                                                : null;
                                            const orderStatus = firstOrder?.status;

                                            return (
                                                <div
                                                    key={account.identifier}
                                                    className="account-card has-orders"
                                                    style={{ borderTop: '5px solid #f6c23e', cursor: 'pointer' }}
                                                    onClick={() => handleTakeawayCardClick(account.identifier, account)}
                                                >
                                                    <div className="account-card-body">
                                                        <div className="account-icon-wrapper" style={{ background: '#fff9e6', color: '#f6c23e' }}>
                                                            <i className="fas fa-shopping-bag fa-2x"></i>
                                                        </div>
                                                        <div className="account-id text-dark">{account.identifier}</div>
                                                        {custName && (
                                                            <div className="small text-muted fw-bold mb-1">
                                                                <i className="fas fa-user me-1"></i>{custName}
                                                            </div>
                                                        )}
                                                        <div className="d-flex justify-content-center align-items-center gap-1 mb-2">
                                                            <div className="badge bg-warning text-dark order-count-badge mb-0">
                                                                {account.orders.length === 1 ? '1 Ticket' : `${account.orders.length} Tickets`}
                                                            </div>
                                                            {orderStatus && (
                                                                <div className={`badge ${orderStatus === 'SERVED' ? 'bg-success' : (orderStatus === 'READY' ? 'bg-info' : 'bg-secondary')} order-count-badge mb-0`}>
                                                                    {orderStatus}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="account-total-amount text-success">
                                                            Rs. {account.totalAmount.toLocaleString()}
                                                        </div>
                                                        <div className="last-order-time">
                                                            Updated: {formatBillTime(account.lastOrderAt)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
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
          background: #1cc88a;
          color: #fff;
          border-color: #1cc88a;
          box-shadow: 0 4px 10px rgba(28, 200, 138, 0.3);
        }
      `}</style>
        </div>
    );
};

export default ManualTakeawayOrders;
