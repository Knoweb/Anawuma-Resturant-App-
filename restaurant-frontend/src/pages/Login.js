import React, { useState } from 'react';
import { authAPI } from '../api/apiClient';
import { useAuthStore } from '../store/authStore';
import Swal from 'sweetalert2';
import Navbar from '../components/landing/Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuthStore();

  const getRedirectPathByRole = (role) => {
    const normalizedRole = role?.toString().trim().toLowerCase();

    switch (normalizedRole) {
      case 'super_admin':
      case 'superadmin':
        return '/super-admin/manage-restaurants';

      case 'kitchen':
        return '/kitchen/dashboard';

      case 'cashier':
        return '/cashier/dashboard/queue';

      case 'accountant':
        return '/accountant/dashboard';

      case 'admin':
        return '/my-hotel';

      case 'housekeeper':
      case 'manager':
      case 'staff':
        return '/dashboard';

      default:
        return '/dashboard';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please enter both email and password.'
      });
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

        // Restrict this login page to Restaurant Admins only
        const normalizedRole = user.role?.toString().trim().toLowerCase();
        if (normalizedRole !== 'admin') {
          // Show error and do NOT log them in
          const roleLoginPages = {
            'cashier': '/cashier/login',
            'kitchen': '/kitchen/login',
            'accountant': '/accountant/login',
            'super_admin': '/super-admin/login',
            'superadmin': '/super-admin/login',
          };
          const correctPage = roleLoginPages[normalizedRole] || '/login';
          Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            html: `This login page is for <strong>Restaurant Admins only</strong>.<br/>Please use your designated login page.${correctPage !== '/login' ? `<br/><a href="${correctPage}" style="color:#004FEB;">Go to your login page →</a>` : ''}`,
          });
          return;
        }

        login(user, access_token);

        const authStorageData = {
          state: {
            user: user,
            token: access_token,
            isAuthenticated: true
          },
          version: 0
        };

        localStorage.setItem('auth-storage', JSON.stringify(authStorageData));

        Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
          didClose: () => {
            window.location.href = '/my-hotel';
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: response?.data?.message || 'Invalid credentials.'
        });
      }
    } catch (error) {
      console.error('Login error:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error?.response?.data?.message ||
          error?.message ||
          'Failed to login. Please check your credentials.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="login-page">
        <div className="container">
          <div className="row mb-5 justify-content-center text-center">
            <div className="col-lg-8">
              <span className="login-badge">Welcome Back</span>
              <h1 className="login-heading mb-0">Login to Your Hotel / Restaurant Account</h1>
            </div>
          </div>

          <div className="row align-items-center login-row">
            {/* Left: illustration */}
            <div className="col-lg-6 login-left text-center">
              <div className="login-illustration">
                <img
                  src="/assets/images/features/20824342_6343845.jpg"
                  alt="Login illustration"
                />
              </div>
            </div>

            {/* Right: form */}
            <div className="col-lg-6">
              <div className="login-form-wrap">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <input
                      className="login-input"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4 password-wrap">
                    <input
                      className="login-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                    </button>
                  </div>

                  <button className="login-btn" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </button>
                </form>

                <p className="mt-3 login-register-text">
                  Don't have an account?{' '}
                  <a href="/register" className="register-link">Register here</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;