import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import './AddOffer.css';

function AddOffer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: '',
    discountValue: '',
    startDate: '',
    endDate: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [titleCount, setTitleCount] = useState(100);
  const [descCount, setDescCount] = useState(500);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update character counters
    if (name === 'title') {
      setTitleCount(100 - value.length);
    }
    if (name === 'description') {
      setDescCount(500 - value.length);
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setImagePreview(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please select an image file (jpg, png, gif, webp)'
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Image must be less than 5MB'
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Clear error
    if (errors.image) {
      setErrors(prev => ({
        ...prev,
        image: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Offer title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must not exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Offer description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }


    if (!formData.discountType) {
      newErrors.discountType = 'Please select a discount type';
    }

    if (!formData.discountValue) {
      newErrors.discountValue = 'Discount value is required';
    } else if (isNaN(formData.discountValue) || Number(formData.discountValue) < 0) {
      newErrors.discountValue = 'Discount value must be a positive number';
    } else if (formData.discountType === 'PERCENTAGE' && Number(formData.discountValue) > 100) {
      newErrors.discountValue = 'Percentage discount cannot exceed 100%';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
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
      let imageUrl = null;

      // Upload image first if file is selected
      if (selectedFile) {
        const formDataImage = new FormData();
        formDataImage.append('image', selectedFile);

        try {
          const uploadResponse = await apiClient.post('/offers/upload-image', formDataImage, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          imageUrl = uploadResponse.data.imageUrl;
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error('Failed to upload image. Please try again.');
        }
      }

      // Create offer with image URL
      const dataToSend = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        startDate: formData.startDate,
        endDate: formData.endDate,
        imageUrl: imageUrl,
        isActive: true
      };

      await apiClient.post('/offers', dataToSend);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Offer created successfully',
        timer: 2000,
        showConfirmButton: false
      });

      // Navigate to Manage Offers page
      navigate('/menus/offers');
    } catch (error) {
      console.error('Error creating offer:', error);
      
      let errorMessage = 'Failed to create offer';
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

  const getCounterClass = (remaining) => {
    if (remaining < 0) return 'danger';
    if (remaining < 20) return 'danger';
    if (remaining < 50) return 'warning';
    return '';
  };

  return (
    <div className="add-offer-page">
      <div className="add-offer-header">
        <button className="back-button-modern" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </button>
      </div>

      <div className="add-offer-container">
        <h2 className="add-offer-title">
          <i className="fas fa-tag me-2"></i>
          Add Special Offer
        </h2>

        <form onSubmit={handleSubmit} className="add-offer-form">
          {/* Offer Title */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Offer Title:
            </label>
            <input
              type="text"
              className={`form-control ${errors.title ? 'is-invalid' : ''}`}
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter Offer Title"
              maxLength={100}
              disabled={submitting}
            />
            <div className="char-counter-container">
              <span className="char-counter">Minimum 3, Maximum 100 characters</span>
              <span className={`char-counter remaining ${getCounterClass(titleCount)}`}>
                <span>{titleCount}</span> characters remaining
              </span>
            </div>
            {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
          </div>

          {/* Offer Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Offer Description:
            </label>
            <textarea
              className={`form-control ${errors.description ? 'is-invalid' : ''}`}
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter Offer Description"
              rows="4"
              maxLength={500}
              disabled={submitting}
            ></textarea>
            <div className="char-counter-container">
              <span className="char-counter">Minimum 10, Maximum 500 characters</span>
              <span className={`char-counter remaining ${getCounterClass(descCount)}`}>
                <span>{descCount}</span> characters remaining
              </span>
            </div>
            {errors.description && <div className="invalid-feedback d-block">{errors.description}</div>}
          </div>

          {/* Offer Image Upload */}
          <div className="form-group">
            <label htmlFor="image" className="form-label">
              <i className="fas fa-image me-2"></i>Offer Image (Optional):
            </label>
            <input
              type="file"
              className={`form-control ${errors.image ? 'is-invalid' : ''}`}
              id="image"
              name="image"
              accept="image/*"
              onChange={handleFileChange}
              disabled={submitting}
            />
            <small className="form-text text-muted">
              Upload an image (jpg, png, gif, webp - Max 5MB)
            </small>
            {errors.image && <div className="invalid-feedback d-block">{errors.image}</div>}
            
            {/* Image Preview */}
            {imagePreview ? (
              <div className="image-preview-container mt-3">
                <p className="mb-2 fw-bold text-primary">
                  <i className="fas fa-eye me-2"></i>Image Preview:
                </p>
                <div className="preview-wrapper">
                  <img 
                    src={imagePreview}
                    alt="Offer preview" 
                    className="image-preview"
                  />
                  <button
                    type="button"
                    className="btn-remove-image"
                    onClick={() => {
                      setSelectedFile(null);
                      setImagePreview(null);
                      document.getElementById('image').value = '';
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            ) : (
              <div className="image-placeholder-upload mt-3">
                <i className="fas fa-image fa-3x"></i>
                <p className="mt-2 mb-0">No image selected</p>
                <small className="text-muted">Upload an image to see preview</small>
              </div>
            )}
          </div>

          {/* Select Discount Type */}
          <div className="form-group">
            <label htmlFor="discountType" className="form-label">
              Discount Type:
            </label>
            <select
              className={`form-select ${errors.discountType ? 'is-invalid' : ''}`}
              id="discountType"
              name="discountType"
              value={formData.discountType}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="">Select discount type</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
            {errors.discountType && <div className="invalid-feedback d-block">{errors.discountType}</div>}
          </div>

          {/* Discount Value */}
          <div className="form-group">
            <label htmlFor="discountValue" className="form-label">
              Discount Value:
            </label>
            <input
              type="number"
              className={`form-control ${errors.discountValue ? 'is-invalid' : ''}`}
              id="discountValue"
              name="discountValue"
              value={formData.discountValue}
              onChange={handleChange}
              placeholder={formData.discountType === 'PERCENTAGE' ? 'Enter percentage (0-100)' : 'Enter amount'}
              min="0"
              step="0.01"
              disabled={submitting}
            />
            <small className="form-text text-muted">
              {formData.discountType === 'PERCENTAGE' 
                ? 'Enter percentage value (e.g., 10 for 10%)' 
                : 'Enter fixed discount amount'}
            </small>
            {errors.discountValue && <div className="invalid-feedback d-block">{errors.discountValue}</div>}
          </div>

          {/* Date Range */}
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="startDate" className="form-label">
                  Start Date:
                </label>
                <input
                  type="datetime-local"
                  className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  disabled={submitting}
                />
                {errors.startDate && <div className="invalid-feedback d-block">{errors.startDate}</div>}
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="endDate" className="form-label">
                  End Date:
                </label>
                <input
                  type="datetime-local"
                  className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate}
                  disabled={submitting}
                />
                {errors.endDate && <div className="invalid-feedback d-block">{errors.endDate}</div>}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary btn-add-offer"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Adding Offer...
                </>
              ) : (
                <>
                  <i className="fas fa-plus-circle me-2"></i>
                  Add Offer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddOffer;
