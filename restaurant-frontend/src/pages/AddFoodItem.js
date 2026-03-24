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
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    moreDetails: '',
    currency: 'LKR',
    price: '',
    categoryId: '',
    blogLink: '',
  });

  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // File states
  const [imageFiles, setImageFiles] = useState({
    image1: null,
    image2: null,
    image3: null,
    image4: null
  });
  const [videoFile, setVideoFile] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (!formData.price) newErrors.price = 'Price is required';
    if (!formData.categoryId) newErrors.categoryId = 'Please select a category';
    if (formData.description.length > 350) newErrors.description = 'Limit exceeded';
    if (formData.moreDetails.length > 400) newErrors.moreDetails = 'Limit exceeded';

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
          imageUrls[key] = res.data.imageUrl;
        }
      }

      // 2. Upload Video
      let videoUrl = '';
      if (videoFile) {
        const vidData = new FormData();
        vidData.append('video', videoFile);
        const res = await apiClient.post('/food-items/upload-video', vidData);
        videoUrl = res.data.videoUrl;
      }

      // 3. Create Food Item
      const payload = {
        itemName: formData.itemName.trim(),
        description: formData.description.trim(),
        moreDetails: formData.moreDetails.trim(),
        price: parseFloat(formData.price),
        categoryId: parseInt(formData.categoryId),
        imageUrl1: imageUrls.image1,
        imageUrl2: imageUrls.image2,
        imageUrl3: imageUrls.image3,
        imageUrl4: imageUrls.image4,
        videoLink: videoUrl,
        blogLink: formData.blogLink.trim(),
        currencyId: 1 // Default to LKR
      };

      await apiClient.post('/food-items', payload);
      Swal.fire({ icon: 'success', title: 'Food item added!', timer: 2000, showConfirmButton: false });
      navigate('/menus/food-items');
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to add food item', 'error');
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
            <button className="btn btn-secondary btn-sm mb-3" onClick={() => navigate('/menus/food-items')}>Back</button>
            <div className="add-food-container bg-white p-4 rounded shadow-sm">
              <h1 className="add-menu-title mb-4">Add Food Item</h1>

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

                <div className="mb-4">
                  <label className="form-label">Category</label>
                  <select
                    className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>)}
                  </select>
                </div>

                <div className="row g-3">
                  {[1, 2, 3, 4].map(num => (
                    <div className="col-md-6" key={num}>
                      <label className="form-label">Image {num}</label>
                      <input type="file" className="form-control" onChange={(e) => handleFileChange(e, `image${num}`)} accept="image/*" />
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>Optional (JPG, JPEG, PNG, GIF - Max 5MB)</small>
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

                <div className="text-end border-top pt-4">
                  <button type="submit" className="btn btn-primary px-5" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>

            <footer className="mt-5 text-muted" style={{ fontSize: '0.9rem' }}>
              Copyright © Knoweb PVT LTD {new Date().getFullYear()}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddFoodItem;
