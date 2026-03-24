import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import apiClient from '../../api/apiClient';
import Swal from 'sweetalert2';

function EditCategoryModal({ show, onHide, onSuccess, category }) {
  const [formData, setFormData] = useState({
    categoryName: '',
    description: '',
    menuId: '',
    imageUrl: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [menus, setMenus] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      fetchMenus();
    }
  }, [show]);

  useEffect(() => {
    if (category) {
      setFormData({
        categoryName: category.categoryName || '',
        description: category.description || '',
        menuId: category.menuId || '',
        imageUrl: category.imageUrl || ''
      });
      setImagePreview(category.imageUrl || null);
      setSelectedFile(null);
      setErrors({});
    }
  }, [category]);

  const fetchMenus = async () => {
    try {
      const response = await apiClient.get('/menus');
      setMenus(response.data);
    } catch (error) {
      console.error('Error fetching menus:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, imageFile: 'Please select an image file' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, imageFile: 'File size must not exceed 5MB' }));
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      if (errors.imageFile) {
        setErrors(prev => ({ ...prev, imageFile: '' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.categoryName.trim()) {
      newErrors.categoryName = 'Category name is required';
    } else if (formData.categoryName.length > 20) {
      newErrors.categoryName = 'Category name must not exceed 20 characters';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }
    if (!formData.menuId) {
      newErrors.menuId = 'Please select a menu';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let finalImageUrl = formData.imageUrl;
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
        description: formData.description.trim(),
        menuId: parseInt(formData.menuId),
        imageUrl: finalImageUrl
      };

      await apiClient.patch(`/categories/${category.categoryId}`, payload);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Category updated successfully',
        timer: 2000,
        showConfirmButton: false
      });

      onSuccess();
      onHide();
    } catch (error) {
      console.error('Error updating category:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update category'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-edit me-2"></i>
          Edit Category
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Category Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="categoryName"
              value={formData.categoryName}
              onChange={handleChange}
              isInvalid={!!errors.categoryName}
              placeholder="e.g., Appetizers"
              disabled={submitting}
            />
            <Form.Control.Feedback type="invalid">{errors.categoryName}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Menu <span className="text-danger">*</span></Form.Label>
            <Form.Select
              name="menuId"
              value={formData.menuId}
              onChange={handleChange}
              isInvalid={!!errors.menuId}
              disabled={submitting}
            >
              <option value="">Select a menu</option>
              {menus.map(menu => (
                <option key={menu.menuId} value={menu.menuId}>
                  {menu.menuName}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.menuId}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description <span className="text-danger">*</span></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              isInvalid={!!errors.description}
              placeholder="Brief description of the category"
              disabled={submitting}
            />
            <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
            <small className="text-muted">{formData.description.length}/500</small>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Category Image</Form.Label>
            <Form.Control
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              isInvalid={!!errors.imageFile}
              disabled={submitting}
            />
            <Form.Control.Feedback type="invalid">{errors.imageFile}</Form.Control.Feedback>
            <small className="text-muted">Max file size: 5MB</small>
            {imagePreview && (
              <div className="mt-3 text-center">
                <img src={imagePreview} alt="Preview" className="img-thumbnail" style={{ maxHeight: '150px' }} />
                <div className="mt-2 text-center">
                  <Button variant="outline-danger" size="sm" onClick={() => {
                    setSelectedFile(null);
                    setImagePreview(category.imageUrl || null);
                  }}>
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </Form.Group>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="secondary" onClick={onHide} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Category'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default EditCategoryModal;
