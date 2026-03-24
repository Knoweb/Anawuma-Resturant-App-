import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { useAuthStore } from '../store/authStore';
import apiClient, { pricingAPI } from '../api/apiClient';
import Swal from 'sweetalert2';
import './CheckoutPage.css';

const PACKAGE_MAP = {
  'basic': { id: 1, name: 'Basic Package', price: 25.00 },
  'standard': { id: 2, name: 'Standard Package', price: 50.00 },
  'gold': { id: 3, name: 'Premium Package', price: 75.00 },
  // Fallbacks if keys differ
  'premium': { id: 3, name: 'Premium Package', price: 75.00 }
};

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedKey, setSelectedKey] = useState(searchParams.get('package') || 'basic');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const currentPackage = PACKAGE_MAP[selectedKey] || PACKAGE_MAP['basic'];
  const total = currentPackage.price - discount;

  useEffect(() => {
    if (!user) {
      // If not logged in, they should login first
      // But the user flow said clicking "Choose Package" goes to checkout if already logged in?
      // Or if not logged in it went to Login.
    }
  }, [user]);

  const handlePackageChange = (e) => {
    setSelectedKey(e.target.value);
  };

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'WELCOME10') {
      setDiscount(10);
      Swal.fire('Success!', 'Promo code applied: $10.00 off', 'success');
    } else {
      Swal.fire('Invalid!', 'Promo code not recognized.', 'error');
    }
  };

  const handleCompletePurchase = async () => {
    if (!user) {
      Swal.fire('Please Login', 'You must be logged in to complete a purchase.', 'warning');
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiClient.post('/restaurant/upgrade', {
        restaurantId: user.restaurantId,
        packageId: currentPackage.id,
        promoCode: promoCode
      });

      if (response.data.success) {
        await Swal.fire({
          title: 'Success!',
          text: 'Payment successful! Your package has been upgraded.',
          icon: 'success',
          confirmButtonText: 'Go to Profile'
        });
        navigate('/my-hotel');
      } else {
        throw new Error(response.data.message || 'Upgrade failed');
      }
    } catch (error) {
      Swal.fire('Error!', error.response?.data?.message || 'Transaction failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-page">
      <Navbar />
      
      <main className="checkout-main">
        <div className="checkout-container">
          <div className="checkout-badge-wrap">
            <span className="checkout-badge">Choose Your Plan</span>
          </div>
          <h1 className="checkout-header">Checkout and Get Started!</h1>
          
          <div className="checkout-grid">
            {/* Left Column: Form */}
            <div className="checkout-form-col">
              <div className="checkout-field">
                <label className="checkout-label">Package</label>
                <select 
                  className="checkout-select" 
                  value={selectedKey} 
                  onChange={handlePackageChange}
                >
                  {Object.entries(PACKAGE_MAP).filter(([k]) => k !== 'premium').map(([key, pkg]) => (
                    <option key={key} value={key}>{pkg.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="checkout-field">
                <label className="checkout-label">Enter Promo Code</label>
                <div className="promo-input-wrap">
                  <input 
                    type="text" 
                    className="checkout-input" 
                    placeholder="Enter code" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <button className="promo-btn" onClick={handleApplyPromo}>Apply Promo</button>
                </div>
              </div>
              
              <div className="checkout-actions">
                <button 
                  className="purchase-btn" 
                  onClick={handleCompletePurchase}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Complete Purchase'}
                </button>
              </div>
            </div>
            
            {/* Right Column: Summary */}
            <div className="checkout-summary-col">
              <h3 className="summary-title">Order Summary</h3>
              <p className="summary-text">Selected Package: {currentPackage.name}</p>
              
              <div className="summary-divider"></div>
              
              <div className="summary-row">
                <span>Package Price:</span>
                <span>${currentPackage.price.toFixed(2)}</span>
              </div>
              
              <div className="summary-row">
                <span>Discounts / Promotions:</span>
                <span>-(${discount.toFixed(2)})</span>
              </div>
              
              <div className="summary-divider"></div>
              
              <div className="summary-row total-row">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutPage;
