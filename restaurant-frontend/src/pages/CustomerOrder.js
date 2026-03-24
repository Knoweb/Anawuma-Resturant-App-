import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import './CustomerOrder.css';

const CustomerOrder = () => {
  const { apiKey } = useParams();
  const [categories, setCategories] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [tableNo, setTableNo] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesRes, foodItemsRes] = await Promise.all([
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/food-items`),
      ]);

      setCategories(categoriesRes.data || []);
      setFoodItems(foodItemsRes.data || []);
      setFilteredItems(foodItemsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire('Error', 'Failed to load menu. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (!apiKey) {
      Swal.fire('Error', 'Invalid QR code. API key is missing.', 'error');
      return;
    }
    fetchData();
  }, [apiKey, fetchData]);

  useEffect(() => {
    if (selectedCategory) {
      const filtered = foodItems.filter(
        item => item.categoryId === selectedCategory
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(foodItems);
    }
  }, [selectedCategory, foodItems]);

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.foodItemId === item.foodItemsId);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.foodItemId === item.foodItemsId
          ? { ...cartItem, qty: cartItem.qty + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        foodItemId: item.foodItemsId,
        name: item.foodItemsName,
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

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2);
  };

  const placeOrder = async () => {
    // Validation
    if (!tableNo.trim()) {
      Swal.fire('Validation Error', 'Please enter your table number', 'warning');
      return;
    }

    if (cart.length === 0) {
      Swal.fire('Validation Error', 'Please add at least one item to your order', 'warning');
      return;
    }

    try {
      const orderPayload = {
        tableNo: tableNo.trim(),
        notes: orderNotes.trim() || null,
        items: cart.map(item => ({
          foodItemId: item.foodItemId,
          qty: item.qty,
          notes: item.notes || null
        }))
      };

      const response = await axios.post(
        `${API_URL}/orders`,
        orderPayload,
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      // Success
      setOrderSuccess(response.data);
      setCart([]);
      setTableNo('');
      setOrderNotes('');
      setShowCart(false);

    } catch (error) {
      console.error('Order error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to place order. Please try again.';
      Swal.fire('Order Failed', errorMsg, 'error');
    }
  };

  const startNewOrder = () => {
    setOrderSuccess(null);
  };

  // Success Screen
  if (orderSuccess) {
    return (
      <div className="customer-order-container">
        <div className="order-success-screen">
          <div className="success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h1>Order Placed Successfully!</h1>
          <div className="order-details-card">
            <h3>Order Number</h3>
            <div className="order-number">{orderSuccess.orderNo}</div>
            <div className="order-info">
              <p><strong>Table:</strong> {orderSuccess.tableNo}</p>
              <p><strong>Status:</strong> <span className="badge bg-primary">{orderSuccess.status}</span></p>
              <p><strong>Total:</strong> ${orderSuccess.totalAmount}</p>
            </div>
          </div>
          <p className="success-message">
            Your order has been sent to the kitchen. We'll bring it to your table shortly!
          </p>
          <button className="btn btn-primary btn-lg" onClick={startNewOrder}>
            <i className="fas fa-plus me-2"></i> Place Another Order
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="customer-order-container">
        <div className="loading-screen">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-order-container">
      {/* Header */}
      <div className="customer-header">
        <h1><i className="fas fa-utensils me-2"></i> Menu</h1>
        <button 
          className="btn btn-primary cart-toggle-btn"
          onClick={() => setShowCart(!showCart)}
        >
          <i className="fas fa-shopping-cart me-2"></i>
          Cart ({cart.length})
        </button>
      </div>

      <div className="customer-content">
        {/* Categories Sidebar */}
        <div className="categories-sidebar">
          <h5>Categories</h5>
          <div className="category-list">
            <button
              className={`category-item ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              <i className="fas fa-th me-2"></i> All Items
            </button>
            {categories.map(category => (
              <button
                key={category.categoryId}
                className={`category-item ${selectedCategory === category.categoryId ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.categoryId)}
              >
                {category.categoryName}
              </button>
            ))}
          </div>
        </div>

        {/* Food Items Grid */}
        <div className="food-items-section">
          {filteredItems.length === 0 ? (
            <div className="no-items">
              <i className="fas fa-inbox fa-3x mb-3"></i>
              <p>No items available in this category</p>
            </div>
          ) : (
            <div className="food-items-grid">
              {filteredItems.map(item => (
                <div key={item.foodItemsId} className="food-item-card">
                  {item.imageUrl1 && (
                    <div className="food-item-image">
                      <img src={item.imageUrl1} alt={item.foodItemsName} />
                    </div>
                  )}
                  <div className="food-item-body">
                    <h5 className="food-item-name">{item.foodItemsName}</h5>
                    {item.description && (
                      <p className="food-item-description">{item.description}</p>
                    )}
                    <div className="food-item-footer">
                      <span className="food-item-price">${parseFloat(item.price).toFixed(2)}</span>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => addToCart(item)}
                      >
                        <i className="fas fa-plus me-1"></i> Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer */}
      <div className={`cart-drawer ${showCart ? 'open' : ''}`}>
        <div className="cart-header">
          <h4><i className="fas fa-shopping-cart me-2"></i> Your Order</h4>
          <button className="btn-close" onClick={() => setShowCart(false)}></button>
        </div>

        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <i className="fas fa-shopping-basket fa-3x mb-3"></i>
              <p>Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.foodItemId} className="cart-item">
                    <div className="cart-item-info">
                      <h6>{item.name}</h6>
                      <p className="cart-item-price">${item.price.toFixed(2)} each</p>
                      <input
                        type="text"
                        className="form-control form-control-sm mt-2"
                        placeholder="Special instructions..."
                        value={item.notes}
                        onChange={(e) => updateCartItemNotes(item.foodItemId, e.target.value)}
                      />
                    </div>
                    <div className="cart-item-controls">
                      <div className="qty-controls">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => updateCartItemQty(item.foodItemId, -1)}
                        >
                          <i className="fas fa-minus"></i>
                        </button>
                        <span className="qty-display">{item.qty}</span>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => updateCartItemQty(item.foodItemId, 1)}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger mt-2"
                        onClick={() => removeFromCart(item.foodItemId)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-footer">
                <div className="order-inputs">
                  <div className="mb-3">
                    <label className="form-label">Table Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., T-5"
                      value={tableNo}
                      onChange={(e) => setTableNo(e.target.value)}
                      required
                    />
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
                  <h5>Total: <span>${calculateTotal()}</span></h5>
                </div>

                <button
                  className="btn btn-success btn-lg w-100"
                  onClick={placeOrder}
                >
                  <i className="fas fa-check me-2"></i> Place Order
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cart Overlay */}
      {showCart && <div className="cart-overlay" onClick={() => setShowCart(false)}></div>}
    </div>
  );
};

export default CustomerOrder;
