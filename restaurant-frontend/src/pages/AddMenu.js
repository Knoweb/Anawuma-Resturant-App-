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
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {/* Modern Page Header */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-white shadow-sm rounded-circle d-flex align-items-center justify-content-center"
                    onClick={handleCancel}
                    title="Back to Menus"
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
                        onClick={handleCancel}
                        className="text-decoration-none fw-semibold"
                        style={{ color: '#235F61', cursor: 'pointer' }}
                      >
                        Menus
                      </span>
                      <span>/</span>
                      <span className="text-secondary">Add New</span>
                    </div>
                    <h1 className="h4 fw-bold mb-0" style={{ color: '#1e293b' }}>
                      Add Menu
                    </h1>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3 d-none d-sm-inline-flex align-items-center gap-2"
                  onClick={handleCancel}
                  style={{ borderRadius: '8px', borderColor: '#cbd5e1' }}
                >
                  <i className="fas fa-times"></i>
                  <span>Cancel</span>
                </button>
              </div>

              <div className="add-menu-container bg-white p-4 rounded-3 shadow-sm border">
              
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
                <div className="d-flex justify-content-end align-items-center gap-2 border-top pt-4 mt-5">
                  <button 
                    type="button" 
                    className="btn btn-light px-4" 
                    onClick={handleCancel}
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
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus-circle me-2"></i>
                        Add Menu
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
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
