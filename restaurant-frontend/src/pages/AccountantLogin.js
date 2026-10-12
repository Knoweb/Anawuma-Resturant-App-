import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/apiClient';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import { AccountantSvg } from '../components/icons/RoleLoginIcons';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './RoleLogin.css';

function AccountantLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, updateUser } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please enter both email and password.' });
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(email, password);

      if (response?.data?.success) {
        const { access_token, user } = response.data.data;

        if (!user || !access_token) {
          throw new Error('Invalid login response from server.');
        }

        const role = user.role?.toString().trim().toLowerCase();
        if (role !== 'accountant') {
          Swal.fire({ icon: 'error', title: 'Access Denied', text: 'This login is for Accountant users only.' });
          return;
        }

        login(user, access_token);

        try {
          const profileRes = await apiClient.get('/auth/profile', {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          if (profileRes?.data?.data) {
            updateUser(profileRes.data.data);
          }
        } catch (_) {
          // Non-fatal
        }

        Swal.fire({
          icon: 'success',
          title: 'Welcome Back, Accountant!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
          didClose: () => {
            window.location.href = '/accountant/dashboard';
          },
        });
      } else {
        Swal.fire({ icon: 'error', title: 'Login Failed', text: response?.data?.message || 'Invalid credentials.' });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error?.response?.data?.message ||
          error?.message ||
          'Failed to login. Please check your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-login-page theme-accountant">
      {/* Background Ambience */}
      <div className="role-bg-orb role-bg-orb-1"></div>
      <div className="role-bg-orb role-bg-orb-2"></div>
      <div className="role-grid-overlay"></div>

      {/* Brand Header */}
      <Link to="/" className="role-header-brand" title="Back to Home">
        <img src="/assets/images/logos/logo-rmbg-2.png" alt="Anawuma" />
      </Link>

      {/* Main Glass Card */}
      <div className="role-card">
        <div className="text-center">
          <div className="role-icon-hero">
            <div className="role-icon-circle">
              <AccountantSvg />
            </div>
          </div>
          <span className="role-badge">Finance & Audit Portal</span>
          <h2 className="role-title">Accountant Login</h2>
          <p className="role-subtitle">Sign in to review financial records and transfers</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="role-field">
            <label className="role-label">Accountant Email</label>
            <div className="role-input-wrap">
              <input
                className="role-input"
                type="email"
                placeholder="accountant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
              <i className="fas fa-envelope role-input-icon"></i>
            </div>
          </div>

          <div className="role-field">
            <label className="role-label">Password</label>
            <div className="role-input-wrap">
              <input
                className="role-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <i className="fas fa-lock role-input-icon"></i>
              <button
                type="button"
                className="role-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
              </button>
            </div>
          </div>

          <button className="role-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Enter Finance Desk</span>
                <i className="fas fa-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        <div className="role-footer-links">
          <Link to="/" className="role-footer-link">
            <i className="fas fa-arrow-left"></i> Home
          </Link>
          <a href="/login" className="role-footer-link highlight">
            Admin Login <i className="fas fa-external-link-alt"></i>
          </a>
        </div>
      </div>
    </div>
  );
}

export default AccountantLogin;
