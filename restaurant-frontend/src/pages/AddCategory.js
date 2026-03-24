import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import './AddMenu.css'; // Reusing the same styling

function AddCategory() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    categoryName: '',
    menuId: '',
    description: '',
  });
  const [menus, setMenus] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await apiClient.get('/menus');
      setMenus(response.data);
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'imageFile') {
      const file = files[0];
      if (file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
          setErrors(prev => ({ ...prev, imageUrl: 'Please select a valid image file (JPG, JPEG, PNG, GIF)' }));
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setErrors(prev => ({ ...prev, imageUrl: 'Image size must be less than 5MB' }));
          return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.categoryName.trim()) {
      newErrors.categoryName = 'Category name is required';
    } else if (formData.categoryName.length > 20) {
      newErrors.categoryName = 'Category name must not exceed 20 characters';
    }

    if (!formData.menuId) {
      newErrors.menuId = 'Please select a menu';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      let finalImageUrl = '';

      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedFile);

        const uploadRes = await apiClient.post('/categories/upload-image', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadRes.data && uploadRes.data.imageUrl) {
          finalImageUrl = uploadRes.data.imageUrl;
        }
      }

      const payload = {
        categoryName: formData.categoryName.trim(),
        menuId: parseInt(formData.menuId),
        description: formData.description.trim(),
        imageUrl: finalImageUrl || undefined
      };

      await apiClient.post('/categories', payload);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Category created successfully',
        timer: 2000,
        showConfirmButton: false
      });

      navigate('/menus/categories');
    } catch (error) {
      console.error('Error creating category:', error);

      let errorMessage = 'Failed to create category';
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = error.response.data.message;
        }
      }

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/menus/categories');
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="dashboard-content">
          <div className="container-fluid py-4">
            <div className="add-menu-container">
              <h1 className="add-menu-title">Add New Category</h1>

              <form onSubmit={handleSubmit} className="add-menu-form">
                {/* Category Name */}
                <div className="form-group mb-4">
                  <label htmlFor="categoryName" className="form-label">
                    Category Name
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.categoryName ? 'is-invalid' : ''}`}
                    id="categoryName"
                    name="categoryName"
                    value={formData.categoryName}
                    onChange={handleChange}
                    placeholder="Category Name"
                    disabled={submitting}
                  />
                  {errors.categoryName && (
                    <div className="invalid-feedback">{errors.categoryName}</div>
                  )}
                </div>

                {/* Select Menu */}
                <div className="form-group mb-4">
                  <label htmlFor="menuId" className="form-label">
                    Select Menu
                  </label>
                  <select
                    className={`form-select ${errors.menuId ? 'is-invalid' : ''}`}
                    id="menuId"
                    name="menuId"
                    value={formData.menuId}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="">Select Menu</option>
                    {menus.map(menu => (
                      <option key={menu.menuId} value={menu.menuId}>
                        {menu.menuName}
                      </option>
                    ))}
                  </select>
                  {errors.menuId && (
                    <div className="invalid-feedback">{errors.menuId}</div>
                  )}
                </div>

                {/* Description */}
                <div className="form-group mb-4">
                  <label htmlFor="description" className="form-label mb-2 d-flex align-items-center gap-2">
                    Description
                    <span className="char-counter">
                      500
                    </span>
                  </label>
                  <textarea
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    disabled={submitting}
                  ></textarea>
                  <small className="form-text text-muted d-block mt-1 text-end">
                    Maximum 500 characters allowed
                  </small>
                  {errors.description && (
                    <div className="invalid-feedback d-block">{errors.description}</div>
                  )}
                </div>

                {/* Image Upload */}
                <div className="form-group mb-4">
                  <label htmlFor="imageFile" className="form-label">
                    Category Image
                  </label>
                  <div className="custom-file-upload">
                    <input
                      type="file"
                      className="form-control"
                      id="imageFile"
                      name="imageFile"
                      onChange={handleChange}
                      accept="image/*"
                      disabled={submitting}
                    />
                  </div>
                  <small className="form-text text-muted">
                    Allowed formats: JPG, JPEG, PNG, GIF (Max 5MB)
                  </small>
                  {errors.imageUrl && (
                    <div className="text-danger mt-1">{errors.imageUrl}</div>
                  )}

                  {imagePreview && (
                    <div className="mt-3">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="img-thumbnail"
                        style={{ maxWidth: '200px', maxHeight: '150px' }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="form-actions mt-5">
                  <button
                    type="submit"
                    className="btn btn-primary btn-add-menu me-2"
                    disabled={submitting}
                  >
                    {submitting ? 'Adding...' : 'Add Category'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-cancel"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Simple Dashboard Footer */}
        <footer className="dashboard-simple-footer py-3 px-4">
          <div className="container-fluid text-muted" style={{ fontSize: '0.9rem' }}>
            Copyright © Knoweb PVT LTD {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default AddCategory;
