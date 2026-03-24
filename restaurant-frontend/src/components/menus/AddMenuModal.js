import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import apiClient from '../../api/apiClient';

function AddMenuModal({ show, onHide, onSuccess }) {
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
      setErrors(prev => ({ ...prev, [name]: '' }));
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
    if (!validateForm()) return;

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

      // Reset form
      setFormData({ menuName: '', description: '' });
      setSelectedFile(null);
      setImagePreview(null);

      onSuccess();
      onHide();
    } catch (error) {
      console.error('Error creating menu:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to create menu'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton>
        <Modal.Title>Add New Menu</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Menu Name</Form.Label>
            <Form.Control
              type="text"
              name="menuName"
              value={formData.menuName}
              onChange={handleChange}
              isInvalid={!!errors.menuName}
              placeholder="Enter menu name"
              disabled={submitting}
            />
            <Form.Control.Feedback type="invalid">{errors.menuName}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              isInvalid={!!errors.description}
              placeholder="Enter description"
              disabled={submitting}
            />
            <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
            <small className="text-muted">{formData.description.length}/500</small>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Menu Image</Form.Label>
            <Form.Control
              type="file"
              name="imageFile"
              onChange={handleChange}
              accept="image/*"
              disabled={submitting}
            />
            {errors.imageUrl && <div className="text-danger mt-1 small">{errors.imageUrl}</div>}
            {imagePreview && (
              <div className="mt-2 text-center">
                <img src={imagePreview} alt="Preview" className="img-thumbnail" style={{ maxHeight: '150px' }} />
              </div>
            )}
          </Form.Group>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="secondary" onClick={onHide} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Menu'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default AddMenuModal;
