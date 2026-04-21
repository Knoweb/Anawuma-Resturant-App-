import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import Swal from 'sweetalert2';
import { useAuthStore } from '../store/authStore';

const ALLOWED_ROLES = ['housekeeper', 'kitchen', 'cashier', 'accountant', 'steward'];

const ROLE_LABELS = {
  housekeeper: 'Housekeeper',
  kitchen: 'Kitchen Staff',
  cashier: 'Cashier',
  accountant: 'Accountant',
  steward: 'Steward',
};

import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';

function AddStaff() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'cashier',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Swal.fire('Error!', 'Please enter a valid email address', 'error');
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      Swal.fire('Error!', 'Password must be at least 6 characters', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      const dataToSend = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        restaurantId: user.restaurantId,
      };

      const response = await apiClient.post('/auth/admin/create', dataToSend);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `${ROLE_BADGES[formData.role] ? formData.role : 'Staff'} created successfully`,
        });
        navigate('/settings/staff');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to create staff member',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="dashboard-content">
          <div className="container py-4">
            <div className="row justify-content-center">
              <div className="col-md-8">
                <div className="card shadow-sm border-0 rounded-lg">
                  <div className="card-header bg-white py-3 border-0">
                    <div className="d-flex align-items-center">
                      <button 
                        className="btn btn-link link-dark p-0 me-3" 
                        onClick={() => navigate('/settings/staff')}
                      >
                        <i className="fas fa-arrow-left"></i>
                      </button>
                      <h4 className="mb-0">Add New Staff Member</h4>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    <form onSubmit={handleSubmit}>
                      <div className="mb-4">
                        <label className="form-label fw-bold">Email Address</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="fas fa-envelope text-muted"></i>
                          </span>
                          <input
                            type="email"
                            className="form-control border-start-0"
                            name="email"
                            placeholder="e.g., cashier1@hotel.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="form-text mt-2">
                          This will be their login email. Ensure it's unique.
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-bold">Login Password</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="fas fa-key text-muted"></i>
                          </span>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-control border-start-0 border-end-0"
                            name="password"
                            placeholder="Minimum 6 characters"
                            value={formData.password}
                            onChange={handleChange}
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary border-start-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-bold">Role / Account Type</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="fas fa-user-tag text-muted"></i>
                          </span>
                          <select
                            className="form-select border-start-0"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            required
                          >
                            <option value="cashier">Cashier</option>
                            <option value="kitchen">Kitchen Staff</option>
                            <option value="accountant">Accountant</option>
                            <option value="housekeeper">Housekeeper</option>
                            <option value="steward">Steward</option>
                          </select>
                        </div>
                        <div className="form-text mt-2">
                          Each role has access to specific parts of the system.
                        </div>
                      </div>

                      <div className="d-grid mt-5">
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-lg" 
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                          ) : (
                            <i className="fas fa-user-plus me-2"></i>
                          )}
                          Create Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
              .form-control:focus, .form-select:focus {
                box-shadow: none;
                border-color: #266668;
              }
              .input-group-text {
                background-color: #f8f9fa;
                border: 1px solid #ced4da;
              }
              .card {
                border-radius: 12px;
              }
              .btn-primary {
                background-color: #266668;
                border-color: #266668;
              }
              .btn-primary:hover {
                background-color: #1a4648;
                border-color: #1a4648;
              }
            `}} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddStaff;
