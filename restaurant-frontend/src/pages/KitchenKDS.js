import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Swal from 'sweetalert2';
import apiClient, { billingAPI } from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import './KitchenKDS.css';

const KitchenKDS = () => {
  const [orders, setOrders] = useState({
    NEW: [],
    ACCEPTED: [],
    COOKING: [],
    READY: [],
  });
  const [loading, setLoading] = useState(true);
  const [newlyArrivedOrders, setNewlyArrivedOrders] = useState(new Set());
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const previousNewOrderIdsRef = useRef(new Set());
  const { subscribe, connected } = useWebSocket();

  // Defensive cleanup: prevents rare cases where SweetAlert backdrop remains
  // on screen after async flows (WhatsApp/print actions).
  const clearSwalBackdropArtifacts = useCallback(() => {
    if (typeof document === 'undefined') return;

    document.body.classList.remove('swal2-shown', 'swal2-height-auto', 'swal2-no-backdrop');
    document.documentElement.classList.remove('swal2-shown', 'swal2-height-auto', 'swal2-no-backdrop');

    const activePopup = document.querySelector('.swal2-popup');
    if (!activePopup) {
      document.querySelectorAll('.swal2-container').forEach((el) => el.remove());
    }
  }, []);

  // Play notification sound for new orders
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  const fetchAllOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch orders for each status
      const [newOrders, acceptedOrders, cookingOrders, readyOrders] = await Promise.all([
        apiClient.get('/orders', { params: { status: 'NEW' } }),
        apiClient.get('/orders', { params: { status: 'ACCEPTED' } }),
        apiClient.get('/orders', { params: { status: 'COOKING' } }),
        apiClient.get('/orders', { params: { status: 'READY' } }),
      ]);

      const extractOrders = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.orders)) return payload.orders;
        return [];
      };

      const newOrdersList = extractOrders(newOrders.data);
      const acceptedOrdersList = extractOrders(acceptedOrders.data);
      const cookingOrdersList = extractOrders(cookingOrders.data);
      const readyOrdersList = extractOrders(readyOrders.data);

      // Detect newly arrived orders using ref instead of state
      const currentNewOrderIds = new Set(
        newOrdersList
          .map((order) => order.orderId)
          .filter((orderId) => orderId != null),
      );
      const newArrivals = [];
      
      currentNewOrderIds.forEach(orderId => {
        if (!previousNewOrderIdsRef.current.has(orderId)) {
          newArrivals.push(orderId);
        }
      });

      // If there are new arrivals, play sound and highlight them
      if (newArrivals.length > 0 && previousNewOrderIdsRef.current.size > 0) {
        playNotificationSound();
        
        // Add new arrivals to the highlight set
        setNewlyArrivedOrders(prev => {
          const updated = new Set(prev);
          newArrivals.forEach(id => updated.add(id));
          return updated;
        });

        // Remove highlight after 10 seconds
        newArrivals.forEach(orderId => {
          setTimeout(() => {
            setNewlyArrivedOrders(prev => {
              const updated = new Set(prev);
              updated.delete(orderId);
              return updated;
            });
          }, 10000);
        });
      }

      // Update ref with current NEW order IDs
      previousNewOrderIdsRef.current = currentNewOrderIds;

      setOrders({
        NEW: newOrdersList,
        ACCEPTED: acceptedOrdersList,
        COOKING: cookingOrdersList,
        READY: readyOrdersList,
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load orders',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      });
    }
  }, [playNotificationSound]); // Only depends on playNotificationSound

  useEffect(() => {
    fetchAllOrders();

    // Background sync every 30 seconds (safety fallback)
    const interval = setInterval(() => {
      fetchAllOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAllOrders]);

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    if (!connected) return;

    const unsubscribeNew = subscribe('order:new', (order) => {
      console.log('WS: New order received, refreshing KDS...', order);
      playNotificationSound();
      fetchAllOrders();
    });

    const unsubscribeStatus = subscribe('order:status-update', () => {
      console.log('WS: Order status updated, refreshing KDS...');
      fetchAllOrders();
    });

    const unsubscribeRefresh = subscribe('dashboard:refresh', () => {
      console.log('WS: Dashboard refresh requested, refreshing KDS...');
      fetchAllOrders();
    });

    return () => {
      unsubscribeNew();
      unsubscribeStatus();
      unsubscribeRefresh();
    };
  }, [connected, subscribe, fetchAllOrders]);

  useEffect(() => {
    clearSwalBackdropArtifacts();
  }, [clearSwalBackdropArtifacts]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, {
        status: newStatus,
      });

      // Show success toast
      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: `Order moved to ${newStatus}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      });

      // Refresh all orders
      await fetchAllOrders();
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update order status',
      });
      return false;
    }
  };

  const handleStatusChange = (order, currentStatus) => {
    let nextStatus;
    let actionText;

    switch (currentStatus) {
      case 'NEW':
        nextStatus = 'ACCEPTED';
        actionText = 'Accept Order';
        break;
      case 'ACCEPTED':
        nextStatus = 'COOKING';
        actionText = 'Start Cooking';
        break;
      case 'COOKING':
        nextStatus = 'READY';
        actionText = 'Mark as Ready';
        break;
      case 'READY':
        nextStatus = 'SERVED';
        actionText = 'Served';
        break;
      default:
        return;
    }

    Swal.fire({
      title: actionText,
      text:
        currentStatus === 'READY'
          ? `Are you sure you want to ${actionText.toLowerCase()}? Then print the bill and give it to the customer and then send the bill via WhatsApp.`
          : `Are you sure you want to ${actionText.toLowerCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, proceed',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updated = await updateOrderStatus(order.orderId, nextStatus);

        if (updated) {
          // If we just accepted the order, auto-generate the bill in the background (Requirement: auto-generate on accept)
          if (currentStatus === 'NEW') {
             billingAPI.createInvoiceForOrder(order.orderId).catch(err => {
               console.error('Auto-bill generation failed:', err);
             });

             // Auto-open print bill window for immediate hard copy (Requirement: Print when accepting)
             printOrderBill({ ...order, status: 'ACCEPTED' });
          }

          if (currentStatus === 'READY') {
            const servedOrder = { ...order, status: 'SERVED' };

          // Simplified: Just hand over to cashier directly as per new workflow.
          // The kitchen can still print the bill separately using the new card button.
          const cashierHandoverResult = await Swal.fire({
            icon: 'success',
            title: 'Order Completed in Kitchen',
            text: 'Do you want to send this bill to the Cashier desk now?',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            confirmButtonText: 'Send to Cashier',
            cancelButtonText: 'Later',
            allowOutsideClick: false,
          });

          if (cashierHandoverResult.isConfirmed) {
            await sendPaymentDetailsToCashier(servedOrder);
          }
        }
      }
    }
  });
};

  const handleCancelOrder = (orderId, orderNo) => {
    Swal.fire({
      title: 'Cancel Order',
      text: `Are you sure you want to cancel order ${orderNo}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, cancel it',
    }).then((result) => {
      if (result.isConfirmed) {
        updateOrderStatus(orderId, 'CANCELLED');
      }
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 1000 / 60);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getTimeClass = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 1000 / 60);

    if (diffMinutes > 15) return 'time-critical';
    if (diffMinutes > 10) return 'time-warning';
    return 'time-normal';
  };

  const handleOrderClick = (order, status) => {
    setSelectedOrder({ ...order, currentStatus: status });
    setShowDetailsModal(true);
  };

  const normalizeWhatsAppNumber = (phone) => {
    if (!phone) return '';

    let cleaned = String(phone).trim().replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
    cleaned = cleaned.replace(/\D/g, '');

    if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
    if (!cleaned) return '';
    if (cleaned.startsWith('94')) return cleaned;
    if (cleaned.startsWith('0')) return `94${cleaned.slice(1)}`;
    if (cleaned.length === 9) return `94${cleaned}`;

    return cleaned;
  };

  const formatBillCurrency = (value) => {
    return `Rs. ${parseFloat(value || 0).toFixed(2)}`;
  };

  const escapeHtml = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const sendPaymentDetailsToCashier = async (order, { showFeedback = true } = {}) => {
    try {
      const invoiceResponse = await billingAPI.createInvoiceForOrder(order.orderId);
      const invoice = invoiceResponse.data;

      await billingAPI.sendInvoiceToCashier(invoice.invoiceId);

      const successMessage = 'Payment details are now available on the cashier dashboard.';

      if (showFeedback) {
        Swal.fire({
          icon: 'success',
          title: 'Sent to cashier',
          text: successMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2600,
        });
      }

      return { success: true, message: successMessage };
    } catch (error) {
      console.error('Error sending payment details to cashier:', error);

      const errorMessage =
        error?.response?.data?.message || 'Failed to send payment details to cashier.';

      if (showFeedback) {
        Swal.fire({
          icon: 'error',
          title: 'Cashier handoff failed',
          text: errorMessage,
        });
      }

      return { success: false, message: errorMessage };
    }
  };

  const printOrderBill = (order) => {
    return new Promise((resolve) => {
      const printWindow = window.open('', '_blank', 'width=900,height=700');

      if (!printWindow) {
        Swal.fire({
          icon: 'warning',
          title: 'Popup blocked',
          text: 'Allow popups for this site and try again.',
        });
        resolve({
          continueToWhatsApp: false,
          sendToCashier: false,
          requiredActionsCompleted: false,
          hasPrinted: false,
          hasSentToCashier: false,
        });
        return;
      }

      let completed = false;
      let closedCheckTimer = null;
      let cashierRequestInFlight = false;
      const messageType = `KDS_BILL_ACTION_DONE_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const notifyBillWindow = (targetWindow, payload) => {
        if (!targetWindow || targetWindow.closed) return;

        try {
          targetWindow.postMessage(
            {
              type: messageType,
              action: 'cashierResult',
              success: !!payload?.success,
              message: payload?.message || '',
            },
            window.location.origin,
          );
        } catch (_error) {
          // Ignore postMessage errors while syncing cashier status back to bill window.
        }
      };

      const onBillActionComplete = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== messageType) return;

        if (event.data?.action === 'sendToCashier') {
          if (cashierRequestInFlight) return;

          cashierRequestInFlight = true;

          sendPaymentDetailsToCashier(order, { showFeedback: false })
            .then((result) => {
              notifyBillWindow(event.source, result);
            })
            .catch(() => {
              notifyBillWindow(event.source, {
                success: false,
                message: 'Failed to send payment details to cashier.',
              });
            })
            .finally(() => {
              cashierRequestInFlight = false;
            });

          return;
        }

        completePrintFlow({
          continueToWhatsApp: !!event.data?.continueToWhatsApp,
          sendToCashier: !!event.data?.sendToCashier,
          requiredActionsCompleted: !!event.data?.requiredActionsCompleted,
          hasPrinted: !!event.data?.hasPrinted,
          hasSentToCashier: !!event.data?.hasSentToCashier,
        });
      };

      const completePrintFlow = (result) => {
        if (completed) return;
        completed = true;

        if (closedCheckTimer) {
          window.clearInterval(closedCheckTimer);
          closedCheckTimer = null;
        }

        window.removeEventListener('message', onBillActionComplete);

        try {
          printWindow.close();
        } catch (_error) {
          // Ignore errors while closing a window controlled by browser print flow.
        }

        window.focus();
        resolve(result);
      };

      window.addEventListener('message', onBillActionComplete);

      // If the bill window is closed without clicking Print/Download, treat as incomplete.
      closedCheckTimer = window.setInterval(() => {
        if (printWindow.closed) {
          completePrintFlow({
            continueToWhatsApp: false,
            sendToCashier: false,
            requiredActionsCompleted: false,
            hasPrinted: false,
            hasSentToCashier: false,
          });
        }
      }, 400);

      const items = Array.isArray(order.orderItems) ? order.orderItems : [];
      const itemsMarkup = items
        .map((item, index) => {
          const qty = Number(item.qty || 1);
          const unitPrice = Number(item.unitPrice || 0);
          const lineTotal = Number(item.lineTotal || qty * unitPrice);
          const itemName = escapeHtml(item.itemName || item.foodItem?.itemName || 'Item');
          const notes = item.notes ? `<div style="font-size:12px;color:#666;">Note: ${escapeHtml(item.notes)}</div>` : '';

          return `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${index + 1}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${itemName}${notes}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatBillCurrency(unitPrice)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatBillCurrency(lineTotal)}</td>
          </tr>
        `;
        })
        .join('');

      const printableHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Bill - ${escapeHtml(order.orderNo || '')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
          .bill-wrap { max-width: 760px; margin: 0 auto; }
          .bill-actions { display: flex; gap: 12px; justify-content: flex-end; margin-bottom: 14px; }
          .bill-btn { border: 0; border-radius: 6px; padding: 14px 16px; cursor: pointer; font-size: 20px; transition: all 0.2s; }
          .bill-btn:hover { transform: scale(1.1); }
          .bill-btn:active { transform: scale(0.95); }
          .bill-btn-download { display: none; }
          .bill-btn-print { background: #198754; color: #fff; flex-grow: 1; }
          .bill-btn-cashier { background: #fd7e14; color: #fff; flex-grow: 1; }
          .bill-btn-whatsapp { display: none; }
          .bill-btn-back { background: #6c757d; color: #fff; width: 60px; }
          .bill-btn:disabled { opacity: 0.6; cursor: wait; }
          .bill-hint { color: #555; font-size: 13px; margin: 10px 0; text-align: center; font-weight: bold; }
          .bill-status {
            display: none;
            margin-bottom: 15px;
            text-align: center;
            font-size: 13px;
            padding: 10px;
            border-radius: 6px;
          }
          .bill-status-info { background: #e7f1ff; color: #0a58ca; }
          .bill-status-success { background: #e8f7ed; color: #146c43; }
          .bill-status-error { background: #fce8ea; color: #b02a37; }

          @media print {
            .bill-actions,
            .bill-hint,
            .bill-status {
              display: none !important;
            }

            body {
              padding: 8px;
            }
          }
        </style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      </head>
      <body>
        <div class="bill-wrap">
          <div class="bill-actions">
            <button id="printBillBtn" class="bill-btn bill-btn-print" type="button" title="Print Bill"><i class="fas fa-print me-2"></i>Print Bill</button>
            <button id="backToKdsBtn" class="bill-btn bill-btn-back" type="button" title="Return to KDS"><i class="fas fa-times"></i></button>
          </div>
          <div id="billStatus" class="bill-status" role="status" aria-live="polite"></div>
          <div id="billContent">
          <h2 style="margin:0 0 8px 0;">Customer Bill</h2>
          <div style="margin-bottom:14px;font-size:14px;">
            <div><strong>Order No:</strong> ${escapeHtml(order.orderNo || '-')}</div>
            <div><strong>${order.orderType === 'ROOM' ? 'Room' : 'Table'}:</strong> ${escapeHtml(order.roomNo || order.tableNo || '-')}</div>
            <div><strong>Customer:</strong> ${escapeHtml(order.customerName || '-')}</div>
            <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr>
                <th style="padding:8px;border-bottom:2px solid #222;text-align:left;">#</th>
                <th style="padding:8px;border-bottom:2px solid #222;text-align:left;">Item</th>
                <th style="padding:8px;border-bottom:2px solid #222;text-align:center;">Qty</th>
                <th style="padding:8px;border-bottom:2px solid #222;text-align:right;">Unit Price</th>
                <th style="padding:8px;border-bottom:2px solid #222;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsMarkup}
            </tbody>
          </table>
          <div style="margin-top:16px;text-align:right;font-size:14px;border-top:1px solid #ddd;padding-top:10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="color:#555;">Subtotal:</span>
              <span>${formatBillCurrency(order.subtotal || (order.totalAmount / 1.1))}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#555;">Service Charge (10%):</span>
              <span>${formatBillCurrency(order.serviceCharge || (order.totalAmount - order.totalAmount / 1.1))}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;border-top:2px solid #222;padding-top:8px;">
              <span>Grand Total:</span>
              <span>${formatBillCurrency(order.totalAmount)}</span>
            </div>
          </div>
          <div style="margin-top:24px;font-size:13px;color:#555;text-align:center;">Thank you!</div>
          </div>
        </div>

        <script>
          (function () {
            const runtimeMessageType = ${JSON.stringify(messageType)};
            const printBtn = document.getElementById('printBillBtn');
            const cashierBtn = document.getElementById('sendToCashierBtn');
            const backBtn = document.getElementById('backToKdsBtn');
            const billContent = document.getElementById('billContent');
            const billStatus = document.getElementById('billStatus');
            const fileName = ${JSON.stringify(`Bill-${String(order.orderNo || 'order')}.pdf`)};

            const setStatus = (message, tone) => {
              if (!billStatus) return;
              billStatus.textContent = message;
              billStatus.className = 'bill-status bill-status-' + tone;
              billStatus.style.display = 'block';
            };

            const refreshBackButtonState = () => {
              if (backBtn) backBtn.disabled = false;
            };

            const notifyAndClose = () => {
              window.close();
            };

            if (backBtn) {
              backBtn.addEventListener('click', function () {
                notifyAndClose();
              });
            }

            // Send to Cashier logic removed from print window as per requirement
            
            // Removed download script block as per requirement (No Download option)

            printBtn.addEventListener('click', function () {
              setStatus('Opening print dialog...', 'info');
              // Disable print button during print
              printBtn.disabled = true;
              window.print();
            });

            window.addEventListener('afterprint', function () {
              setStatus('Print completed. You may now close this window.', 'success');
              // Re-enable print button for potential retry
              printBtn.disabled = false;
            });


          })();
        </script>
      </body>
      </html>
    `;

      try {
        printWindow.document.open();
        printWindow.document.write(printableHtml);
        printWindow.document.close();
      } catch (error) {
        console.error('Error preparing printable bill:', error);
        completePrintFlow({
          continueToWhatsApp: false,
          sendToCashier: false,
          requiredActionsCompleted: false,
          hasPrinted: false,
          hasSentToCashier: false,
        });
        return;
      }

    });
  };

  const sendWhatsAppBill = (order) => {
    const normalizedWhatsapp = normalizeWhatsAppNumber(order.whatsappNumber);

    if (!normalizedWhatsapp) {
      Swal.fire('Error', 'No WhatsApp number found for this customer.', 'error');
      return;
    }

    const itemsList = (Array.isArray(order.orderItems) ? order.orderItems : [])
      .map((item) => {
        const name = item.itemName || item.foodItem?.itemName || 'Item';
        const qty = item.qty || 1;
        const total = item.lineTotal || qty * Number(item.unitPrice || 0);
        return `${name} x${qty} - Rs. ${parseFloat(total).toFixed(2)}`;
      })
      .join('\n');

    const subtotal = parseFloat(order.subtotal || order.totalAmount / 1.1).toFixed(2);
    const serviceCharge = parseFloat(order.serviceCharge || (order.totalAmount - order.totalAmount / 1.1)).toFixed(2);
    const message =
      `Hello ${order.customerName || ''} 👋\n` +
      `Here is your bill for order #${order.orderNo}.\n\n` +
      `Order ID: #${order.orderNo}\n` +
      `Table: ${order.tableNo || '-'}\n\n` +
      `Items:\n${itemsList}\n\n` +
      `Subtotal: Rs. ${subtotal}\n` +
      `Service Charge (10%): Rs. ${serviceCharge}\n` +
      `*Total: Rs. ${parseFloat(order.totalAmount).toFixed(2)}*\n\n` +
      `Thank you for ordering with us 🍔`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${normalizedWhatsapp}&text=${encodedMessage}`;
    const popup = window.open(whatsappUrl, '_blank');

    if (popup) {
      popup.opener = null;
    }

    if (!popup) {
      clearSwalBackdropArtifacts();
      Swal.fire({
        icon: 'warning',
        title: 'Popup blocked',
        text: 'Allow popups for this site and try again.',
      });
      return;
    }

    // Ensure no stale modal backdrop remains over the KDS after opening WhatsApp.
    setTimeout(clearSwalBackdropArtifacts, 0);

    Swal.fire({
      icon: 'success',
      title: 'WhatsApp opened',
      text: 'Bill message is ready. Tap Send in WhatsApp.',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2200,
    });
  };

  const OrderCard = ({ order, status }) => {
    const isNewlyArrived = status === 'NEW' && newlyArrivedOrders.has(order.orderId);
    const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
    
    const getStatusButton = () => {
      switch (status) {
        case 'NEW':
          return {
            text: 'Accept Order',
            icon: 'fa-check',
            color: 'success',
          };
        case 'ACCEPTED':
          return {
            text: 'Start Cooking',
            icon: 'fa-fire',
            color: 'warning',
          };
        case 'COOKING':
          return {
            text: 'Mark Ready',
            icon: 'fa-bell',
            color: 'info',
          };
        case 'READY':
          return {
            text: 'Served',
            icon: 'fa-concierge-bell',
            color: 'primary',
          };
        default:
          return null;
      }
    };

    const statusButton = getStatusButton();

    return (
      <div 
        className={`order-card card mb-3 ${isNewlyArrived ? 'new-order' : ''}`}
        onClick={() => handleOrderClick(order, status)}
        style={{ cursor: 'pointer' }}
      >
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <strong className="order-number">{order.orderNo}</strong>
            {(order.tableNo || order.roomNo) && (
              <span className={`badge ${order.orderType === 'ROOM' ? 'bg-info' : 'bg-primary'} ms-2`}>
                <i className={`fas ${order.orderType === 'ROOM' ? 'fa-concierge-bell' : 'fa-table'} me-1`}></i>
                {order.orderType === 'ROOM' ? 'Room ' : 'Table '}
                {order.roomNo || order.tableNo}
              </span>
            )}
          </div>
          <span className={`time-badge ${getTimeClass(order.createdAt)}`}>
            <i className="far fa-clock me-1"></i>
            {formatTime(order.createdAt)}
          </span>
        </div>
        <div className="card-body">
          {(order.customerName || order.whatsappNumber) && (
            <div className="customer-info-box mb-2">
              {order.customerName && (
                <div>
                  <i className="fas fa-user me-2 text-secondary"></i>
                  <strong>{order.customerName}</strong>
                </div>
              )}
              {order.whatsappNumber && (
                <div>
                  <i className="fa-brands fa-whatsapp me-2 text-success"></i>
                  <span>{order.whatsappNumber}</span>
                </div>
              )}
            </div>
          )}

          {order.notes && (
            <div className="alert alert-info py-2 mb-2">
              <i className="fas fa-info-circle me-2"></i>
              <small>{order.notes}</small>
            </div>
          )}
          
          <div className="order-items">
            <h6 className="mb-2">
              <i className="fas fa-list me-2"></i>
              Items:
            </h6>
            <ul className="list-unstyled mb-2">
              {orderItems.length > 0 ? (
                orderItems.map((item, index) => (
                  <li key={item.orderItemId || `${order.orderId}-${index}`} className="mb-1">
                    <strong>{item.qty || 1}x</strong> {item.itemName || item.foodItem?.itemName || 'Item'}
                    {item.notes && (
                      <div className="item-notes">
                        <i className="fas fa-sticky-note me-1"></i>
                        <small className="text-muted">{item.notes}</small>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-muted">
                  <small>No items available</small>
                </li>
              )}
            </ul>
          </div>

          <div className="order-total mt-2 pt-2 border-top">
            <strong>Total: ${parseFloat(order.totalAmount).toFixed(2)}</strong>
          </div>
        </div>
        <div className="card-footer kds-card-footer">
          {statusButton && (
            <button
              className={`btn btn-${statusButton.color} btn-sm kds-action-btn`}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(order, status);
              }}
            >
              <i className={`fas ${statusButton.icon} me-1`}></i>
              {statusButton.text}
            </button>
          )}

          {status === 'ACCEPTED' && (
            <button
              className="btn btn-outline-primary btn-sm kds-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                printOrderBill(order);
              }}
              title="Print Customer Bill"
            >
              <i className="fas fa-print"></i>
            </button>
          )}

          <button
            className="btn btn-outline-danger btn-sm kds-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCancelOrder(order.orderId, order.orderNo);
            }}
            title="Cancel Order"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'NEW': return 'fa-plus-circle';
      case 'ACCEPTED': return 'fa-check-circle';
      case 'COOKING': return 'fa-fire';
      case 'READY': return 'fa-bell';
      default: return 'fa-circle';
    }
  };

  const StatusColumn = ({ title, status, orders, bgClass }) => {
    const safeOrders = Array.isArray(orders) ? orders : [];

    return (
      <div className="col-md-3">
        <div className={`status-column ${bgClass}`}>
          <h5 className="status-header">
            <i className={`fas ${getStatusIcon(status)} me-2`}></i>
            {title}
            <span className="badge bg-dark ms-2">{safeOrders.length}</span>
          </h5>
          <div className="orders-container">
            {safeOrders.length === 0 ? (
              <div className="text-center text-muted py-4">
                <i className="fas fa-inbox fa-3x mb-2"></i>
                <p>No orders</p>
              </div>
            ) : (
              safeOrders.map((order) => (
                <OrderCard key={order.orderId} order={order} status={status} />
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;
    const selectedItems = Array.isArray(selectedOrder.orderItems) ? selectedOrder.orderItems : [];

    const getNextStatusButton = () => {
      switch (selectedOrder.currentStatus) {
        case 'NEW':
          return { text: 'Accept Order', icon: 'fa-check', color: 'success', nextStatus: 'ACCEPTED' };
        case 'ACCEPTED':
          return { text: 'Start Cooking', icon: 'fa-fire', color: 'warning', nextStatus: 'COOKING' };
        case 'COOKING':
          return { text: 'Mark Ready', icon: 'fa-bell', color: 'info', nextStatus: 'READY' };
        case 'READY':
          return { text: 'Mark Served', icon: 'fa-utensils', color: 'success', nextStatus: 'SERVED' };
        default:
          return null;
      }
    };

    const nextStatusButton = getNextStatusButton();

    const handleModalStatusUpdate = () => {
      if (nextStatusButton) {
        setShowDetailsModal(false);
        handleStatusChange(selectedOrder, selectedOrder.currentStatus);
      }
    };

    const handleModalCancel = () => {
      setShowDetailsModal(false);
      handleCancelOrder(selectedOrder.orderId, selectedOrder.orderNo);
    };

    return (
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-receipt me-2"></i>
            Order Details - {selectedOrder.orderNo}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row mb-3">
            <div className="col-md-4">
              <div className="info-card">
                <label className="text-muted small mb-1">Order Number</label>
                <div className="h5 mb-0">{selectedOrder.orderNo}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="info-card">
                <label className="text-muted small mb-1">{selectedOrder.orderType === 'ROOM' ? 'Room' : 'Table'} Number</label>
                <div className="h5 mb-0">
                  {selectedOrder.roomNo || selectedOrder.tableNo ? (
                    <>
                      <i className={`fas ${selectedOrder.orderType === 'ROOM' ? 'fa-concierge-bell' : 'fa-table'} me-2 text-primary`}></i>
                      {selectedOrder.roomNo || selectedOrder.tableNo}
                    </>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="info-card">
                <label className="text-muted small mb-1">Status</label>
                <div className="h5 mb-0">
                  <span className={`badge bg-${getStatusBadgeColor(selectedOrder.currentStatus)}`}>
                    {selectedOrder.currentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <div className="info-card">
                <label className="text-muted small mb-1">Order Time</label>
                <div>
                  <i className="far fa-clock me-2"></i>
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="info-card">
                <label className="text-muted small mb-1">Time Elapsed</label>
                <div className={`badge ${getTimeClass(selectedOrder.createdAt)}`}>
                  {formatTime(selectedOrder.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {selectedOrder.notes && (
            <div className="alert alert-info mb-3">
              <i className="fas fa-info-circle me-2"></i>
              <strong>Notes:</strong> {selectedOrder.notes}
            </div>
          )}

          {(selectedOrder.customerName || selectedOrder.whatsappNumber) && (
            <div className="alert alert-light border mb-3">
              {selectedOrder.customerName && (
                <div className="mb-1">
                  <i className="fas fa-user me-2 text-secondary"></i>
                  <strong>Customer:</strong> {selectedOrder.customerName}
                </div>
              )}
              {selectedOrder.whatsappNumber && (
                <div>
                  <i className="fa-brands fa-whatsapp me-2 text-success"></i>
                  <strong>WhatsApp:</strong> {selectedOrder.whatsappNumber}
                </div>
              )}
            </div>
          )}

          <div className="order-items-section">
            <h6 className="mb-3">
              <i className="fas fa-list me-2"></i>
              Order Items
            </h6>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Total</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.length > 0 ? (
                    selectedItems.map((item, index) => (
                      <tr key={item.orderItemId || `${selectedOrder.orderId}-${index}`}>
                        <td>
                          <strong>{item.itemName || item.foodItem?.itemName || 'Item'}</strong>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-secondary">{item.qty || 1}</span>
                        </td>
                        <td className="text-end">${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="text-end">
                          <strong>${parseFloat(item.lineTotal || (item.qty || 1) * Number(item.unitPrice || 0)).toFixed(2)}</strong>
                        </td>
                        <td>
                          {item.notes ? (
                            <small className="text-muted">
                              <i className="fas fa-sticky-note me-1"></i>
                              {item.notes}
                            </small>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-3">
                        No items found for this order.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <td colSpan="3" className="text-end">
                      <strong>Grand Total:</strong>
                    </td>
                    <td className="text-end">
                      <strong className="text-primary h5 mb-0">
                        ${parseFloat(selectedOrder.totalAmount).toFixed(2)}
                      </strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button 
            variant="outline-danger" 
            onClick={handleModalCancel}
          >
            <i className="fas fa-times me-2"></i>
            Cancel Order
          </Button>
          <div>
            <Button 
              variant="secondary" 
              onClick={() => setShowDetailsModal(false)}
              className="me-2"
            >
              Close
            </Button>
            {nextStatusButton && (
              <Button 
                variant={nextStatusButton.color}
                onClick={handleModalStatusUpdate}
              >
                <i className={`fas ${nextStatusButton.icon} me-2`}></i>
                {nextStatusButton.text}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>
    );
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'NEW': return 'primary';
      case 'ACCEPTED': return 'warning';
      case 'COOKING': return 'danger';
      case 'READY': return 'success';
      case 'SERVED': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="dashboard-content">
          <div className="container-fluid">
            {/* Page Header */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="kds-header">
                  <h2>
                    <i className="fas fa-chart-line me-2"></i>
                    Kitchen Display System
                  </h2>
                  <div className="header-actions">
                    <span className={`kd-live-pill ${connected ? 'online' : 'offline'} me-2`}>
                      <i className={`fas ${connected ? 'fa-wifi' : 'fa-wifi-slash'} me-1`}></i>
                      {connected ? 'Live' : 'Disconnected'}
                    </span>
                    <button 
                      className="btn btn-outline-primary btn-sm me-2"
                      onClick={fetchAllOrders}
                      disabled={loading}
                    >
                      <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''} me-1`}></i>
                      Refresh
                    </button>
                    <span className="badge bg-secondary">
                      <i className="far fa-clock me-1"></i>
                      Sync: 30s
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Columns */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading orders...</p>
              </div>
            ) : (
              <div className="row g-3">
                <StatusColumn
                  title="New Orders"
                  status="NEW"
                  orders={orders.NEW}
                  bgClass="bg-new"
                />
                <StatusColumn
                  title="Accepted"
                  status="ACCEPTED"
                  orders={orders.ACCEPTED}
                  bgClass="bg-accepted"
                />
                <StatusColumn
                  title="Cooking"
                  status="COOKING"
                  orders={orders.COOKING}
                  bgClass="bg-cooking"
                />
                <StatusColumn
                  title="Ready"
                  status="READY"
                  orders={orders.READY}
                  bgClass="bg-ready"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal />
    </div>
  );
};

export default KitchenKDS;
