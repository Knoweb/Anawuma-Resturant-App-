import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import EditFoodItemModal from '../components/food-items/EditFoodItemModal';
import AddCategoryModal from '../components/categories/AddCategoryModal';
import Swal from 'sweetalert2';
import apiClient, { sanitizeUrl } from '../api/apiClient';
import './FoodItems.css';

function FoodItems() {
  const location = useLocation();
  const navigate = useNavigate();
  const [foodItems, setFoodItems] = useState([]);
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [selectedFoodItem, setSelectedFoodItem] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    menuId: '',
    categoryId: '',
    search: ''
  });

  useEffect(() => {
    fetchMenus();
    fetchAllCategories(); // Fetch all categories by default

    // Check for query params on load
    const queryParams = new URLSearchParams(location.search);
    const qMenuId = queryParams.get('menuId');
    const qCategoryId = queryParams.get('categoryId');

    if (qMenuId || qCategoryId) {
      setFilters(prev => ({
        ...prev,
        menuId: qMenuId || prev.menuId,
        categoryId: qCategoryId || prev.categoryId
      }));

      if (qCategoryId) {
        fetchCategoryDetail(qCategoryId);
      }
    }
  }, [location.search]);

  const fetchMenus = async () => {
    try {
      const response = await apiClient.get('/menus');
      setMenus(response.data);
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  const fetchAllCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching all categories:', error);
    }
  };

  const fetchFoodItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.menuId) params.append('menuId', filters.menuId);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.search) params.append('search', filters.search);

      const queryString = params.toString();
      const url = queryString ? `/food-items?${queryString}` : '/food-items';

      const response = await apiClient.get(url);
      setFoodItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching food items:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load food items'
      });
    }
  }, [filters.menuId, filters.categoryId, filters.search]);

  // Fetch food items whenever filters change (except search which is debounced)
  useEffect(() => {
    fetchFoodItems();
  }, [filters.menuId, filters.categoryId, fetchFoodItems]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFoodItems();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filters.search, fetchFoodItems]);

  const handleClearFilters = () => {
    navigate('/menus/food-items', { replace: true });
    setFilters({
      menuId: '',
      categoryId: '',
      search: ''
    });
  };

  const fetchCategoryDetail = async (id) => {
    try {
      const response = await apiClient.get(`/categories/${id}`);
      if (response.data && response.data.menuId) {
        setFilters(prev => ({
          ...prev,
          menuId: response.data.menuId.toString()
        }));
      }
    } catch (error) {
      console.error('Error fetching category detail:', error);
    }
  };

  const handleDelete = (foodItemId, itemName) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${itemName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiClient.delete(`/food-items/${foodItemId}`);

          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Food item has been deleted successfully.',
            timer: 2000,
            showConfirmButton: false
          });

          fetchFoodItems();
        } catch (error) {
          console.error('Error deleting food item:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to delete food item'
          });
        }
      }
    });
  };

  const handleEdit = (foodItemId) => {
    const foodItem = foodItems.find(f => f.foodItemId === foodItemId);
    if (foodItem) {
      setSelectedFoodItem(foodItem);
      setShowEditModal(true);
    }
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setSelectedFoodItem(null);
  };

  const handleEditSuccess = () => {
    fetchFoodItems();
  };

  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <EditFoodItemModal
          show={showEditModal}
          onHide={handleEditModalClose}
          onSuccess={handleEditSuccess}
          foodItem={selectedFoodItem}
        />
        <AddCategoryModal
          show={showAddCategoryModal}
          onHide={() => setShowAddCategoryModal(false)}
          onSuccess={() => {
            fetchAllCategories();
            fetchFoodItems();
          }}
          menuId={filters.menuId}
        />
        <div className="dashboard-content">
          <div className="container-fluid">
            {/* Header with Back and New Item */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/menus/categories')}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back to Categories
              </button>

              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary" onClick={() => setShowAddCategoryModal(true)}>
                  <i className="fas fa-folder-plus me-2"></i>
                  Add Category
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/menus/food-items/add')}>
                  <i className="fas fa-plus me-2"></i>
                  New Item
                </button>
              </div>
            </div>

            {/* Food Items Grid */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : foodItems.length === 0 ? (
              <div className="alert alert-info text-center">
                <i className="fas fa-info-circle me-2"></i>
                No food items found matching your filters.
              </div>
            ) : (
              <div className="row g-4">
                {foodItems.map((foodItem) => {
                  const images = [
                    foodItem.imageUrl1,
                    foodItem.imageUrl2,
                    foodItem.imageUrl3,
                    foodItem.imageUrl4,
                    foodItem.imageUrl,   // Support single image field
                    foodItem.image,      // Support alternative name
                    foodItem.itemImage   // Support another alternative name
                  ].filter(Boolean).map(url => sanitizeUrl(url));

                  return (
                    <div className="col-lg-3 col-md-4 col-sm-6" key={foodItem.foodItemId}>
                      <div className="food-item-card card h-100 border-0 shadow-sm">
                        <div className="food-item-card-image">
                          <ImageCarousel images={images} itemName={foodItem.itemName} />
                        </div>
                        <div className="card-body">
                          <div className="mb-2">
                            <span className="badge bg-light text-dark border me-1">
                              {foodItem.category?.categoryName || 'Unknown'}
                            </span>
                          </div>
                          <h5 className="food-item-title mb-2">{foodItem.itemName}</h5>
                          <h6 className="food-item-price mb-3">LKR {formatPrice(foodItem.price)}</h6>

                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-primary-blue flex-grow-1"
                              onClick={() => handleEdit(foodItem.foodItemId)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger-red flex-grow-1"
                              onClick={() => handleDelete(foodItem.foodItemId, foodItem.itemName)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for the image carousel within each card
function ImageCarousel({ images, itemName }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="no-image-placeholder d-flex flex-column align-items-center justify-content-center h-100 bg-light text-muted">
        <i className="fas fa-image mb-2" style={{ fontSize: '2rem' }}></i>
        <span>No Image</span>
      </div>
    );
  }

  return (
    <div className="carousel-container h-100">
      <img
        src={images[currentIndex]}
        alt={itemName}
        className="carousel-image"
        key={currentIndex}
      />
      {images.length > 1 && (
        <div className="carousel-dots">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`dot ${idx === currentIndex ? 'active' : ''}`}
            ></span>
          ))}
        </div>
      )}
    </div>
  );
}

export default FoodItems;
