import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import './Offers.css';

// Get backend base URL for serving static files
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) return imagePath;
  // Otherwise, prefix with backend URL
  const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';
  return `${backendUrl}${imagePath}`;
};

function Offers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/offers');
      setOffers(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setError('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (offerId, offerTitle) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${offerTitle}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/offers/${offerId}`);
        
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Offer has been deleted successfully',
          timer: 2000,
          showConfirmButton: false
        });

        // Refresh the offers list
        fetchOffers();
      } catch (error) {
        console.error('Error deleting offer:', error);
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete offer'
        });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDiscount = (discountType, discountValue) => {
    if (discountType === 'PERCENTAGE') {
      return `${discountValue}% OFF`;
    } else if (discountType === 'FIXED') {
      return `$${discountValue} OFF`;
    }
    return 'N/A';
  };

  const isOfferActive = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  const isOfferExpired = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    return now > end;
  };

  if (loading) {
    return (
      <div className="offers-page">
        <div className="offers-header">
          <h2 className="page-title">
            <i className="fas fa-tag me-2"></i>
            Manage Special Offers
          </h2>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="offers-page">
      <div className="offers-header">
        <h2 className="page-title">
          <i className="fas fa-tag me-2"></i>
          Manage Special Offers
        </h2>
        <button 
          className="btn btn-primary btn-add-new"
          onClick={() => navigate('/offers/add')}
        >
          <i className="fas fa-plus-circle me-2"></i>
          Add New Offer
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      {!loading && !error && offers.length === 0 && (
        <div className="no-offers-container">
          <div className="no-offers-icon">
            <i className="fas fa-tag"></i>
          </div>
          <h3>No Special Offers Found</h3>
          <p className="text-muted">Start creating special offers to attract more customers!</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/offers/add')}
          >
            <i className="fas fa-plus-circle me-2"></i>
            Create Your First Offer
          </button>
        </div>
      )}

      <div className="row">
        {offers.map(offer => (
          <div key={offer.offerId} className="col-md-4 col-sm-6 mb-4">
            <div className="offer-card">
              {/* Offer Image */}
              <div className="offer-image-container">
                {offer.imageUrl ? (
                  <img 
                    src={getImageUrl(offer.imageUrl)}
                    alt={offer.title}
                    className="offer-image"
                    onError={(e) => { 
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="offer-image-placeholder" style={{ display: offer.imageUrl ? 'none' : 'flex' }}>
                  <i className="fas fa-tag fa-3x"></i>
                  <p className="mt-2">Special Offer</p>
                </div>
              </div>
              
              <div className="offer-content">
                <div className="offer-status-badges">
                  {isOfferActive(offer.startDate, offer.endDate) && (
                    <span className="badge bg-success">
                      <i className="fas fa-check-circle me-1"></i>
                      Active
                    </span>
                  )}
                  {isOfferExpired(offer.endDate) && (
                    <span className="badge bg-danger">
                      <i className="fas fa-times-circle me-1"></i>
                      Expired
                    </span>
                  )}
                </div>

                <h5 className="offer-title">{offer.title}</h5>
                <p className="offer-description">{offer.description}</p>
                
                <div className="offer-details">
                  <div className="detail-item">
                    <i className="fas fa-percent me-2"></i>
                    <strong>Discount:</strong> {formatDiscount(offer.discountType, offer.discountValue)}
                  </div>
                  <div className="detail-item">
                    <i className="fas fa-calendar-alt me-2"></i>
                    <strong>Start:</strong> {formatDate(offer.startDate)}
                  </div>
                  <div className="detail-item">
                    <i className="fas fa-calendar-check me-2"></i>
                    <strong>End:</strong> {formatDate(offer.endDate)}
                  </div>
                </div>

                <div className="offer-actions">
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={() => navigate(`/offers/edit/${offer.offerId}`)}
                  >
                    <i className="fas fa-edit me-1"></i>
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(offer.offerId, offer.title)}
                  >
                    <i className="fas fa-trash-alt me-1"></i>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Offers;
