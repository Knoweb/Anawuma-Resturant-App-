import React, { useState } from 'react';
import apiClient from '../../api/apiClient';

const RegisterForm = () => {
  const initialFormState = {
    restaurant_name: '',
    address: '',
    contact_number: '',
    email: '',
    password: '',
    confirm_password: '',
    opening_time: '',
    closing_time: '',
    logo: null,
    enable_housekeeping: true,
    enable_kds: true,
    enable_reports: true,
    enable_accountant: true,
    enable_cashier: true,
  };

  const [form, setForm] = useState(initialFormState);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleFeatureToggle = (e) => {
    const { name, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.logo && form.logo.size > 1024 * 1024) {
      setError('Logo file must be less than 1MB.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('restaurantName', form.restaurant_name.trim());
      formData.append('address', form.address.trim());
      formData.append('contactNumber', form.contact_number.trim());
      formData.append('email', form.email.trim());
      formData.append('password', form.password);
      formData.append('confirmPassword', form.confirm_password);
      formData.append('openingTime', form.opening_time);
      formData.append('closingTime', form.closing_time);
      formData.append('enableHousekeeping', String(form.enable_housekeeping));
      formData.append('enableKds', String(form.enable_kds));
      formData.append('enableReports', String(form.enable_reports));
      formData.append('enableAccountant', String(form.enable_accountant));
      formData.append('enableCashier', String(form.enable_cashier));

      if (form.logo) {
        formData.append('logo', form.logo);
      }

      const response = await apiClient.post('/auth/register-restaurant', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(
        response?.data?.message ||
          'Registration submitted! Your application is pending super admin approval. You will be able to log in once approved.',
      );
      setForm(initialFormState);
      setShowPwd(false);
      setShowConfirmPwd(false);
    } catch (submitError) {
      const message = submitError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="reg-form" onSubmit={handleSubmit} encType="multipart/form-data" noValidate>

      {success && (
        <div className="reg-success" role="status">
          {success}
        </div>
      )}

      {error && (
        <div className="reg-error" role="alert">
          {error}
        </div>
      )}

      {/* Row 1: Name + Address */}
      <div className="reg-row">
        <div className="reg-field">
          <label htmlFor="restaurant_name">Hotel Or Restaurant Name</label>
          <input
            type="text"
            id="restaurant_name"
            name="restaurant_name"
            value={form.restaurant_name}
            onChange={handleChange}
            autoComplete="organization"
            required
          />
        </div>
        <div className="reg-field">
          <label htmlFor="address">Address</label>
          <input
            type="text"
            id="address"
            name="address"
            value={form.address}
            onChange={handleChange}
            autoComplete="street-address"
            required
          />
        </div>
      </div>

      {/* Row 2: Contact + Email */}
      <div className="reg-row">
        <div className="reg-field">
          <label htmlFor="contact_number">Contact Number</label>
          <input
            type="text"
            id="contact_number"
            name="contact_number"
            value={form.contact_number}
            onChange={handleChange}
            pattern="[0-9]{10}"
            title="Enter a valid 10-digit number"
            autoComplete="tel"
            required
          />
        </div>
        <div className="reg-field">
          <label htmlFor="email">Email (Hotel Contact Email)</label>
          <input
            type="email"
            id="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* Row 3: Password + Confirm Password */}
      <div className="reg-row">
        <div className="reg-field">
          <label htmlFor="password">Password</label>
          <div className="reg-pwd-wrap">
            <input
              type={showPwd ? 'text' : 'password'}
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <span
              className={`reg-eye-toggle fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`}
              onClick={() => setShowPwd((v) => !v)}
              role="button"
              aria-label="Toggle password visibility"
            />
          </div>
        </div>
        <div className="reg-field">
          <label htmlFor="confirm_password">Confirm Password</label>
          <div className="reg-pwd-wrap">
            <input
              type={showConfirmPwd ? 'text' : 'password'}
              id="confirm_password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <span
              className={`reg-eye-toggle fas ${showConfirmPwd ? 'fa-eye-slash' : 'fa-eye'}`}
              onClick={() => setShowConfirmPwd((v) => !v)}
              role="button"
              aria-label="Toggle confirm password visibility"
            />
          </div>
        </div>
      </div>

      {/* Row 4: Opening + Closing Time */}
      <div className="reg-row">
        <div className="reg-field">
          <label htmlFor="opening_time">Opening Time</label>
          <input
            type="time"
            id="opening_time"
            name="opening_time"
            value={form.opening_time}
            onChange={handleChange}
            required
          />
        </div>
        <div className="reg-field">
          <label htmlFor="closing_time">Closing Time</label>
          <input
            type="time"
            id="closing_time"
            name="closing_time"
            value={form.closing_time}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Row 5: Select Optional Features */}
      <div className="reg-row-full">
        <div className="reg-feature-box">
          <p className="reg-feature-title">Select Optional Features</p>
          <div className="reg-feature-grid">
            <label className="reg-feature-item" htmlFor="enable_housekeeping">
              <input
                type="checkbox"
                id="enable_housekeeping"
                name="enable_housekeeping"
                checked={form.enable_housekeeping}
                onChange={handleFeatureToggle}
              />
              <span>QR Housekeeping System</span>
            </label>

            <label className="reg-feature-item" htmlFor="enable_kds">
              <input
                type="checkbox"
                id="enable_kds"
                name="enable_kds"
                checked={form.enable_kds}
                onChange={handleFeatureToggle}
              />
              <span>Kitchen Display System</span>
            </label>

            <label className="reg-feature-item" htmlFor="enable_reports">
              <input
                type="checkbox"
                id="enable_reports"
                name="enable_reports"
                checked={form.enable_reports}
                onChange={handleFeatureToggle}
              />
              <span>Reports and Analytics</span>
            </label>

            <label className="reg-feature-item" htmlFor="enable_accountant">
              <input
                type="checkbox"
                id="enable_accountant"
                name="enable_accountant"
                checked={form.enable_accountant}
                onChange={handleFeatureToggle}
              />
              <span>Accountant Management</span>
            </label>

            <label className="reg-feature-item" htmlFor="enable_cashier">
              <input
                type="checkbox"
                id="enable_cashier"
                name="enable_cashier"
                checked={form.enable_cashier}
                onChange={handleFeatureToggle}
              />
              <span>Cashier Management</span>
            </label>
          </div>
        </div>
      </div>

      {/* Row 6: Logo Upload */}
      <div className="reg-row-full">
        <div className="reg-field">
          <label htmlFor="logo" className="reg-upload-label">
            Upload Logo
            <br />
            <span className="reg-upload-hint">
              (Upload A{' '}
              <a href="https://www.remove.bg" target="_blank" rel="noopener noreferrer">
                Background Removed
              </a>{' '}
              Logo Image Less Than 1MB)
            </span>
          </label>
          <input
            type="file"
            id="logo"
            name="logo"
            accept="image/*"
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Submit */}
      <button type="submit" className="reg-submit-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>

      <p className="reg-login-text">
        Already have an account?{' '}
        <a href="/login">Login here</a>
      </p>
    </form>
  );
};

export default RegisterForm;
