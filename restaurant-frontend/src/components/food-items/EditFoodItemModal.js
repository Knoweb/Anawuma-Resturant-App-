import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import apiClient from '../../api/apiClient';

function EditFoodItemModal({ show, onHide, onSuccess, foodItem }) {
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    moreDetails: '',
    price: '',
    currencyId: 1,
    categoryId: '',
    subcategoryId: '',
    imageUrl1: '',
    imageUrl2: '',
    imageUrl3: '',
    imageUrl4: '',
    videoLink: '',
    blogLink: ''
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({
    image1: null,
    image2: null,
    image3: null,
    image4: null
  });
  const [previews, setPreviews] = useState({
    image1: null,
    image2: null,
    image3: null,
    image4: null
  });

  useEffect(() => {
    if (show && foodItem) {
      setFormData({
        itemName: foodItem.itemName || '',
        description: foodItem.description || '',
        moreDetails: foodItem.moreDetails || '',
        price: foodItem.price || '',
        currencyId: foodItem.currencyId || 1,
        categoryId: foodItem.categoryId || '',
        imageUrl1: foodItem.imageUrl1 || '',
        imageUrl2: foodItem.imageUrl2 || '',
        imageUrl3: foodItem.imageUrl3 || '',
        imageUrl4: foodItem.imageUrl4 || '',
        videoLink: foodItem.videoLink || '',
        blogLink: foodItem.blogLink || ''
      });
      setPreviews({
        image1: foodItem.imageUrl1 || null,
        image2: foodItem.imageUrl2 || null,
        image3: foodItem.imageUrl3 || null,
        image4: foodItem.imageUrl4 || null
      });
      setSelectedFiles({ image1: null, image2: null, image3: null, image4: null });
      fetchCategories();
    }
  }, [show, foodItem]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name.startsWith('imageFile')) {
      const index = name.charAt(name.length - 1);
      const file = files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Please select an image file' });
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Image size must be less than 5MB' });
          return;
        }
        
        setSelectedFiles(prev => ({ ...prev, [`image${index}`]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => ({ ...prev, [`image${index}`]: reader.result }));
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.itemName.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Item name is required'
      });
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Price must be greater than 0'
      });
      return;
    }

    if (!formData.categoryId) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select a category'
      });
      return;
    }

    setLoading(true);

    try {
      const imageUrls = { ...formData };
      
      // Upload images one by one
      for (let i = 1; i <= 4; i++) {
        const file = selectedFiles[`image${i}`];
        if (file) {
          const uploadFormData = new FormData();
          uploadFormData.append('image', file);
          
          try {
            const uploadRes = await apiClient.post('/food-items/upload-image', uploadFormData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (uploadRes.data && uploadRes.data.imageUrl) {
              imageUrls[`imageUrl${i}`] = uploadRes.data.imageUrl;
            }
          } catch (uploadError) {
            console.error(`Error uploading image ${i}:`, uploadError);
          }
        }
      }

      const submitData = {
        itemName: formData.itemName.trim(),
        description: formData.description.trim() || undefined,
        moreDetails: formData.moreDetails.trim() || undefined,
        price: parseFloat(formData.price),
        currencyId: parseInt(formData.currencyId),
        categoryId: parseInt(formData.categoryId),
        imageUrl1: imageUrls.imageUrl1 || undefined,
        imageUrl2: imageUrls.imageUrl2 || undefined,
        imageUrl3: imageUrls.imageUrl3 || undefined,
        imageUrl4: imageUrls.imageUrl4 || undefined,
        videoLink: formData.videoLink.trim() || undefined,
        blogLink: formData.blogLink.trim() || undefined
      };

      await apiClient.patch(`/food-items/${foodItem.foodItemId}`, submitData);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Food item updated successfully',
        timer: 2000,
        showConfirmButton: false
      });

      onSuccess();
      onHide();
    } catch (error) {
      console.error('Error updating food item:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update food item'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!foodItem) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-edit me-2"></i>
          Edit Food Item
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <div className="row">
            {/* Basic Information */}
            <div className="col-md-6 mb-3">
              <Form.Group>
                <Form.Label>
                  Item Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleChange}
                  placeholder="Enter item name"
                  required
                  maxLength={100}
                />
              </Form.Group>
            </div>

            <div className="col-md-6 mb-3">
              <Form.Group>
                <Form.Label>
                  Price <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Enter price"
                  required
                  min="0"
                  step="0.01"
                />
              </Form.Group>
            </div>

            <div className="col-md-6 mb-3">
              <Form.Group>
                <Form.Label>
                  Category <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.categoryName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-12 mb-3">
              <Form.Group>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter description"
                  rows={2}
                />
              </Form.Group>
            </div>

            <div className="col-12 mb-3">
              <Form.Group>
                <Form.Label>More Details</Form.Label>
                <Form.Control
                  as="textarea"
                  name="moreDetails"
                  value={formData.moreDetails}
                  onChange={handleChange}
                  placeholder="Enter additional details"
                  rows={2}
                />
              </Form.Group>
            </div>

            {/* Image Uploads */}
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label>Image {i}</Form.Label>
                  <Form.Control
                    type="file"
                    name={`imageFile${i}`}
                    onChange={handleChange}
                    accept="image/*"
                    disabled={loading}
                  />
                  {previews[`image${i}`] && (
                    <div className="mt-2 text-center">
                      <img
                        src={previews[`image${i}`].startsWith('data:') ? previews[`image${i}`] : (previews[`image${i}`].startsWith('http') ? previews[`image${i}`] : `../${previews[`image${i}`]}`)}
                        alt={`Preview ${i}`}
                        style={{ height: '80px', objectFit: 'cover' }}
                        className="img-thumbnail"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger d-block mx-auto"
                        onClick={() => {
                          setSelectedFiles(prev => ({ ...prev, [`image${i}`]: null }));
                          setPreviews(prev => ({ ...prev, [`image${i}`]: foodItem[`imageUrl${i}`] || null }));
                          document.getElementsByName(`imageFile${i}`)[0].value = '';
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </Form.Group>
              </div>
            ))}

            {/* Video and Blog Links */}
            <div className="col-md-6 mb-3">
              <Form.Group>
                <Form.Label>Video Link</Form.Label>
                <Form.Control
                  type="text"
                  name="videoLink"
                  value={formData.videoLink}
                  onChange={handleChange}
                  placeholder="Enter video URL"
                  maxLength={255}
                />
              </Form.Group>
            </div>

            <div className="col-md-6 mb-3">
              <Form.Group>
                <Form.Label>Blog Link</Form.Label>
                <Form.Control
                  type="text"
                  name="blogLink"
                  value={formData.blogLink}
                  onChange={handleChange}
                  placeholder="Enter blog URL"
                  maxLength={255}
                />
              </Form.Group>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Updating...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Update Food Item
                </>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default EditFoodItemModal;
