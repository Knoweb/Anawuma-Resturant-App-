import React, { useState } from 'react';
import { authAPI } from '../api/apiClient';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './SuperAdminLogin.css';

function CashierLogin() {
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
        if (role !== 'cashier') {
          Swal.fire({ icon: 'error', title: 'Access Denied', text: 'This login is for Cashier users only.' });
          return;
        }

        login(user, access_token);

        // Fetch profile to include restaurant settings/context in the auth store.
        try {
          const profileRes = await apiClient.get('/auth/profile', {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          if (profileRes?.data?.data) {
            updateUser(profileRes.data.data);
          }
        } catch (_) {
          // Non-fatal fallback
        }

        Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
          didClose: () => {
            window.location.href = '/cashier/dashboard/queue';
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
    <div className="sa-login-page">
      <div className="sa-logo">
        <img src="/assets/images/logos/logo-rmbg-2.png" alt="Anawuma" />
      </div>

      <div className="sa-deco sa-deco-1"></div>
      <div className="sa-deco sa-deco-2"></div>
      <div className="sa-deco sa-deco-3"></div>
      <div className="sa-deco sa-deco-4"></div>
      <div className="sa-deco sa-deco-5"></div>
      <div className="sa-deco sa-deco-6"></div>

      <div className="sa-card">
        <h2 className="sa-card-title">Cashier Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            className="sa-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <div className="sa-password-wrap">
            <input
              className="sa-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="sa-toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
            </button>
          </div>

          <button className="sa-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="sa-back-link">
          Restaurant login? <a href="/login">Click here</a>
        </p>
      </div>
    </div>
  );
}

export default CashierLogin;
