import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient, { sanitizeUrl } from '../api/apiClient';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import './PremiumShopifyTheme.css';
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

const FoodItemImageCarousel = ({ item, getImageUrl, className = "menu-thumb" }) => {
  const images = [item.imageUrl1, item.imageUrl2, item.imageUrl3, item.imageUrl4].filter(img => !!img);
  // If no specific image URL fields, check the old generic ones
  if (images.length === 0 && (item.imageUrl || item.image || item.itemImage)) {
    images.push(item.imageUrl || item.image || item.itemImage);
  }
  
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000); // Change image every 4 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="h-100 d-flex align-items-center justify-content-center bg-light opacity-50">
        <i className="fas fa-utensils fa-2x"></i>
      </div>
    );
  }

  return (
    <div className="carousel-wrapper h-100 w-100 position-relative overflow-hidden">
      {images.map((img, index) => (
        <img
          key={index}
          src={getImageUrl(img)}
          alt={`${item.itemName} ${index + 1}`}
          className={`${className} carousel-fade-img ${index === currentIndex ? 'active' : ''}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: index === currentIndex ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
            zIndex: index === currentIndex ? 1 : 0
          }}
        />
      ))}
      {images.length > 1 && (
        <div className="carousel-dots-overlay">
          {images.map((_, index) => (
            <div 
              key={index} 
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
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
  const [modalOrderType, setModalOrderType] = useState('room');
  const [orderLocation, setOrderLocation] = useState('inside');
  const [modalOrderNotes, setModalOrderNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [manualTableNo, setManualTableNo] = useState('');
  const [manualOrderType, setManualOrderType] = useState('ROOM');
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
        item => item.restaurantId === restaurantId && item.isAvailable !== false
      );

      console.log('restaurantFoodItems fetched:', restaurantFoodItems);
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

  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [activeAccordion, setActiveAccordion] = useState('description');
  const [showShopifyMenu, setShowShopifyMenu] = useState(false);
  const [sessionOrders, setSessionOrders] = useState([]);
  const [viewingHistoryOrder, setViewingHistoryOrder] = useState(null);

  // Load session orders from localStorage
  useEffect(() => {
    const key = tableKey || roomKey || 'manual';
    const saved = localStorage.getItem(`session_orders_${key}`);
    if (saved) {
      try {
        setSessionOrders(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse session orders', e);
      }
    }
  }, [tableKey, roomKey]);

  const toggleAccordion = (id) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  const renderFoodCard = (item) => {
    return (
      <div 
        key={item.foodItemId} 
        className="modern-category-card"
        onClick={() => {
          setActiveItemDetail(item);
          setModalQty(1);
        }}
      >
        <h2 className="category-title-red">{item.itemName}</h2>
        <div className="card-media-wrapper">
          <FoodItemImageCarousel item={item} getImageUrl={getImageUrl} className="menu-thumb" />

          <div className="media-overlay flex-column">
            <div className="mb-2 text-white fw-bold" style={{ fontSize: '1.2rem', textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
              Rs. {parseFloat(item.price).toFixed(0)}
            </div>
            <div className="d-flex w-100 mb-1">
              <button 
                className="media-btn w-50" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const displayImage = item.imageUrl1 || item.imageUrl2 || item.imageUrl3 || item.imageUrl4 || item.imageUrl || item.image || item.itemImage;
                  Swal.fire({ 
                    title: item.itemName, 
                    text: item.description || 'No description available', 
                    imageUrl: displayImage ? getImageUrl(displayImage) : null, 
                    imageWidth: 400, 
                    imageHeight: 300 
                  }); 
                }}
              >
                Info
              </button>
              <button 
                className="media-btn w-50" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  addToCart(item); 
                }}
              >
                Add
              </button>
            </div>
            <button 
              className="media-btn w-100 bg-primary-yellow text-dark fw-bold" 
              onClick={(e) => { 
                e.stopPropagation(); 
                setActiveItemDetail(item);
                setModalQty(1);
              }}
            >
              Order Now
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderManualItemCard = (item) => {
    return (
      <div
        key={item.foodItemId}
        className="sketch-category-box"
        onClick={(e) => {
          e.stopPropagation();
          setActiveItemDetail(item);
          setModalQty(1);
        }}
        style={{ position: 'relative' }}
      >
        <div className="sketch-hover-description">
          {item.description || 'No description available'}
        </div>
        <div className="sketch-box-label">
          <span>{item.itemName}</span>
          <div className="small fw-bold" style={{ color: '#266668' }}>Rs. {parseFloat(item.price).toFixed(0)}</div>
        </div>
        <div className="sketch-box-media" style={{ width: '100%', height: '140px', background: '#fafafa', position: 'relative' }}>
          <FoodItemImageCarousel item={item} getImageUrl={getImageUrl} className="" />
        </div>
      </div>
    );
  };

  useEffect(() => {
    let filtered = foodItems;

    if (selectedMenu) {
      filtered = filtered.filter(item => item.menuId === selectedMenu);
    }

    setFilteredItems(filtered);
    console.log('CustomerQROrder: Items loaded/filtered:', filtered.length, filtered);
  }, [selectedMenu, foodItems]);

  const toggleCategoryExpand = (categoryId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const addToCart = (item, openDrawer = true) => {
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
    if (openDrawer) {
      setShowCart(true);
    }
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

  const addToCartFromModal = (openDrawer = false) => {
    if (!activeItemDetail) return;

    const item = activeItemDetail;
    const existingItem = cart.find(cartItem => cartItem.foodItemId === item.foodItemId);

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.foodItemId === item.foodItemId
          ? { ...cartItem, qty: cartItem.qty + modalQty, notes: modalOrderNotes || cartItem.notes }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        foodItemId: item.foodItemId || item.id,
        name: item.itemName,
        price: parseFloat(item.price),
        qty: modalQty,
        notes: modalOrderNotes || ''
      }]);
    }

    setActiveItemDetail(null);
    setModalQty(1);
    setModalOrderNotes('');
    
    if (openDrawer) {
      setShowCart(true);
    }

    Swal.fire({
      title: 'Added to Cart',
      text: `${item.itemName} has been added to your order.`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
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

    // Customer name is optional/not needed as per latest request

    const normalizedWhatsapp = whatsappNumber ? normalizeWhatsAppNumber(whatsappNumber) : '';

    if (!isManual && (!normalizedWhatsapp || normalizedWhatsapp.length < 10 || normalizedWhatsapp.length > 15)) {
      Swal.fire('Validation Error', 'Please enter a valid WhatsApp number', 'warning');
      return;
    }

    try {
      const orderPayload = {
        customerName: customerName.trim() || (isManual ? 'Manual Order' : 'Guest'),
        whatsappNumber: normalizedWhatsapp || null,
        notes: orderNotes.trim() || null,
        items: cart.map(item => ({
          foodItemId: parseInt(item.foodItemId),
          qty: parseInt(item.qty),
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
        customerName: customerName.trim() || (isManual ? 'Manual Order' : 'Guest'),
        whatsappNumber: normalizedWhatsapp
      };

      setOrderSuccess(orderData);
      localStorage.setItem(`active_order_${tableKey || roomKey}`, JSON.stringify(orderData));

      // Save to Session History
      const key = tableKey || roomKey || 'manual';
      const historyKey = `session_orders_${key}`;
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const newHistory = [orderData, ...existingHistory].slice(0, 10); // Keep last 10
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
      setSessionOrders(newHistory);

      if (isManual) {
        // 2. Automatically Generate Invoice (Bill)
        const createdOrder = response.data;
        const invoiceResponse = await apiClient.post(`/billing/orders/${createdOrder.orderId}/create-invoice`);

        // 3. Trigger Printing (Popup)
        const identifier = manualTableNo.trim().replace(/^0+/, '') || manualTableNo.trim();
        printOrder(createdOrder, identifier);

        // 4. Mark as Printed
        await apiClient.patch(`/billing/invoices/${invoiceResponse.data.invoiceId}/mark-printed`);

        Swal.fire({
          title: 'Order Completed',
          text: `Order #${createdOrder.orderNo} placed, bill generated and ready for print.`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: true
        });

        setCart([]);
        setOrderNotes('');
        setShowCart(false);
        setManualTableNo('');
        const target = manualOrderType === 'ROOM' ? '/manual-orders/rooms' : '/manual-orders/tables';
        navigate(target);
      } else {
        setShowStatusScreen(true);
        setCart([]);
        setOrderNotes('');
        setShowCart(false);
      }

    } catch (error) {
      console.error('Order error full:', error);
      let errorMsg = error.response?.data?.message || error.message || 'Failed to place order. Please try again.';
      
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg.join(', ');
      }
      
      Swal.fire({
        title: 'Order Failed',
        text: String(errorMsg),
        icon: 'error',
        confirmButtonColor: '#266668'
      });
    }
  };

  const printOrder = (order, identifier = null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire('Print Blocked', 'Please allow popups to print the bill.', 'warning');
      return;
    }
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
                    <h2 style="margin:0">${tableInfo?.restaurantName || 'Restaurant'}</h2>
                    <p style="margin:5px 0">Order Receipt</p>
                    <p style="margin:2px 0">Order No: ${order.orderNo}</p>
                    <p style="margin:2px 0">${new Date(order.createdAt).toLocaleString()}</p>
                    ${identifier ? `<p style="margin:2px 0">${modalOrderType === 'room' ? 'Room' : 'Table'}: ${identifier}</p>` : ''}
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
                <script>
                  window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  };
                </script>
            </body>
        </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const placeQuickManualOrder = async () => {
    if (orderLocation === 'inside' && !manualTableNo.trim()) {
      Swal.fire('Validation Error', `Please enter a ${modalOrderType === 'room' ? 'Room' : 'Table'} number`, 'warning');
      return;
    }

    try {
      // 0. Prepare Payload
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

      let identifier = '';
      if (orderLocation === 'inside') {
        const normalizedManualNo = manualTableNo.trim().replace(/^0+/, '') || manualTableNo.trim();
        identifier = normalizedManualNo;
        if (modalOrderType === 'room') {
          orderPayload.roomNo = normalizedManualNo;
        } else {
          orderPayload.tableNo = normalizedManualNo;
        }
      }

      // 1. Place Order
      const response = await apiClient.post('/orders/manual', orderPayload);
      const orderData = response.data;

      // 2. Automatically Generate Invoice (Bill)
      const invoiceResponse = await apiClient.post(`/billing/orders/${orderData.orderId}/create-invoice`);

      // 3. Trigger Printing (Popup)
      printOrder(orderData, identifier);

      // 4. Mark as Printed (This technically "assigns" to room in our logic)
      await apiClient.patch(`/billing/invoices/${invoiceResponse.data.invoiceId}/mark-printed`);

      // Success UI
      Swal.fire({
        title: 'Order Completed',
        text: `Order #${orderData.orderNo} placed, bill generated and assigned to ${modalOrderType === 'room' ? 'room' : 'table'}.`,
        icon: 'success',
        timer: 3000,
        showConfirmButton: true
      });

      setOrderSuccess(orderData);
      setCart([]);
      setActiveItemDetail(null);
      setModalOrderNotes('');

      const target = modalOrderType === 'room' ? '/manual-orders/rooms' : '/manual-orders/tables';
      navigate(target);

    } catch (error) {
      console.error('Quick Order error:', error);
      let errorMsg = error.response?.data?.message || 'Failed to place order. Please try again.';
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg.join(', ');
      }
      Swal.fire('Order Failed', String(errorMsg), 'error');
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
                <div className={`timeline-step ${['NEW', 'COOKING', 'READY', 'SERVED'].indexOf(currentOrderStatus || orderSuccess.status) >= 0 ? 'completed' : ''}`}>
                  <i className="fas fa-check-circle"></i>
                  <span>Received</span>
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
      const menuCategories = categories.filter(c => c.menuId === selectedMenu);
      const categoryHasItems = (catId) => menuItems.some(item => item.categoryId === catId);
      const activeCategories = menuCategories.filter(c => categoryHasItems(c.categoryId));
      const flatItems = menuItems.filter(item => !item.categoryId);

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

          {/* If Menu has Categories, Show Grouped */}
          {activeCategories.length > 0 ? (
            <div className="menu-categories-wrapper w-100 px-4">
              {activeCategories.map(cat => {
                const catItems = menuItems.filter(item => item.categoryId === cat.categoryId);
                const isExpanded = expandedCategories.has(cat.categoryId);
                const itemsToShow = isExpanded ? catItems : catItems.slice(0, 4);

                return (
                  <div key={cat.categoryId} className="category-section mb-5">
                    <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                      <h3 className="fw-bold mb-0" style={{ color: '#266668', fontSize: '1.4rem' }}>{cat.categoryName}</h3>
                      {catItems.length > 4 && (
                        <button 
                          className="btn btn-sm btn-link text-decoration-none fw-bold" 
                          onClick={() => toggleCategoryExpand(cat.categoryId)}
                          style={{ color: '#266668' }}
                        >
                          {isExpanded ? 'See Less' : `See More (${catItems.length - 4} more)`}
                        </button>
                      )}
                    </div>
                    <div className="menu-grid-yellow">
                      {itemsToShow.map(item => renderFoodCard(item))}
                    </div>
                  </div>
                );
              })}

              {/* Show items without categories at the end if any */}
              {flatItems.length > 0 && (
                <div className="category-section mb-5">
                  <div className="sketch-header mb-4">
                    <h2 className="sketch-header-text">Other Items</h2>
                  </div>
                  <div className="menu-grid-yellow">
                    {flatItems.map(item => renderFoodCard(item))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* If no categories, show flat grid */
            <div className="menu-grid-yellow">
              {menuItems.map(item => renderFoodCard(item))}
            </div>
          )}
        </div>
      );
    }

    if (isManual) {
      // Manual Order View
      const currentMenuData = selectedMenu ? [menus.find(m => m.menuId === selectedMenu)] : menus;
      
      const groupedData = currentMenuData.map(menu => {
        const menuItems = foodItems.filter(fi => fi.menuId === menu.menuId);
        const menuCats = categories.filter(cat => cat.menuId === menu.menuId);
        const catsWithItems = menuCats.map(cat => ({
          ...cat,
          items: menuItems.filter(fi => fi.categoryId === cat.categoryId)
        })).filter(c => c.items.length > 0);
        
        const flatItems = menuItems.filter(fi => !fi.categoryId);
        
        return { ...menu, categories: catsWithItems, flatItems };
      }).filter(m => m.categories.length > 0 || m.flatItems.length > 0);

      return (
        <div className="manual-dashboard-layout d-flex" style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#fcfcfc' }}>
          <div className="manual-content-main flex-grow-1 p-0">
            <div className="w-100 mb-5 px-4 pt-5 text-center">
              <h1 className="manual-main-title">Create Manual Order</h1>
              <div className="title-divider mx-auto"></div>
            </div>

            <div className="manual-sections-container px-4">
              {groupedData.map(group => (
                <div key={group.menuId} id={`menu-group-${group.menuId}`} className="menu-group-section mb-5 pt-3">
                  <div className="sketch-header mb-4 d-flex justify-content-between align-items-center">
                    <h2 className="sketch-header-text">{group.menuName}</h2>
                  </div>

                  {/* Categories if any */}
                  {group.categories.length > 0 && (
                    <div className="mb-4">
                      {group.categories.map(cat => {
                        const isExpanded = expandedCategories.has(`manual-${cat.categoryId}`);
                        const itemsToShow = isExpanded ? cat.items : cat.items.slice(0, 6);
                        
                        return (
                          <div key={cat.categoryId} className="cat-box-manual mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                              <h5 className="fw-bold mb-0 text-muted small text-uppercase">{cat.categoryName}</h5>
                              {cat.items.length > 6 && (
                                <button 
                                  className="btn btn-sm btn-link text-decoration-none p-0 fw-bold small" 
                                  onClick={() => toggleCategoryExpand(`manual-${cat.categoryId}`)}
                                  style={{ color: '#266668', fontSize: '0.7rem' }}
                                >
                                  {isExpanded ? 'SEE LESS' : 'SEE ALL'}
                                </button>
                              )}
                            </div>
                            <div className="sketch-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
                              {itemsToShow.map(item => renderManualItemCard(item))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Flat items if any */}
                  {group.flatItems.length > 0 && (
                   <div className="cat-box-manual mb-4">
                      <div className="sketch-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
                        {group.flatItems.map(item => renderManualItemCard(item))}
                      </div>
                    </div>
                  )}
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

  // Helper to resolve image URL - robust version
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) {
      // If it's an absolute URL but pointing to localhost/wrong host, let sanitizeUrl fix it
      return apiClient.sanitizeUrl ? apiClient.sanitizeUrl(imagePath) : imagePath;
    }

    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3000/api').replace('/api', '');
    const fullUrl = `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    
    // Final pass through sanitizeUrl to fix any IP/Host issues
    return apiClient.sanitizeUrl ? apiClient.sanitizeUrl(fullUrl) : fullUrl;
  };

  const AnnouncementBar = () => (
    <div className="announcement-bar">
      <div className="announcement-marquee">
        <span>EXPERIENCE AUTHENTIC FLAVORS AT ANAWUMA | 10% OFF ON YOUR FIRST ORDER | FREE DELIVERY FOR ORDERS ABOVE RS. 5000 | WE ARE OPEN FOR SPECIAL EVENTS & BULK ORDERS</span>
        <span>EXPERIENCE AUTHENTIC FLAVORS AT ANAWUMA | 10% OFF ON YOUR FIRST ORDER | FREE DELIVERY FOR ORDERS ABOVE RS. 5000 | WE ARE OPEN FOR SPECIAL EVENTS & BULK ORDERS</span>
      </div>
    </div>
  );

  const ShopifyHeader = () => (
    <header className="shopify-header">
      <div className="hamburger-icon" style={{ fontSize: '20px' }} onClick={() => setShowShopifyMenu(true)}>
        <i className="fas fa-bars"></i>
      </div>
      <div className="brand-logo" style={{ textAlign: 'center' }}>
        {tableInfo?.restaurantName || 'ANAWUMA'}
      </div>
      <div className="cart-trigger" onClick={() => setShowCart(true)} style={{ position: 'relative', fontSize: '20px' }}>
        <i className="fas fa-shopping-bag"></i>
        {cart.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-10px',
            background: 'var(--shopify-orange)',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            {cart.length}
          </span>
        )}
      </div>
    </header>
  );

  const ShopifyFooter = () => (
    <footer className="shopify-footer">
      <div className="newsletter-wrap">
        <h3 className="newsletter-title">EXCLUSIVE OFFERS STRAIGHT TO YOUR INBOX</h3>
        <p className="newsletter-subtitle">Join to get special offers, free giveaways, and once-in-a-lifetime deals.</p>
        <div className="newsletter-form">
          <input type="email" placeholder="your-email@example.com" />
          <i className="fas fa-arrow-right"></i>
        </div>
      </div>

      <div className="footer-links">
        <div className="accordion-item-header" style={{ color: 'white', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          MAIN MENU <i className="fas fa-chevron-right small"></i>
        </div>
        <div className="accordion-item-header" style={{ color: 'white', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          LINKS <i className="fas fa-chevron-right small"></i>
        </div>
        <div className="accordion-item-header" style={{ color: 'white', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          CONTACT US <i className="fas fa-chevron-right small"></i>
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h4 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '1px', marginBottom: '20px' }}>STAY IN TOUCH.</h4>
        <div className="social-links">
          <a href="#"><i className="fab fa-facebook-f"></i></a>
          <a href="#"><i className="fab fa-tiktok"></i></a>
          <a href="#"><i className="fab fa-instagram"></i></a>
          <a href="#"><i className="fab fa-youtube"></i></a>
        </div>
      </div>

      <div className="currency-selector">
        SRI LANKA (LKR ₨) <i className="fas fa-chevron-down ms-2"></i>
      </div>

      <div className="copyright-text">
        © {tableInfo?.restaurantName} {new Date().getFullYear()} <br />
        POWERED BY ANAWUMA
      </div>
    </footer>
  );

  const FloatingQuestionButton = () => (
    <div className="vertical-floating-btn" onClick={() => window.open('https://wa.me/94771234567', '_blank')}>
      <i className="far fa-envelope me-2"></i>
      SEND US YOUR QUESTION
    </div>
  );

  const ShopifyMenuDrawer = () => (
    <>
      <div className={`shopify-menu-drawer ${showShopifyMenu ? 'open' : ''}`}>
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-5">
            <h4 className="fw-bold mb-0">MENU</h4>
            <i className="fas fa-times fs-4" onClick={() => setShowShopifyMenu(false)}></i>
          </div>

          <div className="d-flex flex-column gap-4">
            <div className="menu-link-item" onClick={() => { setShowShopifyMenu(false); setActiveItemDetail(null); setViewingHistoryOrder(null); }}>
              COLLECTIONS
            </div>
            {orderSuccess && (
              <div className="menu-link-item" onClick={() => { setShowShopifyMenu(false); setShowStatusScreen(true); }}>
                TRACK ACTIVE ORDER
              </div>
            )}
            <div className="menu-link-item d-flex justify-content-between align-items-center" onClick={() => { /* Toggle History sub-menu if needed, or just show below */ }}>
              ORDER HISTORY <span className="badge bg-dark rounded-circle">{sessionOrders.length}</span>
            </div>

            <div className="mt-3 ps-3 border-start">
              {sessionOrders.length === 0 ? (
                <p className="text-muted small">No orders placed in this session.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {sessionOrders.map((order, idx) => (
                    <div 
                      key={order.orderId} 
                      className="history-order-item"
                      onClick={async () => {
                        try {
                          const res = await apiClient.get(`/orders/track/${order.orderId}`, {
                            headers: { 'x-table-key': tableKey, 'x-room-key': roomKey }
                          });
                          setViewingHistoryOrder(res.data);
                          setShowShopifyMenu(false);
                        } catch (err) {
                          Swal.fire('Error', 'Could not load order details', 'error');
                        }
                      }}
                    >
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold small">#{order.orderNo}</span>
                        <span className="small text-muted">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="small">Rs. {order.totalAmount} • {order.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 border-top">
          <p className="small text-muted mb-0">Need help? WhatsApp us.</p>
        </div>
      </div>
      {showShopifyMenu && <div className="cart-overlay" style={{ zIndex: 1004 }} onClick={() => setShowShopifyMenu(false)}></div>}
    </>
  );

  const renderShopifyProductPage = () => {
    const item = activeItemDetail;
    const images = [item.imageUrl1, item.imageUrl2, item.imageUrl3, item.imageUrl4].filter(img => !!img);
    if (images.length === 0 && (item.imageUrl || item.image || item.itemImage)) {
      images.push(item.imageUrl || item.image || item.itemImage);
    }

    return (
      <div className="shopify-product-view fade-in">
        <div className="shopify-gallery">
          <div className="main-image-wrap">
             <img src={getImageUrl(images[0])} alt={item.itemName} />
          </div>
          {images.length > 1 && (
            <div className="thumbnail-scroll">
              {images.map((img, idx) => (
                <div key={idx} className="thumb-item">
                  <img src={getImageUrl(img)} alt={item.itemName} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shopify-details-pane">
          <h1 className="product-title-bold" style={{ fontSize: '22px', textAlign: 'left' }}>{item.itemName}</h1>
          <div className="product-rating" style={{ justifyContent: 'flex-start', margin: '12px 0' }}>
            <div className="stars text-dark">
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
            </div>
            <span className="ms-2 small fw-bold">2685 reviews</span>
          </div>

          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
            Rs. {parseFloat(item.price).toFixed(0)}
          </div>

          <div className="mb-4">
             <label className="info-label mb-2">Quantity</label>
             <div className="d-flex align-items-center gap-4" style={{ background: '#f5f5f5', padding: '10px 15px', borderRadius: '4px', width: 'fit-content' }}>
                <button className="border-0 bg-transparent" onClick={() => setModalQty(Math.max(1, modalQty - 1))}><i className="fas fa-minus small"></i></button>
                <span className="fw-bold">{modalQty}</span>
                <button className="border-0 bg-transparent" onClick={() => setModalQty(modalQty + 1)}><i className="fas fa-plus small"></i></button>
             </div>
          </div>

          <button className="shopify-add-to-cart" onClick={() => addToCartFromModal(true)}>
            ADD TO CART
          </button>

          <div className="shopify-accordion mt-5">
            <div className="accordion-item">
              <div className="accordion-item-header" onClick={() => toggleAccordion('description')}>
                DESCRIPTION <i className={`fas ${activeAccordion === 'description' ? 'fa-minus' : 'fa-plus'} small`}></i>
              </div>
              {activeAccordion === 'description' && (
                <div className="accordion-item-content fade-in">
                  {item.description || 'No description available for this item. Experience the finest flavors at our restaurant.'}
                </div>
              )}
            </div>

            <div className="accordion-item">
              <div className="accordion-item-header" onClick={() => toggleAccordion('benefits')}>
                BENEFITS <i className={`fas ${activeAccordion === 'benefits' ? 'fa-minus' : 'fa-plus'} small`}></i>
              </div>
              {activeAccordion === 'benefits' && (
                <div className="accordion-item-content fade-in">
                  <ul className="ps-3 mb-0">
                    <li>Freshly prepared using premium ingredients</li>
                    <li>Authentic local flavors and recipes</li>
                    <li>Quick delivery and hygiene guaranteed</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="accordion-item">
              <div className="accordion-item-header" onClick={() => toggleAccordion('how-to')}>
                HOW TO ORDER <i className={`fas ${activeAccordion === 'how-to' ? 'fa-minus' : 'fa-plus'} small`}></i>
              </div>
              {activeAccordion === 'how-to' && (
                <div className="accordion-item-content fade-in">
                  Simply select your quantity and click "Add to Cart". You can track your order status in real-time from the dashboard.
                </div>
              )}
            </div>
          </div>

          <button 
            className="btn btn-link text-dark fw-bold text-decoration-none mt-4 p-0 small"
            onClick={() => setActiveItemDetail(null)}
          >
            <i className="fas fa-arrow-left me-2"></i> BACK TO COLLECTION
          </button>
        </div>
      </div>
    );
  };

  const renderShopifyCollectionPage = () => {
    if (orderSuccess && showStatusScreen) {
       // Keep existing status screen but within shopify context
       const statusDisplay = getStatusDisplay(currentOrderStatus || orderSuccess.status);
       const isCancelled = (currentOrderStatus || orderSuccess.status) === 'CANCELLED';

       return (
         <div className="p-4 bg-white min-vh-100 fade-in">
           <div className="text-center mb-5">
              <div className={`mb-3 ${isCancelled ? 'text-danger' : 'text-success'}`} style={{ fontSize: '60px' }}>
                <i className={`fas ${isCancelled ? 'fa-times-circle' : 'fa-check-circle'}`}></i>
              </div>
              <h1 className="fw-bold">{isCancelled ? 'Order Cancelled' : 'Order Placed!'}</h1>
              <div className="mt-2 text-muted uppercase small tracking-widest">Order Number: #{orderSuccess.orderNo}</div>
           </div>

           <div className="p-4 border rounded bg-light mb-4">
              <h5 className="fw-bold mb-3">Track Progress</h5>
              <div className={`badge bg-${statusDisplay.color} p-2 px-3 rounded-pill mb-4`}>
                {statusDisplay.text}
              </div>
              
              <div className="d-flex flex-column gap-3">
                 <div className="d-flex align-items-center gap-3">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center ${['NEW', 'COOKING', 'READY', 'SERVED'].indexOf(currentOrderStatus || orderSuccess.status) >= 0 ? 'bg-success text-white' : 'bg-secondary text-white'}`} style={{ width: '30px', height: '30px' }}><i className="fas fa-check small"></i></div>
                    <span className="small fw-bold">Received</span>
                 </div>
                 <div className="d-flex align-items-center gap-3">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center ${['COOKING', 'READY', 'SERVED'].indexOf(currentOrderStatus || orderSuccess.status) >= 0 ? 'bg-success text-white' : 'bg-secondary text-white'}`} style={{ width: '30px', height: '30px' }}><i className="fas fa-check small"></i></div>
                    <span className="small fw-bold">Cooking</span>
                 </div>
                 <div className="d-flex align-items-center gap-3">
                    <div className={`rounded-circle d-flex align-items-center justify-content-center ${['READY', 'SERVED'].indexOf(currentOrderStatus || orderSuccess.status) >= 0 ? 'bg-success text-white' : 'bg-secondary text-white'}`} style={{ width: '30px', height: '30px' }}><i className="fas fa-check small"></i></div>
                    <span className="small fw-bold">Ready</span>
                 </div>
              </div>
           </div>

           <button className="shopify-add-to-cart" onClick={() => setShowStatusScreen(false)}>
              GO BACK TO MENU
           </button>
           <button className="btn btn-outline-dark w-100 p-3 fw-bold mt-2" onClick={startNewOrder}>
              PLACE ANOTHER ORDER
           </button>
         </div>
       );
    }

    const renderShopifyHistoryDetail = () => {
       const order = viewingHistoryOrder;
       const statusDisplay = getStatusDisplay(order.status);
       
       return (
         <div className="p-4 bg-white min-vh-100 fade-in">
           <div className="d-flex align-items-center gap-2 mb-4" onClick={() => setViewingHistoryOrder(null)} style={{ cursor: 'pointer' }}>
             <i className="fas fa-chevron-left"></i>
             <span className="fw-bold small uppercase">BACK TO HISTORY</span>
           </div>

           <div className="mb-5">
              <h1 className="fw-bold mb-1">Order Details</h1>
              <div className="text-muted uppercase small">Order Number: #{order.orderNo}</div>
              <div className="text-muted small">Placed on: {new Date(order.createdAt).toLocaleString()}</div>
           </div>

           <div className="p-4 border rounded bg-light mb-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold mb-0">Status</h5>
                <div className={`badge bg-${statusDisplay.color} p-2 px-3 rounded-pill`}>
                  {statusDisplay.text}
                </div>
              </div>
              
              <div className="order-items-list">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="d-flex justify-content-between py-2 border-bottom border-secondary-subtle">
                    <span className="small">{item.foodItem?.itemName} x {item.qty}</span>
                    <span className="small fw-bold">Rs. {item.price * item.qty}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-2 border-top d-flex justify-content-between">
                <span className="fw-bold uppercase">Total</span>
                <span className="fw-bold">Rs. {order.totalAmount}</span>
              </div>
           </div>

           <button className="shopify-add-to-cart" onClick={() => setViewingHistoryOrder(null)}>
              CLOSE DETAILS
           </button>
         </div>
       );
     };

     return (
       <div className="fade-in">
         {viewingHistoryOrder ? renderShopifyHistoryDetail() : (
           <>
        {/* Collection Selector */}
        <div className="collection-tabs">
          <div className={`collection-tab ${!selectedMenu ? 'active' : ''}`} onClick={() => setSelectedMenu(null)}>
            All Collections
          </div>
          {menus.map(menu => (
            <div 
              key={menu.menuId} 
              className={`collection-tab ${selectedMenu === menu.menuId ? 'active' : ''}`} 
              onClick={() => setSelectedMenu(menu.menuId)}
            >
              {menu.menuName}
            </div>
          ))}
        </div>

        <div className="p-3">
          {!selectedMenu ? (
             <div className="row g-3">
                {menus.map(menu => (
                  <div key={menu.menuId} className="col-6">
                    <div className="shopify-product-card" onClick={() => setSelectedMenu(menu.menuId)}>
                      <div style={{ height: '180px' }}>
                        {menu.imageUrl ? (
                          <img src={getImageUrl(menu.imageUrl)} className="shopify-product-image" alt={menu.menuName} />
                        ) : (
                          <div className="h-100 d-flex align-items-center justify-content-center bg-light"><i className="fas fa-utensils text-muted"></i></div>
                        )}
                      </div>
                      <div className="p-3 text-center">
                        <div className="product-title-bold" style={{ fontSize: '11px' }}>{menu.menuName}</div>
                        <div className="small text-muted">View Collection</div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          ) : (
            <div className="row g-3">
               {filteredItems.map(item => (
                 <div key={item.foodItemId} className="col-6">
                   <div className="shopify-product-card" onClick={() => setActiveItemDetail(item)}>
                      <div style={{ height: '180px' }}>
                        <img src={getImageUrl(item.imageUrl1 || item.imageUrl || item.image)} className="shopify-product-image" alt={item.itemName} />
                      </div>
                      <div className="shopify-product-info">
                        <div className="product-title-bold" style={{ fontSize: '11px' }}>{item.itemName}</div>
                        <div className="product-rating" style={{ fontSize: '10px' }}>
                           <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i>
                        </div>
                        <div className="product-price-clean small">Rs. {parseFloat(item.price).toFixed(0)}</div>
                      </div>
                   </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </>)}
    </div>
  );
};

  if (loading) {
    return (
      <div className="shopify-page d-flex align-items-center justify-content-center">
        <div className="spinner-border text-dark" role="status"></div>
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className="shopify-page d-flex align-items-center justify-content-center p-4 text-center">
        <div>
          <i className="fas fa-exclamation-triangle fa-3x mb-3 text-muted"></i>
          <h2 className="fw-bold">Invalid QR Code</h2>
          <p className="text-muted">Please scan a valid QR code from your table or room.</p>
        </div>
      </div>
    );
  }

  // --- MAIN RENDER LOGIC ---
  if (!isManual) {
    return (
      <div className="shopify-page">
        <AnnouncementBar />
        <ShopifyHeader />
        <ShopifyMenuDrawer />
        <FloatingQuestionButton />
        
        <main className="shopify-main">
          {activeItemDetail ? renderShopifyProductPage() : renderShopifyCollectionPage()}
        </main>
        
        <ShopifyFooter />

        {/* Existing Cart Components for compatibility */}
        <div className={`cart-drawer ${showCart ? 'open' : ''}`}>
          <div className="cart-header d-flex align-items-center justify-content-between p-3 border-bottom">
            <div className="d-flex align-items-center gap-2" onClick={() => setShowCart(false)} style={{ cursor: 'pointer' }}>
              <i className="fas fa-chevron-left"></i>
              <span className="fw-bold small uppercase">BACK</span>
            </div>
            <h4 className="fw-bold mb-0" style={{ fontSize: '18px', letterSpacing: '1px' }}>YOUR CART</h4>
            <div style={{ width: '40px' }}></div> {/* Spacer for symmetry */}
          </div>
          <div className="cart-body">
            {cart.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-shopping-bag fa-3x mb-3 text-muted opacity-25"></i>
                <p className="text-muted">Your cart is currently empty.</p>
                <button className="btn btn-dark mt-3 rounded-0 px-4" onClick={() => setShowCart(false)}>CONTINUE SHOPPING</button>
              </div>
            ) : (
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.foodItemId} className="d-flex gap-3 mb-4 border-bottom pb-3">
                    <div className="flex-grow-1">
                      <div className="fw-bold uppercase small mb-1">{item.name}</div>
                      <div className="small text-muted mb-2">Rs. {item.price.toFixed(0)}</div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center gap-3 border p-1 px-2">
                          <button className="border-0 bg-transparent" onClick={() => updateCartItemQty(item.foodItemId, -1)}>-</button>
                          <span className="small fw-bold">{item.qty}</span>
                          <button className="border-0 bg-transparent" onClick={() => updateCartItemQty(item.foodItemId, 1)}>+</button>
                        </div>
                        <button className="btn btn-sm text-muted p-0" onClick={() => removeFromCart(item.foodItemId)}>Remove</button>
                      </div>
                    </div>
                    <div className="fw-bold small">Rs. {(item.price * item.qty).toFixed(0)}</div>
                  </div>
                ))}

                <div className="mt-4">
                  <div className="mb-3">
                    <label className="small fw-bold text-muted uppercase mb-2">WhatsApp Number *</label>
                    <PhoneInput
                      country={'lk'}
                      value={whatsappNumber}
                      onChange={setWhatsappNumber}
                      inputStyle={{ width: '100%', borderRadius: '0' }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="small fw-bold text-muted uppercase mb-2">Order Notes</label>
                    <textarea 
                      className="form-control rounded-0" 
                      rows="2" 
                      placeholder="Special instructions..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <div className="cart-footer p-4 border-top">
              <div className="d-flex justify-content-between mb-2">
                <span className="small text-muted uppercase">Subtotal</span>
                <span className="fw-bold">Rs. {calculateSubtotal().toFixed(0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="small text-muted uppercase">Service Charge</span>
                <span className="fw-bold">Rs. {calculateServiceCharge().toFixed(0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-4 pt-2 border-top">
                <span className="fw-bold uppercase">Total</span>
                <span className="h4 mb-0 fw-bold">Rs. {parseFloat(calculateTotal()).toFixed(0)}</span>
              </div>
              <button className="shopify-add-to-cart m-0" onClick={placeOrder}>
                COMPLETE ORDER
              </button>
              <button 
                className="btn btn-link w-100 mt-2 text-dark fw-bold text-decoration-none small uppercase" 
                onClick={() => setShowCart(false)}
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
        {showCart && <div className="cart-overlay" onClick={() => setShowCart(false)}></div>}
      </div>
    );
  }

  // Final Render: Revert Manual view to original robust dashboard layout
  if (isManual) {
    return (
      <div className="customer-qr-order-container p-0 bg-white">
        {activeItemDetail && (
          <div className="sketch-modal-overlay" onClick={() => setActiveItemDetail(null)}>
            <div className="sketch-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="sketch-modal-header py-3">
                <span className="fw-bold fs-5 text-uppercase">{activeItemDetail.category?.categoryName || 'Product Info'}</span>
              </div>
              <div className="sketch-modal-body d-flex flex-wrap p-0">
                 {/* Left Column: Product Info */}
                 <div className="sketch-modal-left-col p-4 border-end">
                    <div className="sketch-modal-image-area mb-4" style={{ height: '300px', position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
                      <FoodItemImageCarousel item={activeItemDetail} getImageUrl={getImageUrl} className="" />
                    </div>
                    <div className="sketch-modal-info-rows">
                      <div className="sketch-detail-row"><span className="label">Name :</span><span className="value fw-bold">{activeItemDetail.itemName}</span></div>
                      <div className="sketch-detail-row"><span className="label">Price :</span><span className="value">Rs. {parseFloat(activeItemDetail.price).toFixed(0)}</span></div>
                      <div className="sketch-detail-row quantity-row my-3 py-2 border-top border-bottom">
                        <span className="label">Quantity :</span>
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={() => setModalQty(Math.max(1, modalQty - 1))}>-</button>
                          <span className="qty-value">{modalQty}</span>
                          <button className="qty-btn" onClick={() => setModalQty(modalQty + 1)}>+</button>
                        </div>
                      </div>
                    </div>
                 </div>
                 {/* Right Column: Order Fields */}
                 <div className="sketch-modal-right-col flex-grow-1 p-4 bg-light">
                    <div className="mb-4">
                      <label className="d-block mb-2 fw-bold text-muted small">ORDER LOCATION *</label>
                      <div className="d-flex gap-2">
                        <button className={`flex-grow-1 btn ${orderLocation === 'inside' ? 'btn-primary' : 'btn-outline-primary'}`} style={orderLocation === 'inside' ? { backgroundColor: '#266668', color: 'white' } : { color: '#266668', borderColor: '#266668' }} onClick={() => { setOrderLocation('inside'); setModalOrderType('room'); setManualOrderType('ROOM'); setManualTableNo(''); }}>IN SIDE</button>
                        <button className={`flex-grow-1 btn ${orderLocation === 'outside' ? 'btn-primary' : 'btn-outline-primary'}`} style={orderLocation === 'outside' ? { backgroundColor: '#266668', color: 'white' } : { color: '#266668', borderColor: '#266668' }} onClick={() => { setOrderLocation('outside'); setModalOrderType('table'); setManualOrderType('TABLE'); setManualTableNo(''); }}>OUTSIDE</button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="d-block mb-2 fw-bold text-muted small">SELECT {orderLocation === 'inside' ? 'ROOM' : 'TABLE'} *</label>
                      <select className="form-control sketch-input" value={manualTableNo} onChange={(e) => setManualTableNo(e.target.value)}>
                        <option value="">Select No</option>
                        {orderLocation === 'inside' ? (
                          [...Array.from({ length: 16 }, (_, i) => `SV - ${201 + i}`), ...Array.from({ length: 8 }, (_, i) => `HB - ${String(i + 1).padStart(2, '0')}`)].map(no => <option key={no} value={no}>{no}</option>)
                        ) : (
                          Array.from({ length: 25 }, (_, i) => (i + 1).toString()).map(no => <option key={no} value={no}>Table {no}</option>)
                        )}
                      </select>
                    </div>
                    <div className="mb-0">
                      <label className="d-block mb-2 fw-bold text-muted small">ORDER NOTES (OPTIONAL)</label>
                      <textarea className="form-control sketch-input" placeholder="Any special requests..." rows="4" value={modalOrderNotes} onChange={(e) => setModalOrderNotes(e.target.value)}></textarea>
                    </div>
                 </div>
              </div>
              <div className="sticky-bottom-btn p-3 bg-white border-top d-flex gap-2">
                 <button className="btn btn-outline-primary flex-grow-1" onClick={() => addToCartFromModal(false)} style={{ padding: '14px', fontWeight: '700', borderColor: '#266668', color: '#266668' }}>ADD TO CART</button>
                 <button className="order-now-btn flex-grow-1" onClick={() => addToCartFromModal(true)}>ORDER NOW</button>
              </div>
            </div>
          </div>
        )}

        <div className="wrapper">
          <Navbar cartCount={cart.length} onCartClick={() => setShowCart(true)} />
          <Sidebar />
          <div className="content-wrapper" style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#fcfcfc', padding: '0' }}>
             {renderMainContent()}
          </div>
        </div>

        {/* Manual Cart Drawer */}
        <div className={`cart-drawer ${showCart ? 'open' : ''}`}>
          <div className="cart-header"><h4><i className="fas fa-shopping-cart me-2"></i> Your Order</h4><button className="btn-close" onClick={() => setShowCart(false)}></button></div>
          <div className="cart-body">
            {cart.length === 0 ? (
              <div className="text-center py-5 opacity-50"><i className="fas fa-shopping-basket fa-3x mb-3"></i><p>Your cart is empty</p></div>
            ) : (
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.foodItemId} className="p-3 border-bottom mb-2 bg-light rounded">
                    <div className="fw-bold">{item.name}</div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span>Rs. {item.price.toFixed(0)} x {item.qty}</span>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => updateCartItemQty(item.foodItemId, -1)}>-</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => updateCartItemQty(item.foodItemId, 1)}>+</button>
                        <button className="btn btn-sm btn-link text-danger" onClick={() => removeFromCart(item.foodItemId)}><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <div className="cart-footer p-3 border-top bg-light">
               <div className="d-flex justify-content-between fw-bold h5 mb-3"><span>Total:</span><span style={{ color: '#266668' }}>Rs. {calculateTotal()}</span></div>
               <button className="btn btn-primary w-100 p-3 fw-bold" style={{ backgroundColor: '#266668', border: 'none' }} onClick={placeOrder}>PLACE MANUAL ORDER</button>
            </div>
          )}
        </div>
        {showCart && <div className="cart-overlay" onClick={() => setShowCart(false)}></div>}
      </div>
    );
  }

  // Fallback (should not be reached)
  return null;
};

export default CustomerQROrder;
