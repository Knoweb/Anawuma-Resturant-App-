import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import './CustomerQROrder.css';

const normalizeWhatsAppNumber = (phone) => {
  if (!phone) return '';

  let cleaned = String(phone).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  cleaned = cleaned.replace(/\D/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  if (!cleaned) return '';
  if (cleaned.startsWith('94')) return cleaned;
  if (cleaned.startsWith('0')) return `94${cleaned.slice(1)}`;
  if (cleaned.length === 9) return `94${cleaned}`;
  return cleaned;
};

const CustomerQROrder = ({ isManual = false }) => {
  const { tableKey, roomKey } = useParams();
  const navigate = useNavigate();
  const [tableInfo, setTableInfo] = useState(null);
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [activeItemDetail, setActiveItemDetail] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalOrderType, setModalOrderType] = useState('table');
  const [orderLocation, setOrderLocation] = useState('inside');
  const [modalOrderNotes, setModalOrderNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [manualTableNo, setManualTableNo] = useState('');
  const [manualOrderType, setManualOrderType] = useState('TABLE');
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [showStatusScreen, setShowStatusScreen] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState(null);
  const [shownNotifications, setShownNotifications] = useState(new Set());
  const { subscribe, connected } = useWebSocket();
  const { user, isAuthenticated } = useAuthStore();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Helper to show notifications (Toast + Browser)
  const showNotification = useCallback((title, message, type = 'info') => {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        tag: 'order-update'
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Play sound (optional)
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => { });
      } catch (e) { }
    }

    // Also show SweetAlert notification
    Swal.fire({
      title: title,
      text: message,
      icon: type,
      timer: 4000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }, []);

  // Refresh order status logic
  const refreshOrderStatus = useCallback(async () => {
    if (!orderSuccess || !orderSuccess.orderId) return;

    try {
      const headers = {};
      if (tableKey) headers['x-table-key'] = tableKey;
      if (roomKey) headers['x-room-key'] = roomKey;
      // Always include auth token - required for cashier manual orders
      const authToken = useAuthStore.getState()?.token;
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const endpoint = isManual
        ? `/orders/${orderSuccess.orderId}`
        : `/orders/track/${orderSuccess.orderId}`;

      const response = await apiClient.get(
        endpoint,
        {
          headers
        }
      );

      const newStatus = response.data.status;

      setCurrentOrderStatus(prevStatus => {
        if (newStatus !== prevStatus) {
          setShownNotifications(prevNotifications => {
            if (!prevNotifications.has(newStatus)) {
              if (newStatus === 'ACCEPTED') {
                showNotification(
                  'Order Accepted! 👨‍🍳',
                  `Your order #${orderSuccess.orderNo} has been accepted by the kitchen.`,
                  'success'
                );
              } else if (newStatus === 'READY') {
                showNotification(
                  'Order Ready! 🍽️',
                  `Your order #${orderSuccess.orderNo} is ready! We'll bring it to your room shortly.`,
                  'success'
                );
              } else if (newStatus === 'CANCELLED') {
                showNotification(
                  'Order Cancelled ❌',
                  `Your order #${orderSuccess.orderNo} has been cancelled. Please contact staff for assistance.`,
                  'error'
                );
              }
              return new Set(prevNotifications).add(newStatus);
            }
            return prevNotifications;
          });
        }
        return newStatus;
      });
    } catch (error) {
      console.error('Error fetching order status:', error);
    }
  }, [orderSuccess, tableKey, roomKey, showNotification]);

  // Real-time listener for order status updates
  useEffect(() => {
    if (!connected || !orderSuccess) return;

    const unsubscribe = subscribe('order:status-update', (updatedOrder) => {
      // Only refresh if the update is for THIS specific order
      if (updatedOrder && updatedOrder.orderId === orderSuccess.orderId) {
        console.log('WS: Order status updated for current order!', updatedOrder.status);
        refreshOrderStatus();
      }
    });

    return () => unsubscribe();
  }, [connected, subscribe, orderSuccess, refreshOrderStatus]);

  // Occasional polling fallback (safety first)
  useEffect(() => {
    let pollInterval;

    if (orderSuccess && orderSuccess.orderId) {
      setCurrentOrderStatus(orderSuccess.status);

      // Fallback poll every 2 minutes
      pollInterval = setInterval(refreshOrderStatus, 120000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderSuccess, refreshOrderStatus]);

  const fetchTableInfo = useCallback(async () => {
    try {
      if (isManual) {
        // Read user from store at call time - NOT as a dependency to avoid re-render loops
        const currentUser = useAuthStore.getState()?.user;
        if (!currentUser || !currentUser.restaurantId) {
          throw new Error('User not logged in or restaurant ID missing');
        }

        const restaurantName = currentUser.restaurantName ||
          currentUser.restaurant?.restaurantName ||
          'Restaurant';
        const logo = currentUser.restaurantLogo || currentUser.restaurant?.logo || null;

        setTableInfo({
          restaurantId: currentUser.restaurantId,
          restaurantName,
          logo,
          isManual: true
        });
        return currentUser.restaurantId;
      }

      let response;
      if (tableKey) {
        response = await apiClient.get(`/qr/resolve/${tableKey}`);
        setTableInfo(response.data);
      } else if (roomKey) {
        response = await apiClient.get(`/qr/room/resolve/${roomKey}`);
        setTableInfo({
          ...response.data.data,
          tableNo: response.data.data.roomNo,
          isRoom: true
        });
      }

      return response.data.data?.restaurantId || response.data.restaurantId;
    } catch (error) {
      console.error('Error resolving QR code:', error);
      const currentUser = useAuthStore.getState()?.user;
      if (isManual && currentUser?.restaurantId) {
        setTableInfo({ restaurantId: currentUser.restaurantId, restaurantName: 'Restaurant', isManual: true });
        return currentUser.restaurantId;
      }
      if (!isManual) Swal.fire('Error', 'Invalid QR code. Please scan again.', 'error');
      throw error;
    }
  }, [tableKey, roomKey, isManual]); // NO 'user' dependency - prevents infinite re-render

  const fetchMenuData = useCallback(async (restaurantId) => {
    try {
      // Get token for authenticated requests
      let authHeaders = {};
      try {
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
          const { state } = JSON.parse(authData);
          if (state?.token) authHeaders['Authorization'] = `Bearer ${state.token}`;
        }
      } catch (e) { /* ignore */ }

      const [menusRes, categoriesRes, foodItemsRes] = await Promise.all([
        apiClient.get(`/menus/all?restaurantId=${restaurantId}`, { headers: authHeaders }),
        apiClient.get(`/categories?restaurantId=${restaurantId}`, { headers: authHeaders }),
        apiClient.get(`/food-items?restaurantId=${restaurantId}`, { headers: authHeaders }),
      ]);

      const restaurantMenus = (menusRes.data || []).filter(
        menu => menu.restaurantId === restaurantId
      );
      const restaurantCategories = categoriesRes.data || [];
      const restaurantFoodItems = (foodItemsRes.data || []).filter(
        item => item.restaurantId === restaurantId
      );

      setMenus(restaurantMenus);
      setCategories(restaurantCategories);
      setFoodItems(restaurantFoodItems);
      setFilteredItems(restaurantFoodItems);
    } catch (error) {
      console.error('Error fetching menu data:', error);
      if (error?.response?.status !== 401) {
        Swal.fire('Error', 'Failed to load menu. Please try again.', 'error');
      }
    }
  }, []);

  // Clear any stale 'active_order_undefined' that could accumulate from previous manual order sessions
  useEffect(() => {
    if (isManual) {
      localStorage.removeItem('active_order_undefined');
    }
  }, [isManual]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const restaurantId = await fetchTableInfo();
        await fetchMenuData(restaurantId);

        // Restore active order for this table/room
        // Skip for manual orders (currentKey=undefined) to prevent stale 'active_order_undefined'
        // entries from triggering unauthenticated /orders/track calls → 401 → login redirect.
        const currentKey = tableKey || roomKey;
        const savedOrder = currentKey ? localStorage.getItem(`active_order_${currentKey}`) : null;
        if (savedOrder) {
          try {
            const orderData = JSON.parse(savedOrder);
            setOrderSuccess(orderData);
            setCustomerName(orderData.customerName || '');
            setWhatsappNumber(orderData.whatsappNumber || '');

            const headers = {};
            if (tableKey) headers['x-table-key'] = tableKey;
            if (roomKey) headers['x-room-key'] = roomKey;
            // Include auth token so cashier track calls succeed
            const authToken = useAuthStore.getState()?.token;
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            // Try to fetch latest status
            const endpoint = isManual
              ? `/orders/${orderData.orderId}`
              : `/orders/track/${orderData.orderId}`;

            apiClient.get(endpoint, {
              headers
            }).then(resp => {
              if (resp.data.status === 'SERVED' || resp.data.status === 'CANCELLED') {
                localStorage.removeItem(`active_order_${currentKey}`);
              }
              setCurrentOrderStatus(resp.data.status);
            }).catch(err => console.error('Error verifying restored order:', err));
          } catch (e) {
            console.error('Error parsing saved order:', e);
          }
        }
      } catch (error) {
        // Error already handled
      } finally {
        setLoading(false);
      }
    };

    if (tableKey || roomKey || isManual) {
      loadData();
    } else {
      Swal.fire('Error', 'Invalid QR code.', 'error');
      setLoading(false);
    }
  }, [tableKey, roomKey, isManual, fetchTableInfo, fetchMenuData]);

  useEffect(() => {
    let filtered = foodItems;

    if (selectedMenu) {
      filtered = filtered.filter(item => {
        // Find if this item belongs to any category that is under this menu
        const itemCategory = categories.find(c => c.categoryId === item.categoryId);
        return itemCategory && itemCategory.menuId === selectedMenu;
      });
    }

    setFilteredItems(filtered);
  }, [selectedMenu, foodItems, categories]);

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.foodItemId === item.foodItemId);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.foodItemId === item.foodItemId
          ? { ...cartItem, qty: cartItem.qty + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        foodItemId: item.foodItemId,
        name: item.itemName,
        price: parseFloat(item.price),
        qty: 1,
        notes: ''
      }]);
    }
    setShowCart(true);
  };

  const updateCartItemQty = (foodItemId, delta) => {
    setCart(cart.map(item =>
      item.foodItemId === foodItemId
        ? { ...item, qty: Math.max(1, item.qty + delta) }
        : item
    ).filter(item => item.qty > 0));
  };

  const removeFromCart = (foodItemId) => {
    setCart(cart.filter(item => item.foodItemId !== foodItemId));
  };

  const updateCartItemNotes = (foodItemId, notes) => {
    setCart(cart.map(item =>
      item.foodItemId === foodItemId ? { ...item, notes } : item
    ));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const calculateServiceCharge = () => {
    return calculateSubtotal() * 0.1;
  };

  const calculateTotal = () => {
    return (calculateSubtotal() + calculateServiceCharge()).toFixed(2);
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      Swal.fire('Validation Error', 'Please add at least one item to your order', 'warning');
      return;
    }

    if (isManual && !manualTableNo.trim()) {
      Swal.fire('Validation Error', `Please enter a ${manualOrderType === 'ROOM' ? 'Room' : 'Table'} number`, 'warning');
      return;
    }

    if (!isManual && !customerName.trim()) {
      Swal.fire('Validation Error', 'Please enter your name', 'warning');
      return;
    }

    const normalizedWhatsapp = whatsappNumber ? normalizeWhatsAppNumber(whatsappNumber) : '';

    if (!isManual && (!normalizedWhatsapp || normalizedWhatsapp.length < 10 || normalizedWhatsapp.length > 15)) {
      Swal.fire('Validation Error', 'Please enter a valid WhatsApp number', 'warning');
      return;
    }

    try {
      const orderPayload = {
        customerName: customerName.trim() || 'Manual Order',
        whatsappNumber: normalizedWhatsapp || null,
        notes: orderNotes.trim() || null,
        items: cart.map(item => ({
          foodItemId: item.foodItemId,
          qty: item.qty,
          notes: item.notes || null
        }))
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      let endpoint = '/orders';

      if (isManual) {
        endpoint = '/orders/manual';
        orderPayload.orderType = 'MANUAL_CASHIER';

        // Normalize: remove leading zeros if numeric (e.g., "03" -> "3")
        const normalizedManualNo = manualTableNo.trim().replace(/^0+/, '') || manualTableNo.trim();

        if (manualOrderType === 'ROOM') {
          orderPayload.roomNo = normalizedManualNo;
        } else {
          orderPayload.tableNo = normalizedManualNo;
        }
      } else {
        if (tableKey) headers['x-table-key'] = tableKey;
        if (roomKey) headers['x-room-key'] = roomKey;
      }

      const response = await apiClient.post(
        endpoint,
        orderPayload,
        {
          headers
        }
      );

      // Success
      const orderData = {
        ...response.data,
        customerName: customerName.trim(),
        whatsappNumber: normalizedWhatsapp
      };

      setOrderSuccess(orderData);
      localStorage.setItem(`active_order_${tableKey || roomKey}`, JSON.stringify(orderData));

      if (isManual) {
        setCart([]);
        setOrderNotes('');
        setShowCart(false);
        const target = manualOrderType === 'ROOM' ? '/manual-orders/rooms' : '/manual-orders/tables';
        navigate(target);
      } else {
        setShowStatusScreen(true);
        setCart([]);
        setOrderNotes('');
        setShowCart(false);
      }

    } catch (error) {
      console.error('Order error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to place order. Please try again.';
      Swal.fire('Order Failed', errorMsg, 'error');
    }
  };

  const placeQuickManualOrder = async () => {
    if (orderLocation === 'inside' && !manualTableNo.trim()) {
      Swal.fire('Validation Error', `Please enter a ${modalOrderType === 'room' ? 'Room' : 'Table'} number`, 'warning');
      return;
    }

    try {
      const orderPayload = {
        customerName: customerName.trim() || 'Manual Order',
        whatsappNumber: null,
        notes: modalOrderNotes.trim() || null,
        items: [{
          foodItemId: activeItemDetail.foodItemId,
          qty: modalQty,
          notes: modalOrderNotes.trim() || null
        }],
        orderType: 'MANUAL_CASHIER'
      };

      if (orderLocation === 'inside') {
        const normalizedManualNo = manualTableNo.trim().replace(/^0+/, '') || manualTableNo.trim();
        if (modalOrderType === 'room') {
          orderPayload.roomNo = normalizedManualNo;
        } else {
          orderPayload.tableNo = normalizedManualNo;
        }
      }

      const response = await apiClient.post('/orders/manual', orderPayload);

      // Success
      const orderData = {
        ...response.data,
        customerName: customerName.trim()
      };

      setOrderSuccess(orderData);
      setCart([]);
      setActiveItemDetail(null);
      setModalOrderNotes('');

      const target = modalOrderType === 'room' ? '/manual-orders/rooms' : '/manual-orders/tables';
      navigate(target);

    } catch (error) {
      console.error('Quick Order error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to place order. Please try again.';
      Swal.fire('Order Failed', errorMsg, 'error');
    }
  };

  const startNewOrder = () => {
    localStorage.removeItem(`active_order_${tableKey || roomKey}`);
    setOrderSuccess(null);
    setCurrentOrderStatus(null);
    setCustomerName('');
    setWhatsappNumber('');
    setSelectedMenu(null);
    setShownNotifications(new Set());
  };

  // Get status badge color and icon
  const getStatusDisplay = (status) => {
    const displays = {
      'NEW': { color: 'primary', icon: 'fa-clock', text: 'Order Received' },
      'ACCEPTED': { color: 'info', icon: 'fa-check-circle', text: 'Kitchen Accepted' },
      'COOKING': { color: 'warning', icon: 'fa-fire', text: 'Being Prepared' },
      'READY': { color: 'success', icon: 'fa-check-double', text: 'Ready to Serve' },
      'SERVED': { color: 'success', icon: 'fa-utensils', text: 'Served' },
      'CANCELLED': { color: 'danger', icon: 'fa-times-circle', text: 'Cancelled' }
    };
    return displays[status] || displays['NEW'];
  };

  // Logic to determine what to show in the main content area
  const renderMainContent = () => {
    if (orderSuccess && showStatusScreen) {
      const statusDisplay = getStatusDisplay(currentOrderStatus || orderSuccess.status);
      const isCancelled = (currentOrderStatus || orderSuccess.status) === 'CANCELLED';

      return (
        <div className="order-success-screen fade-in">
          <div className={`success-icon ${isCancelled ? 'cancelled-icon' : ''}`}>
            <i className={`fas ${isCancelled ? 'fa-times-circle' : 'fa-check-circle'}`}></i>
          </div>
          <h1>{isCancelled ? 'Order Cancelled' : 'Order Placed Successfully!'}</h1>
          <div className="order-details-card">
            <h3>Order Number</h3>
            <div className="order-number">{orderSuccess.orderNo}</div>

            {/* Real-time Status Tracker */}
            <div className="order-status-tracker mt-4">
              <h5>Order Status</h5>
              <div className={`status-badge badge bg-${statusDisplay.color} pulse-animation`}>
                <i className={`fas ${statusDisplay.icon} me-2`}></i>
                {statusDisplay.text}
              </div>

              {/* Status Progress */}
              <div className="status-timeline mt-3">
                <div className={`timeline-step ${['NEW', 'ACCEPTED', 'COOKING', 'READY', 'SERVED'].indexOf(currentOrderStatus || orderSuccess.status) >= 0 ? 'completed' : ''}`}>
                  <i className="fas fa-check-circle"></i>
                  <span>Received</span>
                </div>
                <div className={`timeline-step ${['ACCEPTED', 'COOKING', 'READY', 'SERVED'].indexOf(currentOrderStatus || orderSuccess.status) >= 0 ? 'completed' : ''}`}>
                  <i className="fas fa-thumbs-up"></i>
                  <span>Accepted</span>
                </div>
                <div className={`timeline-step ${['COOKING', 'READY', 'SERVED'].indexOf(currentOrderStatus || orderSuccess.status) >= 0 ? 'completed' : ''}`}>
                  <i className="fas fa-fire"></i>
                  <span>Cooking</span>
                </div>
                <div className={`timeline-step ${['READY', 'SERVED'].indexOf(currentOrderStatus || orderSuccess.status) >= 0 ? 'completed' : ''}`}>
                  <i className="fas fa-bell"></i>
                  <span>Ready</span>
                </div>
                <div className={`timeline-step ${currentOrderStatus === 'SERVED' ? 'completed' : ''}`}>
                  <i className="fas fa-utensils"></i>
                  <span>Served</span>
                </div>
              </div>
            </div>

            <div className="order-info mt-4">
              <p><strong>{tableInfo?.isRoom ? 'Room' : 'Table'}:</strong> {tableInfo?.tableNo || orderSuccess.tableNo || orderSuccess.roomNo}</p>
              <p><strong>Restaurant:</strong> {tableInfo?.restaurantName}</p>
              <div className="billing-breakdown mt-3 border-top pt-2">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Subtotal:</span>
                  <span className="small">Rs. {orderSuccess.subtotal || (orderSuccess.totalAmount / 1.1).toFixed(0)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted small">Service Charge (10%):</span>
                  <span className="small">Rs. {orderSuccess.serviceCharge || (orderSuccess.totalAmount - (orderSuccess.totalAmount / 1.1)).toFixed(0)}</span>
                </div>
                <div className="d-flex justify-content-between mt-1 fw-bold">
                  <span>Grand Total:</span>
                  <span>Rs. {orderSuccess.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>

          {currentOrderStatus === 'READY' && (
            <div className="alert alert-success mt-3">
              <i className="fas fa-check-circle me-2"></i>
              <strong>Your order is ready!</strong> Our staff will bring it to your {tableInfo?.isRoom ? 'room' : 'table'} shortly.
            </div>
          )}

          {currentOrderStatus === 'CANCELLED' && (
            <div className="alert alert-danger mt-3">
              <i className="fas fa-times-circle me-2"></i>
              <strong>Order Cancelled!</strong> Your order has been cancelled. Please contact our staff for assistance.
            </div>
          )}

          {currentOrderStatus === 'SERVED' && (
            <div className="alert alert-info mt-3">
              <i className="fas fa-smile me-2"></i>
              <strong>Enjoy your meal!</strong> Thank you for dining with us.
            </div>
          )}

          <p className="success-message">
            {currentOrderStatus === 'CANCELLED'
              ? 'Please contact our staff if you have any questions.'
              : currentOrderStatus === 'SERVED'
                ? 'Thank you! We hope you enjoy your meal.'
                : currentOrderStatus === 'READY'
                  ? 'Your food will be served shortly!'
                  : 'We\'ll notify you when your order status changes!'}
          </p>

          <div className="d-flex flex-column gap-3">
            <button className="btn btn-outline-secondary w-100" onClick={() => setShowStatusScreen(false)} style={{ padding: '14px', borderRadius: 'var(--radius-btn)', fontWeight: '700' }}>
              <i className="fas fa-utensils me-2"></i> Back to Menu
            </button>
            <button className="place-another-btn" onClick={startNewOrder}>
              <i className="fas fa-plus me-2"></i> Place Another Order
            </button>
          </div>
        </div>
      );
    }

    if (!selectedMenu && !isManual) {
      return (
        <div className="slider-container-yellow fade-in">
          <div className="section-title w-100 text-center mb-4 px-4">
            <h1 className="fw-900 text-dark" style={{ fontSize: '3rem' }}>Welcome</h1>
            <p className="text-dark opacity-75">Please select a menu to start ordering</p>
          </div>

          <div className="menu-grid-yellow">
            {menus.map(menu => {
              const menuCats = categories.filter(c => c.menuId === menu.menuId);
              return (
                <div key={menu.menuId} className="modern-category-card">
                  <h2 className="category-title-red">{menu.menuName}</h2>
                  <div className="card-media-wrapper" onClick={() => setSelectedMenu(menu.menuId)}>
                    {menu.imageUrl ? (
                      <img src={getImageUrl(menu.imageUrl)} alt={menu.menuName} className="menu-thumb" />
                    ) : (
                      <div className="h-100 d-flex align-items-center justify-content-center bg-light opacity-50">
                        <i className="fas fa-utensils fa-4x"></i>
                      </div>
                    )}

                    {/* Category Buttons ON TOP of Image */}
                    <div className="category-row-overlay">
                      {menuCats.map(cat => (
                        <button
                          key={cat.categoryId}
                          className="quick-nav-btn py-1 px-3"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => {
                            setSelectedMenu(menu.menuId);
                          }}
                        >
                          {cat.categoryName}
                        </button>
                      ))}
                    </div>

                    <div className="media-overlay flex-column">
                      <div className="d-flex w-100 mb-1">
                        <button className="media-btn w-50" onClick={(e) => { e.stopPropagation(); Swal.fire('Coming Soon', 'Photo gallery is being prepared!', 'info'); }}>Photo</button>
                        <button className="media-btn w-50" onClick={(e) => { e.stopPropagation(); Swal.fire('Coming Soon', 'Video gallery is being prepared!', 'info'); }}>Video</button>
                      </div>
                      <button className="media-btn w-100" onClick={(e) => { e.stopPropagation(); setSelectedMenu(menu.menuId); }}>Select</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (selectedMenu && !isManual) {
      const menuItems = filteredItems;

      return (
        <div className="slider-container-yellow fade-in">
          <div className="w-100 d-flex justify-content-start mb-2 px-4" style={{ maxWidth: '1200px' }}>
            <button className="back-to-menus" onClick={() => setSelectedMenu(null)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="ms-3">
              <h2 className="mb-0 fw-bold">{menus.find(m => m.menuId === selectedMenu)?.menuName}</h2>
              <p className="text-muted small mb-0">{menuItems.length} items available</p>
            </div>
          </div>

          <div className="menu-grid-yellow">
            {menuItems.map(item => {
              const displayImage = item.imageUrl1 || item.imageUrl || item.imageUrl2;

              return (
                <div key={item.foodItemId} className="modern-category-card">
                  <h2 className="category-title-red">{item.itemName}</h2>
                  <div className="card-media-wrapper">
                    {displayImage ? (
                      <img src={getImageUrl(displayImage)} alt={item.itemName} className="menu-thumb" />
                    ) : (
                      <div className="h-100 d-flex align-items-center justify-content-center bg-light opacity-50">
                        <i className="fas fa-utensils fa-4x"></i>
                      </div>
                    )}

                    <div className="media-overlay flex-column">
                      <div className="mb-2 text-white fw-bold" style={{ fontSize: '1.2rem', textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
                        Rs. {parseFloat(item.price).toFixed(0)}
                      </div>
                      <div className="d-flex w-100 mb-1">
                        <button className="media-btn w-50" onClick={(e) => { e.stopPropagation(); Swal.fire(item.itemName, item.description || 'No description available', 'info'); }}>Info</button>
                        <button className="media-btn w-50" onClick={(e) => { e.stopPropagation(); addToCart(item); }}>Add</button>
                      </div>
                      <button className="media-btn w-100 bg-primary-yellow text-dark fw-bold" onClick={(e) => { e.stopPropagation(); addToCart(item); }}>Select</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (isManual) {
      // Group categories by menu for manual order as per user sketch
      const groupedData = menus.map(menu => {
        const menuCats = categories.filter(cat => cat.menuId === menu.menuId);
        return { ...menu, cats: menuCats };
      }).filter(m => m.cats.length > 0);

      return (
        <div className="manual-dashboard-layout d-flex" style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#fcfcfc' }}>
          {/* Dashboard Sidebar */}
          <aside className="manual-dashboard-sidebar bg-white border-end shadow-sm" style={{ width: '220px', position: 'sticky', top: '80px', height: 'calc(100vh - 80px)', overflowY: 'auto', zIndex: 10 }}>
            <div className="p-3 border-bottom bg-light">
              <h6 className="mb-0 fw-bold text-uppercase small text-muted"><i className="fas fa-th-large me-2"></i> Categories</h6>
            </div>
            <div className="list-group list-group-flush">
              {groupedData.map(group => (
                <button
                  key={group.menuId}
                  className="list-group-item list-group-item-action border-0 py-3 small fw-bold d-flex align-items-center"
                  onClick={() => {
                    const el = document.getElementById(`menu-group-${group.menuId}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{ fontSize: '0.82rem', letterSpacing: '0.3px', transition: 'all 0.2s' }}
                >
                  <i className="fas fa-chevron-right me-2 opacity-50 small"></i> {group.menuName}
                </button>
              ))}
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="manual-content-main flex-grow-1 p-0">
            <div className="w-100 mb-5 px-4 pt-5 text-center">
              <h1 className="manual-main-title">Create Manual Order</h1>
              <div className="title-divider mx-auto"></div>
            </div>

            <div className="manual-sections-container px-4">
              {groupedData.map(group => (
                <div key={group.menuId} id={`menu-group-${group.menuId}`} className="menu-group-section mb-5 pt-3">
                  <div className="sketch-header mb-4">
                    <h2 className="sketch-header-text">{group.menuName}</h2>
                  </div>

                  <div className="sketch-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                    {group.cats.map(cat => {
                      const catItems = foodItems.filter(item => item.categoryId === cat.categoryId);
                      return (
                        <div
                          key={cat.categoryId}
                          className="sketch-category-box"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (catItems.length > 0) {
                              setActiveItemDetail(catItems[0]);
                              setModalQty(1);
                            }
                          }}
                        >
                          <div className="sketch-box-label">
                            <span>{cat.categoryName}</span>
                          </div>
                          <div className="sketch-box-media" style={{ width: '100%', height: '150px', background: '#fafafa' }}>
                            {catItems.length > 0 && (catItems[0].imageUrl1 || catItems[0].imageUrl) ? (
                              <img src={getImageUrl(catItems[0].imageUrl1 || catItems[0].imageUrl)} alt={cat.categoryName} />
                            ) : (
                              <div className="sketch-placeholder"><i className="fas fa-utensils"></i></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="items-view-container">
        {/* Basic fallback if somehow reached here without menu */}
        <div className="text-center py-5">
          <p>Please select a menu to start ordering.</p>
          <button className="btn btn-primary" onClick={() => setSelectedMenu(null)}>Back to Menus</button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="customer-qr-order-container">
        <div className="loading-screen">
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className="customer-qr-order-container">
        <div className="error-screen">
          <i className="fas fa-exclamation-triangle fa-3x mb-3"></i>
          <h2>{isManual ? 'Connection Error' : 'Invalid QR Code'}</h2>
          <p>
            {isManual
              ? 'Unable to load your restaurant profile. Please check your connection or try logging in again.'
              : 'Please scan a valid QR code from your table or room.'}
          </p>
        </div>
      </div>
    );
  }

  // Helper to resolve image URL
  const getImageUrl = (url) => {
    if (!url) return null;
    return url; // Now handled automatically by apiClient interceptor
  };

  return (
    <div className="customer-qr-order-container">
      {/* Item Detail Modal as per Sketch */}
      {activeItemDetail && (
        <div className="sketch-modal-overlay" onClick={() => setActiveItemDetail(null)}>
          <div className="sketch-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sketch-modal-header py-3">
              <span className="fw-bold fs-5 text-uppercase">{activeItemDetail.category?.categoryName || 'Product Info'}</span>
            </div>

            <div className="sketch-modal-body d-flex flex-wrap p-0">
              {/* Left Column: Product Info */}
              <div className="sketch-modal-left-col p-4 border-end">
                <div className="sketch-modal-image-area mb-4">
                  <img src={getImageUrl(activeItemDetail.imageUrl1 || activeItemDetail.imageUrl)} alt={activeItemDetail.itemName} />
                </div>

                <div className="sketch-modal-info-rows">
                  <div className="sketch-detail-row">
                    <span className="label">Name :</span>
                    <span className="value fw-bold">{activeItemDetail.itemName}</span>
                  </div>
                  <div className="sketch-detail-row">
                    <span className="label">Code :</span>
                    <span className="value">{activeItemDetail.foodItemId}</span>
                  </div>
                  <div className="sketch-detail-row">
                    <span className="label">Price :</span>
                    <span className="value">Rs. {parseFloat(activeItemDetail.price).toFixed(0)}</span>
                  </div>
                  <div className="sketch-detail-row quantity-row my-3 py-2 border-top border-bottom">
                    <span className="label">Quantity :</span>
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => setModalQty(Math.max(1, modalQty - 1))}>-</button>
                      <span className="qty-value">{modalQty}</span>
                      <button className="qty-btn" onClick={() => setModalQty(modalQty + 1)}>+</button>
                    </div>
                  </div>

                  <div className="sketch-price-breakdown bg-light p-3 rounded">
                    <div className="sketch-detail-row mb-1">
                      <span className="label small text-muted">Food Subtotal :</span>
                      <span className="value small">Rs. {parseFloat(activeItemDetail.price * modalQty).toFixed(0)}</span>
                    </div>
                    <div className="sketch-detail-row mb-2">
                      <span className="label small text-muted">Service Charge (10%) :</span>
                      <span className="value small">Rs. {parseFloat(activeItemDetail.price * modalQty * 0.1).toFixed(0)}</span>
                    </div>
                    <div className="sketch-detail-row total-row border-top pt-2 d-flex justify-content-between align-items-center flex-nowrap">
                      <span className="label fw-bold h5 mb-0 text-nowrap">Total Amount</span>
                      <span className="value fw-bold h5 mb-0 text-nowrap" style={{ color: '#266668' }}>Rs. {parseFloat(activeItemDetail.price * modalQty * 1.1).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Fields */}
              <div className="sketch-modal-right-col flex-grow-1 p-4 bg-light">
                <div className="mb-4">
                  <label className="d-block mb-2 fw-bold text-muted small">ORDER LOCATION *</label>
                  <div className="d-flex gap-2">
                    <button
                      className={`flex-grow-1 btn ${orderLocation === 'inside' ? 'btn-primary' : 'btn-outline-primary'}`}
                      style={orderLocation === 'inside' ? { backgroundColor: '#266668', color: 'white' } : { color: '#266668', borderColor: '#266668' }}
                      onClick={() => setOrderLocation('inside')}
                    >
                      IN SIDE
                    </button>
                    <button
                      className={`flex-grow-1 btn ${orderLocation === 'outside' ? 'btn-primary' : 'btn-outline-primary'}`}
                      style={orderLocation === 'outside' ? { backgroundColor: '#266668', color: 'white' } : { color: '#266668', borderColor: '#266668' }}
                      onClick={() => setOrderLocation('outside')}
                    >
                      OUTSIDE
                    </button>
                  </div>
                </div>

                {orderLocation === 'inside' && (
                  <div className="fade-in">
                    <div className="mb-4">
                      <label className="d-block mb-2 fw-bold text-muted small">ORDER FOR *</label>
                      <div className="d-flex gap-2">
                        <button
                          className={`flex-grow-1 btn ${modalOrderType === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                          style={modalOrderType === 'table' ? { backgroundColor: '#266668', color: 'white' } : { color: '#266668', borderColor: '#266668' }}
                          onClick={() => setModalOrderType('table')}
                        >
                          Table
                        </button>
                        <button
                          className={`flex-grow-1 btn ${modalOrderType === 'room' ? 'btn-primary' : 'btn-outline-primary'}`}
                          style={modalOrderType === 'room' ? { backgroundColor: '#266668', color: 'white' } : { color: '#266668', borderColor: '#266668' }}
                          onClick={() => setModalOrderType('room')}
                        >
                          Room
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      {modalOrderType === 'room' ? (
                        <select
                          className="form-control sketch-input"
                          value={manualTableNo}
                          onChange={(e) => setManualTableNo(e.target.value)}
                        >
                          <option value="">Select Room Number</option>
                          {Array.from({ length: 16 }, (_, i) => (i + 1).toString()).map(room => (
                            <option key={room} value={room}>Room {room}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-control sketch-input"
                          placeholder="Enter Table Number"
                          value={manualTableNo}
                          onChange={(e) => setManualTableNo(e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-0">
                  <label className="d-block mb-2 fw-bold text-muted small">ORDER NOTES (OPTIONAL)</label>
                  <textarea
                    className="form-control sketch-input"
                    placeholder="Any special requests or instructions..."
                    rows="4"
                    value={modalOrderNotes}
                    onChange={(e) => setModalOrderNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="sticky-bottom-btn p-3 bg-white border-top">
              <button
                className="order-now-btn"
                onClick={placeQuickManualOrder}
              >
                ORDER NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Elegant Header */}
      <header className={`customer-header-v2 ${selectedMenu ? 'header-scrolled' : ''}`}>
        <div className="header-container">
          <div className="restaurant-brand-v2">
            {tableInfo?.logo ? (
              <img src={tableInfo.logo} alt={tableInfo.restaurantName} className="brand-logo-v2" />
            ) : (
              <div className="brand-placeholder-v2">
                <i className="fas fa-utensils"></i>
              </div>
            )}
            <div className="brand-text-v2">
              <h1 className="hotel-name-v2">{tableInfo.restaurantName}</h1>
              <div className="room-badge-v2">
                <i className={`fas ${tableInfo?.isRoom || manualOrderType === 'ROOM' ? 'fa-concierge-bell' : 'fa-chair'}`}></i>
                <span>
                  {isManual ? (
                    `${manualOrderType === 'ROOM' ? 'Room' : 'Table'} ${manualTableNo || '?'}`
                  ) : (
                    `${tableInfo?.isRoom ? 'Room' : 'Table'} ${tableInfo?.tableNo || tableInfo?.roomNo}`
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="cart-trigger-v2" onClick={() => setShowCart(true)}>
            <div className={`cart-btn-v2 ${cart.length > 0 ? 'pulse' : ''}`}>
              <i className="fas fa-shopping-bag"></i>
              {cart.length > 0 && <span className="cart-badge-v2">{cart.length}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Modern Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button
          className={`nav-item ${!showStatusScreen ? 'active' : ''}`}
          onClick={() => setShowStatusScreen(false)}
        >
          <i className="fas fa-utensils"></i>
          <span>Menu</span>
        </button>
        <button
          className={`nav-item ${showStatusScreen ? 'active' : ''} ${orderSuccess ? 'has-active-order' : ''}`}
          onClick={() => {
            if (orderSuccess) {
              setShowStatusScreen(true);
            } else {
              Swal.fire({
                title: 'No Active Order',
                text: 'You haven\'t placed an order yet.',
                icon: 'info',
                toast: true,
                position: 'bottom',
                timer: 3000,
                showConfirmButton: false
              });
            }
          }}
        >
          <div className="track-icon-wrapper">
            <i className="fas fa-receipt"></i>
            {orderSuccess && <span className="notification-dot"></span>}
          </div>
          <span>Track Order</span>
        </button>
      </nav>

      {/* Main Content Area */}
      {/* Main Content Area */}
      <main className="customer-main-content">
        {renderMainContent()}
      </main>

      {/* Cart Drawer */}
      <div className={`cart-drawer ${showCart ? 'open' : ''}`}>
        <div className="cart-header">
          <h4><i className="fas fa-shopping-cart me-2" style={{ marginRight: '8px' }}></i> Your Order</h4>
          <button className="btn-close" onClick={() => setShowCart(false)} style={{ fontSize: '1.5rem', opacity: 0.7 }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="empty-cart-modern">
              <i className="fas fa-shopping-basket"></i>
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.foodItemId} className="cart-item-modern">
                  <div className="cart-item-info" style={{ flex: 1, paddingRight: '10px' }}>
                    <h5>{item.name}</h5>
                    <p>Rs. {parseFloat(item.price).toFixed(0)}</p>
                    <input
                      type="text"
                      className="form-control form-control-sm mt-2"
                      placeholder="Special instructions..."
                      value={item.notes}
                      onChange={(e) => updateCartItemNotes(item.foodItemId, e.target.value)}
                      style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="cart-item-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item.foodItemId)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                    <div className="qty-controls">
                      <button onClick={() => updateCartItemQty(item.foodItemId, -1)}>
                        <i className="fas fa-minus"></i>
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateCartItemQty(item.foodItemId, 1)}>
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="order-inputs">
              <div className="table-info-display mb-3">
                {isManual ? (
                  <div className="manual-table-select">
                    <label className="form-label">Order For <span className="text-danger">*</span></label>
                    <div className="d-flex gap-2 mb-2">
                      <button
                        className={`btn btn-sm ${manualOrderType === 'TABLE' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setManualOrderType('TABLE')}
                        style={{ flex: 1 }}
                      >
                        Table
                      </button>
                      <button
                        className={`btn btn-sm ${manualOrderType === 'ROOM' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setManualOrderType('ROOM')}
                        style={{ flex: 1 }}
                      >
                        Room
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Enter ${manualOrderType === 'ROOM' ? 'Room' : 'Table'} Number`}
                      value={manualTableNo}
                      onChange={(e) => setManualTableNo(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <i className={`fas ${tableInfo?.isRoom ? 'fa-concierge-bell' : 'fa-chair'} me-2`}></i>
                    <strong>{tableInfo?.isRoom ? 'Room' : 'Table'}:</strong> {tableInfo?.tableNo || tableInfo?.roomNo}
                  </>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Your Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">WhatsApp Number <span className="text-danger">*</span></label>
                <PhoneInput
                  country={'lk'}
                  value={whatsappNumber}
                  onChange={setWhatsappNumber}
                  inputStyle={{ width: '100%' }}
                  containerClass="phone-input-container"
                  placeholder="Enter WhatsApp Number"
                  enableSearch={true}
                />
                <small className="text-muted">We'll send your bill to this WhatsApp number.</small>
              </div>

              <div className="mb-3">
                <label className="form-label">Order Notes (Optional)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Any special requests?"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="cart-total">
              <div className="d-flex justify-content-between mb-1 text-muted small">
                <span>Subtotal:</span>
                <span>Rs. {calculateSubtotal().toFixed(0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-muted small">
                <span>Service Charge (10%):</span>
                <span>Rs. {calculateServiceCharge().toFixed(0)}</span>
              </div>
              <div className="d-flex justify-content-between fw-bold h5 mb-0">
                <span>Total:</span>
                <span>Rs. {parseFloat(calculateTotal()).toFixed(0)}</span>
              </div>
            </div>

            <button
              className="btn btn-lg w-100 text-white"
              onClick={placeOrder}
              style={{ borderRadius: '8px', background: 'var(--primary-color)', border: 'none', fontWeight: '700', padding: '14px', fontSize: '1.05rem', boxShadow: '0 4px 12px rgba(38, 102, 104, 0.2)' }}
            >
              <i className="fas fa-check me-2"></i> Place Order
            </button>
          </div>
        )}
      </div>

      {/* Cart Overlay */}
      {showCart && <div className="cart-overlay" onClick={() => setShowCart(false)}></div>}
    </div >
  );
};

export default CustomerQROrder;
