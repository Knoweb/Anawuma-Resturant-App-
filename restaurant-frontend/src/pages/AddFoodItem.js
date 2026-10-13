import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import './AddMenu.css'; // Common dashboard form styles
import './AddFoodItem.css'; // Specific grid styles

function AddFoodItem() {
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    moreDetails: '',
    currency: 'LKR',
    price: '',
    menuId: '',
    categoryId: '',
    blogLink: '',
    isAvailable: true,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // File states
  const [imageFiles, setImageFiles] = useState({
    image1: null,
    image2: null,
    image3: null,
    image4: null
  });
  const [imagePreviews, setImagePreviews] = useState({
    image1: null,
    image2: null,
    image3: null,
    image4: null
  });
  const [videoFile, setVideoFile] = useState(null);

  useEffect(() => {
    fetchMenus();
    fetchCategories();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await apiClient.get('/menus');
      setMenus(response.data);
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    if (formData.menuId) {
      const menuIdNum = parseInt(formData.menuId);
      // Immediately filter existing categories
      const filtered = categories.filter(c => 
        Number(c.menuId) === menuIdNum || 
        Number(c.menu?.menuId) === menuIdNum
      );
      setFilteredCategories(filtered);

      // Also query directly from backend for the latest categories of this menu
      apiClient.get(`/categories?menuId=${menuIdNum}`)
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setFilteredCategories(res.data);
          }
        })
        .catch(err => {
          console.error('Error fetching categories for menu:', err);
        });
    } else {
      setFilteredCategories([]);
    }
  }, [formData.menuId, categories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'menuId') next.categoryId = ''; // Reset category when menu changes
      return next;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (file) {
      if (key.startsWith('image')) {
        if (file.size > 5 * 1024 * 1024) {
          Swal.fire('Error', 'Image size must be less than 5MB', 'error');
          e.target.value = '';
          return;
        }
        setImageFiles(prev => ({ ...prev, [key]: file }));
        setImagePreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
      } else if (key === 'video') {
        if (file.size > 50 * 1024 * 1024) {
          Swal.fire('Error', 'Video size must be less than 50MB', 'error');
          e.target.value = '';
          return;
        }
        setVideoFile(file);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.itemName.trim()) newErrors.itemName = 'Item name is required';
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price greater than 0';
    }
    if (!formData.menuId) newErrors.menuId = 'Please select a menu';
    if (!formData.categoryId) newErrors.categoryId = 'Please select a category';
    if (formData.description && formData.description.length > 350) newErrors.description = 'Limit exceeded (max 350 characters)';
    if (formData.moreDetails && formData.moreDetails.length > 400) newErrors.moreDetails = 'Limit exceeded (max 400 characters)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // 1. Upload Images
      const imageUrls = {};
      for (const [key, file] of Object.entries(imageFiles)) {
        if (file) {
          const imgData = new FormData();
          imgData.append('image', file);
          const res = await apiClient.post('/food-items/upload-image', imgData);
          console.log(`DEBUG: Upload result for ${key}:`, res.data);
          
          if (!res.data || !res.data.imageUrl) {
            throw new Error(`Failed to upload ${key}: ${res.data?.message || 'No URL returned'}`);
          }
          
          imageUrls[key] = res.data.imageUrl;
        }
      }

      // 2. Upload Video
      let videoUrl = '';
      if (videoFile) {
        const vidData = new FormData();
        vidData.append('video', videoFile);
        const res = await apiClient.post('/food-items/upload-video', vidData);
        if (!res.data || !res.data.videoUrl) {
          throw new Error(`Failed to upload video: ${res.data?.message || 'No URL returned'}`);
        }
        videoUrl = res.data.videoUrl;
      }

      // 3. Create Food Item
      const payload = {
        itemName: formData.itemName.trim(),
        price: parseFloat(formData.price),
        menuId: parseInt(formData.menuId),
        isAvailable: formData.isAvailable !== false,
        currencyId: 1, // Default to LKR
      };

      if (formData.description?.trim()) payload.description = formData.description.trim();
      if (formData.moreDetails?.trim()) payload.moreDetails = formData.moreDetails.trim();
      if (formData.categoryId) payload.categoryId = parseInt(formData.categoryId);
      if (imageUrls.image1) payload.imageUrl1 = imageUrls.image1;
      if (imageUrls.image2) payload.imageUrl2 = imageUrls.image2;
      if (imageUrls.image3) payload.imageUrl3 = imageUrls.image3;
      if (imageUrls.image4) payload.imageUrl4 = imageUrls.image4;
      if (videoUrl) payload.videoLink = videoUrl;
      if (formData.blogLink?.trim()) payload.blogLink = formData.blogLink.trim();

      console.log('DEBUG: Final Food Item Payload ready to send:', JSON.stringify(payload, null, 2));
      
      const createResponse = await apiClient.post('/food-items', payload);
      console.log('DEBUG: Create Food Item Response:', createResponse.data);
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Food item added successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
      navigate('/menus/food-items');
    } catch (error) {
      console.error('Add food item error:', error);
      let errorMessage = 'Failed to add food item';
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="dashboard-content">
          <div className="container-fluid py-4">
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {/* Modern Page Header */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-white shadow-sm rounded-circle d-flex align-items-center justify-content-center"
                    onClick={() => navigate('/menus/food-items')}
                    title="Back to Food Items"
                    style={{
                      width: '42px',
                      height: '42px',
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      color: '#235F61',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.transform = 'translateX(-3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <div>
                    <div className="text-muted small mb-1 d-flex align-items-center gap-1">
                      <span
                        role="button"
                        onClick={() => navigate('/menus/food-items')}
                        className="text-decoration-none fw-semibold"
                        style={{ color: '#235F61', cursor: 'pointer' }}
                      >
                        Food Items
                      </span>
                      <span>/</span>
                      <span className="text-secondary">Add New</span>
                    </div>
                    <h1 className="h4 fw-bold mb-0" style={{ color: '#1e293b' }}>
                      Add Food Item
                    </h1>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3 d-none d-sm-inline-flex align-items-center gap-2"
                  onClick={() => navigate('/menus/food-items')}
                  style={{ borderRadius: '8px', borderColor: '#cbd5e1' }}
                >
                  <i className="fas fa-times"></i>
                  <span>Cancel</span>
                </button>
              </div>

              <div className="add-food-container bg-white p-4 rounded-3 shadow-sm border">

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label">Item Name</label>
                  <input
                    type="text"
                    className={`form-control ${errors.itemName ? 'is-invalid' : ''}`}
                    name="itemName"
                    value={formData.itemName}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={350}
                  ></textarea>
                  <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: '0.8rem' }}>
                    <small>Maximum 350 characters allowed</small>
                    <small>{350 - formData.description.length} characters remaining</small>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">More Details</label>
                  <textarea
                    className="form-control"
                    name="moreDetails"
                    rows="3"
                    value={formData.moreDetails}
                    onChange={handleChange}
                    maxLength={400}
                  ></textarea>
                  <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: '0.8rem' }}>
                    <small>Maximum 400 characters allowed</small>
                    <small>{400 - formData.moreDetails.length} characters remaining</small>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Currency</label>
                    <input type="text" className="form-control" value="LKR" disabled />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Menu <span className="text-danger">*</span></label>
                    <select
                      className={`form-select ${errors.menuId ? 'is-invalid' : ''}`}
                      name="menuId"
                      value={formData.menuId}
                      onChange={handleChange}
                    >
                      <option value="">Select Menu</option>
                      {menus.map(m => <option key={m.menuId} value={m.menuId}>{m.menuName}</option>)}
                    </select>
                    {errors.menuId && <div className="invalid-feedback">{errors.menuId}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Category <span className="text-danger">*</span></label>
                    <select
                      className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleChange}
                      disabled={!formData.menuId}
                    >
                      <option value="">Select Category</option>
                      {filteredCategories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>)}
                    </select>
                    {errors.categoryId && <div className="invalid-feedback">{errors.categoryId}</div>}
                    {!formData.menuId && <small className="text-muted">Select a menu first</small>}
                    {formData.menuId && filteredCategories.length === 0 && (
                      <small className="text-warning d-block mt-1">No categories found for this menu. Please add a category first.</small>
                    )}
                  </div>
                </div>

                <div className="row g-3">
                  {[1, 2, 3, 4].map(num => (
                    <div className="col-md-6" key={num}>
                      <label className="form-label">Image {num}</label>
                      <input type="file" className="form-control" onChange={(e) => handleFileChange(e, `image${num}`)} accept="image/*" />
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>Optional (JPG, JPEG, PNG, GIF - Max 5MB)</small>
                      
                      {imagePreviews[`image${num}`] && (
                        <div className="mt-2 position-relative" style={{ width: '100px', height: '100px' }}>
                          <img 
                            src={imagePreviews[`image${num}`]} 
                            alt={`Preview ${num}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} 
                          />
                          <button 
                            type="button"
                            className="btn-close position-absolute top-0 end-0 bg-white shadow-sm"
                            style={{ padding: '4px', fontSize: '0.6rem', transform: 'translate(40%, -40%)' }}
                            onClick={() => {
                              setImageFiles(prev => ({ ...prev, [`image${num}`]: null }));
                              setImagePreviews(prev => ({ ...prev, [`image${num}`]: null }));
                            }}
                          ></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="row mt-4 g-3 mb-5">
                  <div className="col-md-6">
                    <label className="form-label">Video File</label>
                    <input type="file" className="form-control" onChange={(e) => handleFileChange(e, 'video')} accept="video/*" />
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Optional (Browse video file from your laptop)</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Blog Link</label>
                    <input
                      type="url"
                      className="form-control"
                      name="blogLink"
                      value={formData.blogLink}
                      onChange={handleChange}
                      placeholder="Optional (must be a valid URL)"
                    />
                  </div>
                </div>
                <div className="row mt-4 mb-5">
                  <div className="col-12">
                    <div className="d-flex align-items-center p-3 bg-light rounded border">
                      <div className="flex-grow-1">
                        <label className="form-label mb-0 fw-bold">Availability Status</label>
                        <div className="small text-muted">When disabled, this item will not be visible for ordering.</div>
                      </div>
                      <div className="form-check form-switch">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="isAvailableSwitch"
                          checked={formData.isAvailable}
                          onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                          style={{ width: '2.5em', height: '1.25em', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end align-items-center gap-2 border-top pt-4">
                  <button
                    type="button"
                    className="btn btn-light px-4"
                    onClick={() => navigate('/menus/food-items')}
                    disabled={submitting}
                    style={{ border: '1px solid #e2e8f0' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn px-4 text-white shadow-sm"
                    disabled={submitting}
                    style={{ backgroundColor: '#235F61', borderColor: '#235F61' }}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus-circle me-2"></i>
                        Add Food Item
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            </div>

            <footer className="mt-5 text-muted text-center" style={{ fontSize: '0.9rem' }}>
              Copyright © Knoweb PVT LTD {new Date().getFullYear()}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddFoodItem;
