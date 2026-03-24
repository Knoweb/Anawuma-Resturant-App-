import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

function EditSubcategoryModal({ show, onHide, onSuccess, subcategory }) {
  const [formData, setFormData] = useState({
    subcategoryName: '',
    categoryId: ''
  });
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      fetchCategories();
    }
  }, [show]);

  // Populate form when subcategory prop changes
  useEffect(() => {
    if (subcategory) {
      setFormData({
        subcategoryName: subcategory.subcategoryName || '',
        categoryId: subcategory.categoryId || ''
      });
      setErrors({});
    }
  }, [subcategory]);

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.subcategoryName.trim()) {
      newErrors.subcategoryName = 'Subcategory name is required';
    } else if (formData.subcategoryName.length > 20) {
      newErrors.subcategoryName = 'Subcategory name must not exceed 20 characters';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
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
      const payload = {
        subcategoryName: formData.subcategoryName.trim(),
        categoryId: parseInt(formData.categoryId)
      };

      const response = await apiClient.patch(`/subcategories/${subcategory.subcategoryId}`, payload);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Subcategory updated successfully',
        timer: 2000,
        showConfirmButton: false
      });

      // Close modal and refresh list
      onHide();
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Error updating subcategory:', error);
      
      let errorMessage = 'Failed to update subcategory';
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

  const handleClose = () => {
    if (!submitting) {
      setErrors({});
      onHide();
    }
  };

  if (!show) return null;

  return (
    <div className={`modal fade ${show ? 'show d-block' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-edit me-2"></i>
              Edit Subcategory
            </h5>
            <button type="button" className="btn-close" onClick={handleClose} disabled={submitting}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Subcategory Name */}
              <div className="mb-3">
                <label htmlFor="subcategoryName" className="form-label">
                  Subcategory Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.subcategoryName ? 'is-invalid' : ''}`}
                  id="subcategoryName"
                  name="subcategoryName"
                  value={formData.subcategoryName}
                  onChange={handleChange}
                  maxLength={20}
                  placeholder="e.g., Breakfast Items"
                  disabled={submitting}
                />
                {errors.subcategoryName && (
                  <div className="invalid-feedback">{errors.subcategoryName}</div>
                )}
              </div>

              {/* Category Selection */}
              <div className="mb-3">
                <label htmlFor="categoryId" className="form-label">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.categoryName} ({category.menu?.menuName})
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <div className="invalid-feedback">{errors.categoryId}</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    Update Subcategory
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditSubcategoryModal;
