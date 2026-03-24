import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import './AddMenu.css';

function AddMenu() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    menuName: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'imageFile') {
      const file = files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          setErrors(prev => ({ ...prev, imageUrl: 'Please select an image file' }));
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

    if (!formData.menuName.trim()) {
      newErrors.menuName = 'Menu name is required';
    } else if (formData.menuName.length > 20) {
      newErrors.menuName = 'Menu name must not exceed 20 characters';
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
        
        const uploadRes = await apiClient.post('/menus/upload-image', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (uploadRes.data && uploadRes.data.imageUrl) {
          finalImageUrl = uploadRes.data.imageUrl;
        }
      }

      const payload = {
        menuName: formData.menuName.trim(),
        description: formData.description.trim(),
        imageUrl: finalImageUrl || undefined
      };

      await apiClient.post('/menus', payload);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Menu created successfully',
        timer: 2000,
        showConfirmButton: false
      });

      navigate('/menus/all');
    } catch (error) {
      console.error('Error creating menu:', error);
      
      let errorMessage = 'Failed to create menu';
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
    navigate('/menus/all');
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="dashboard-content">
          <div className="container-fluid py-4">
            <div className="add-menu-container">
              <h1 className="add-menu-title">Add Menu</h1>
              
              <form onSubmit={handleSubmit} className="add-menu-form">
                {/* Menu Name */}
                <div className="form-group mb-4">
                  <label htmlFor="menuName" className="form-label">
                    Menu Name
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.menuName ? 'is-invalid' : ''}`}
                    id="menuName"
                    name="menuName"
                    value={formData.menuName}
                    onChange={handleChange}
                    placeholder="Menu Name"
                    disabled={submitting}
                  />
                  {errors.menuName && (
                    <div className="invalid-feedback">{errors.menuName}</div>
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
                    placeholder="Description"
                    disabled={submitting}
                  ></textarea>
                  <small className="form-text text-muted">
                    Maximum 500 characters allowed
                  </small>
                  {errors.description && (
                    <div className="invalid-feedback d-block">{errors.description}</div>
                  )}
                </div>

                {/* Image Upload */}
                <div className="form-group mb-4">
                  <label htmlFor="imageFile" className="form-label">
                    Image
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
                    Maximum file size: 5MB (JPEG, PNG only)
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
                    {submitting ? 'Adding...' : 'Add Menu'}
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

export default AddMenu;
