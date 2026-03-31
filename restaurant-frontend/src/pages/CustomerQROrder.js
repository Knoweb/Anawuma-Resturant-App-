import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
  const [tableInfo, setTableInfo] = useState(null);
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
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
      // Filter by menu: categories belonging to this menu
      const menuCategoryIds = categories
        .filter(cat => cat.menuId === selectedMenu)
        .map(cat => cat.categoryId);

      filtered = filtered.filter(item => menuCategoryIds.includes(item.categoryId));

      if (selectedCategory) {
        filtered = filtered.filter(item => item.categoryId === selectedCategory);
      }
    }

    setFilteredItems(filtered);
  }, [selectedMenu, selectedCategory, foodItems, categories]);

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
        if (manualOrderType === 'ROOM') {
          orderPayload.roomNo = manualTableNo;
        } else {
          orderPayload.tableNo = manualTableNo;
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
      
      setShowStatusScreen(true);
      setCart([]);
      setOrderNotes('');
      setShowCart(false);

    } catch (error) {
      console.error('Order error:', error);
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
    setSelectedCategory(null);
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

    if (!selectedMenu) {
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
                            setSelectedCategory(cat.categoryId);
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

    if (selectedMenu && !selectedCategory) {
      const menuCategories = categories.filter(cat => cat.menuId === selectedMenu);
      
      const scrollToCategory = (id) => {
        const element = document.getElementById(`cat-card-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      };

      return (
        <div className="slider-container-yellow fade-in">
          <div className="w-100 d-flex justify-content-start mb-2 px-4" style={{ maxWidth: '1200px' }}>
            <button className="back-to-menus" onClick={() => setSelectedMenu(null)}>
              <i className="fas fa-chevron-left"></i>
            </button>
          </div>

          <div className="category-quick-nav">
            {menuCategories.map(category => (
              <button 
                key={`nav-${category.categoryId}`} 
                className="quick-nav-btn"
                onClick={() => scrollToCategory(category.categoryId)}
              >
                {category.categoryName}
              </button>
            ))}
          </div>

          <div className="menu-grid-yellow">
            {menuCategories.map(category => (
              <div key={category.categoryId} id={`cat-card-${category.categoryId}`} className="modern-category-card">
                <h2 className="category-title-red">{category.categoryName}</h2>
                <div className="card-media-wrapper" onClick={() => setSelectedCategory(category.categoryId)}>
                  {category.imageUrl ? (
                    <img src={getImageUrl(category.imageUrl)} alt={category.categoryName} />
                  ) : (
                    <div className="h-100 d-flex align-items-center justify-content-center bg-light">
                      <i className="fas fa-utensils fa-4x opacity-25"></i>
                    </div>
                  )}
                  <div className="media-overlay flex-column">
                    <div className="d-flex w-100 mb-1">
                      <button className="media-btn w-50" onClick={(e) => { e.stopPropagation(); Swal.fire('Coming Soon', 'Photo gallery is being prepared!', 'info'); }}>Photo</button>
                      <button className="media-btn w-50" onClick={(e) => { e.stopPropagation(); Swal.fire('Coming Soon', 'Video gallery is being prepared!', 'info'); }}>Video</button>
                    </div>
                    <button className="media-btn w-100" onClick={(e) => { e.stopPropagation(); setSelectedCategory(category.categoryId); }}>Select</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="items-view-container">
        {/* Category Navigation - Horizontal Scroll */}
        <div className="category-nav-container slide-in-top">
          <button
            className={`back-to-menus`}
            onClick={() => {
              setSelectedCategory(null);
            }}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="horizontal-categories">
            <button
              className={`category-pill ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </button>
            {categories
              .filter(cat => cat.menuId === selectedMenu)
              .map(category => (
                <button
                  key={category.categoryId}
                  className={`category-pill ${selectedCategory === category.categoryId ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.categoryId)}
                >
                  {category.categoryName}
                </button>
              ))}
          </div>
        </div>

        {/* Food Items Grid */}
        <div className="food-items-section-modern fade-in">
          <div className="items-header">
            <h3>{categories.find(c => c.categoryId === selectedCategory)?.categoryName || 'All Items'}</h3>
            <span className="items-count">{filteredItems.length} items available</span>
          </div>

          <div className="food-grid-modern">
            {filteredItems.map(item => {
              // Try multiple image fields from backend (imageUrl1 is primary)
              const displayImage = item.imageUrl1 || item.imageUrl || item.imageUrl2;
              
              return (
                <div key={item.foodItemId} className="modern-food-card">
                  <div className="card-image-wrapper">
                    {displayImage ? (
                      <img src={getImageUrl(displayImage)} alt={item.itemName} />
                    ) : (
                      <div className="h-100 d-flex align-items-center justify-content-center text-muted card-image-placeholder">
                        <i className="fas fa-utensils fa-3x opacity-25"></i>
                      </div>
                    )}
                    <div className="price-tag">Rs. {parseFloat(item.price).toFixed(0)}</div>
                  </div>
                  <div className="card-content">
                    <h4>{item.itemName}</h4>
                    <p>{item.description}</p>
                    <button
                      className="add-to-cart-modern"
                      onClick={() => addToCart(item)}
                    >
                      <i className="fas fa-plus"></i> Add to Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
      <main className="customer-main-content">
        {renderMainContent()}
      </main>

      {/* FIXED POSITIONED DRAWER OVERLAY */}
      {/* Dark Overlay Background Mask */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] transition-opacity duration-300 pointer-events-none ${showCart ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
        onClick={() => setShowCart(false)}
      />

      {/* Sliding Drawer Panel */}
      <div 
        className={`fixed top-0 right-0 h-screen w-full sm:w-[420px] bg-white shadow-[-]30px_0_60px_rgba(0,0,0,0.15)] z-[2001] flex flex-col transition-transform duration-500 ease-in-out transform ${showCart ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header - Non-shrinking top section */}
        <div className="p-6 border-b flex items-center justify-between shrink-0 bg-white">
          <h4 className="flex items-center text-xl font-black text-gray-900 tracking-tight">
             <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mr-3">
               <i className="fas fa-shopping-bag"></i>
             </div>
            Checkout Order
          </h4>
          <button 
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-900" 
            onClick={() => setShowCart(false)}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Body - Main scrollable content including items and form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-80">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-shopping-basket text-4xl"></i>
              </div>
              <p className="text-lg font-black uppercase tracking-widest">Cart is empty</p>
              <button 
                className="mt-6 text-sm font-bold text-emerald-600 hover:underline"
                onClick={() => setShowCart(false)}
              >
                Browse Our Menu
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Order Items Section */}
              <div className="space-y-4">
                <h6 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-4 flex items-center gap-2">
                  <span className="w-8 h-[2px] bg-emerald-600"></span>
                  Selected Items
                  <span className="bg-emerald-100 px-2 py-0.5 rounded-full text-[9px]">{cart.length}</span>
                </h6>
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.foodItemId} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h5 className="font-black text-gray-900 mb-1 leading-tight group-hover:text-emerald-700 transition-colors">{item.name}</h5>
                          <span className="text-emerald-600 font-black text-sm tracking-tighter">Rs. {parseFloat(item.price).toFixed(0)}</span>
                        </div>
                        <button
                          className="text-gray-300 p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                          onClick={() => removeFromCart(item.foodItemId)}
                        >
                          <i className="fas fa-trash-alt text-sm"></i>
                        </button>
                      </div>

                      <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
                        <div className="flex-1">
                          <input
                            type="text"
                            className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-[11px] font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-gray-300"
                            placeholder="Add special instructions..."
                            value={item.notes}
                            onChange={(e) => updateCartItemNotes(item.foodItemId, e.target.value)}
                          />
                        </div>
                        <div className="flex items-center bg-gray-100/80 p-0.5 rounded-full gap-2 shrink-0">
                          <button 
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-sm text-[10px] hover:bg-gray-100 active:scale-95 transition-all text-gray-600"
                            onClick={() => updateCartItemQty(item.foodItemId, -1)}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="w-5 text-center font-black text-gray-800 text-sm">{item.qty}</span>
                          <button 
                            className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-sm text-[10px] hover:bg-gray-100 active:scale-95 transition-all text-gray-600"
                            onClick={() => updateCartItemQty(item.foodItemId, 1)}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Details Form Section */}
              <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-700">
                <h6 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-4 flex items-center gap-2">
                  <span className="w-8 h-[2px] bg-emerald-600"></span>
                  Checkout Info
                </h6>
                
                <div className="p-5 bg-gradient-to-br from-gray-50 to-emerald-50/30 rounded-3xl border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                    <i className="fas fa-utensils text-8xl text-emerald-900"></i>
                  </div>
                  
                  {isManual ? (
                    <div className="space-y-5 relative z-10">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                         <i className="fas fa-location-dot"></i> Order Location
                      </label>
                      <div className="flex gap-2 p-1 bg-gray-200/40 rounded-2xl">
                        <button 
                          className={`flex-1 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest ${manualOrderType === 'TABLE' ? 'bg-white text-emerald-700 shadow-xl shadow-emerald-900/5' : 'text-gray-400 hover:text-gray-600'}`}
                          onClick={() => setManualOrderType('TABLE')}
                        >
                          Table
                        </button>
                        <button 
                          className={`flex-1 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest ${manualOrderType === 'ROOM' ? 'bg-white text-emerald-700 shadow-xl shadow-emerald-900/5' : 'text-gray-400 hover:text-gray-600'}`}
                          onClick={() => setManualOrderType('ROOM')}
                        >
                          Room
                        </button>
                      </div>
                      <input
                        type="text"
                        className="w-full px-5 py-4 bg-white border-2 border-emerald-100 rounded-2xl focus:border-emerald-500 focus:ring-0 outline-none transition-all font-black text-xl text-emerald-900 placeholder:text-gray-200 text-center"
                        placeholder={`NO.`}
                        value={manualTableNo}
                        onChange={(e) => setManualTableNo(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-5 relative z-10">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 border-2 border-emerald-100 shadow-lg shadow-emerald-900/5">
                        <i className={`fas ${tableInfo?.isRoom ? 'fa-hotel' : 'fa-utensils'} text-2xl`}></i>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">{tableInfo?.isRoom ? 'Room' : 'Table'}</p>
                        <p className="font-black text-3xl text-emerald-900 tracking-tighter leading-none">{tableInfo?.tableNo || tableInfo?.roomNo}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block ml-2 group-focus-within:text-emerald-500 transition-colors">Customer Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                      <input
                        type="text"
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-transparent border-gray-50 rounded-2xl focus:bg-white focus:border-emerald-500/20 focus:ring-0 outline-none transition-all font-bold text-gray-800"
                        placeholder="John Doe"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block ml-2 group-focus-within:text-emerald-500 transition-colors">WhatsApp Number <span className="text-red-400">*</span></label>
                    <div className="phone-input-premium">
                      <PhoneInput
                        country={'lk'}
                        value={whatsappNumber}
                        onChange={setWhatsappNumber}
                        inputClass="!w-full !h-14 !rounded-2xl !bg-gray-50 !border-none !font-bold !text-gray-800 focus:!bg-white focus:!ring-2 focus:!ring-emerald-500/10 outline-none transition-all"
                        containerClass="!w-full !border-none"
                        buttonClass="!bg-transparent !border-none !rounded-2xl"
                        placeholder="Mobile Number"
                        enableSearch={true}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 px-2 flex items-center gap-2 font-medium italic opacity-70">
                      <i className="fas fa-check-circle text-emerald-500"></i> Digital bill will be sent to this number.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block ml-2">Kitchen Note</label>
                    <textarea
                      className="w-full px-5 py-5 bg-gray-50 border-none rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all resize-none shadow-sm min-h-[100px] text-sm font-medium"
                      placeholder="Add any allergies or preferences..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Solid fixed bottom section with high impact */}
        {cart.length > 0 && (
          <div className="p-8 border-t bg-white border-gray-100 shrink-0 shadow-[0_-30px_60px_rgba(0,0,0,0.03)] rounded-t-[3rem] animate-in slide-in-from-bottom duration-500">
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-400 text-[10px] font-black uppercase tracking-widest px-2">
                <span>Subtotal</span>
                <span className="text-gray-900">Rs. {calculateSubtotal().toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-[10px] font-black uppercase tracking-widest px-2">
                <span>Service Fee (10%)</span>
                <span className="text-gray-900">Rs. {calculateServiceCharge().toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center pt-5 border-t-2 border-dashed border-gray-100 px-2 mt-4">
                <span className="text-sm font-black text-gray-900 uppercase tracking-tighter">Total Payable</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-emerald-600 tracking-tighter block leading-none">Rs. {parseFloat(calculateTotal()).toFixed(0)}</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Inclusive of VAT</span>
                </div>
              </div>
            </div>

            <button
              className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-emerald-600/30 active:scale-[0.96] transition-all flex items-center justify-center gap-4 relative overflow-hidden group"
              onClick={placeOrder}
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <i className="fas fa-bolt text-xs text-emerald-200"></i> 
              PLACE YOUR ORDER
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerQROrder;
