import React, { useState, useEffect } from 'react';
import { authAPI } from '../api/apiClient';
import Swal from 'sweetalert2';
import './Profile.css';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    email: '',
    name: '',
    type: '',
  });

  const [formData, setFormData] = useState({
    email: '',
    name: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      
      if (response.data.success) {
        const userData = response.data.data;
        setProfile(userData);
        setFormData({
          email: userData.email,
          name: userData.name || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load profile information',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.email.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Email is required',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a valid email address',
      });
      return;
    }

    // Check if anything changed
    if (formData.email === profile.email && formData.name === profile.name) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made to your profile',
      });
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {};
      if (formData.email !== profile.email) {
        updateData.email = formData.email;
      }
      if (formData.name !== profile.name) {
        updateData.name = formData.name;
      }

      const response = await authAPI.updateProfile(updateData);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Profile updated successfully',
          timer: 2000,
          showConfirmButton: false,
        });

        // Reload profile data
        await loadProfile();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      
      let errorMessage = 'Failed to update profile';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      email: profile.email,
      name: profile.name || '',
    });
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Profile Settings</h2>
        <p className="profile-subtitle">Manage your account information</p>
      </div>

      <div className="profile-card">
        <div className="profile-info">
          <div className="info-item">
            <span className="info-label">Account Type:</span>
            <span className="info-value">
              {profile.type === 'super_admin' ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          {profile.type === 'super_admin' && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter your name"
              />
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-cancel"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-save"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
