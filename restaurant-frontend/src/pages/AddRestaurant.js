import React, { useState } from 'react';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import SuperAdminDashboard from './SuperAdminDashboard';

function AddRestaurant() {
  const [formData, setFormData] = useState({
    restaurantName: '',
    address: '',
    contactNumber: '',
    email: '',
    openingTime: '09:00',
    closingTime: '22:00',
    subscriptionExpiryDate: '',
    password: '',
    enableHousekeeping: true,
    enableKds: true,
    enableReports: true,
    enableAccountant: true,
    enableCashier: true,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        Swal.fire('Error!', 'Please select an image file', 'error');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Error!', 'Image size must be less than 5MB', 'error');
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const uploadImage = async () => {
    if (!selectedFile) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('logo', selectedFile);

    try {
      const response = await apiClient.post(
        '/restaurant/upload-logo',
        uploadFormData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data && response.data.logoUrl) {
        return response.data.logoUrl;
      }
      return null;
    } catch (error) {
      console.error('Logo upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.restaurantName || formData.restaurantName.length < 2) {
      Swal.fire('Error!', 'Restaurant name must be at least 2 characters', 'error');
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Swal.fire('Error!', 'Please enter a valid email address', 'error');
      return;
    }

    if (!formData.contactNumber || !/^[0-9]{10,20}$/.test(formData.contactNumber)) {
      Swal.fire('Error!', 'Contact number must be between 10-20 digits', 'error');
      return;
    }

    try {
      // Upload logo if selected
      let logoUrl = null;
      if (selectedFile) {
        logoUrl = await uploadImage();
      }

      const dataToSend = {
        ...formData,
        logo: logoUrl,
        subscriptionStatus: 'active',
      };

      const response = await apiClient.post('/restaurant', dataToSend);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Restaurant registered successfully',
        });

        // Reset form
        setFormData({
          restaurantName: '',
          address: '',
          contactNumber: '',
          email: '',
          openingTime: '09:00',
          closingTime: '22:00',
          subscriptionExpiryDate: '',
          password: '',
          enableHousekeeping: true,
          enableKds: true,
          enableReports: true,
          enableAccountant: true,
          enableCashier: true,
        });
        setSelectedFile(null);
        setImagePreview(null);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to register restaurant',
      });
    }
  };

  return (
    <SuperAdminDashboard>
      <div className="container mt-4">
        <h2>Register a Hotel</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Restaurant Name</label>
            <input
              type="text"
              className="form-control"
              name="restaurantName"
              value={formData.restaurantName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Address</label>
            <textarea
              className="form-control"
              name="address"
              rows="3"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Contact Number</label>
            <input
              type="text"
              className="form-control"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              pattern="[0-9]{10,20}"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Restaurant Logo</label>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={handleFileChange}
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                  className="img-thumbnail"
                />
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">Subscription Expiry Date</label>
            <input
              type="date"
              className="form-control"
              name="subscriptionExpiryDate"
              value={formData.subscriptionExpiryDate}
              onChange={handleChange}
            />
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Opening Time</label>
              <input
                type="time"
                className="form-control"
                name="openingTime"
                value={formData.openingTime}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Closing Time</label>
              <input
                type="time"
                className="form-control"
                name="closingTime"
                value={formData.closingTime}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Default Password</label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Leave empty for default password (default123)"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Privileges</label>
            <div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="enableHousekeeping"
                  checked={formData.enableHousekeeping}
                  onChange={handleChange}
                />
                <label className="form-check-label">Room Order System</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="enableKds"
                  checked={formData.enableKds}
                  onChange={handleChange}
                />
                <label className="form-check-label">Kitchen Display System</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="enableReports"
                  checked={formData.enableReports}
                  onChange={handleChange}
                />
                <label className="form-check-label">Reports & Analytics</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="enableAccountant"
                  checked={formData.enableAccountant}
                  onChange={handleChange}
                />
                <label className="form-check-label">Accountant Management</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="enableCashier"
                  checked={formData.enableCashier}
                  onChange={handleChange}
                />
                <label className="form-check-label">Cashier Management</label>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Register Hotel
          </button>
        </form>
      </div>
    </SuperAdminDashboard>
  );
}

export default AddRestaurant;
