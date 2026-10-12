import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { sanitizeUrl } from '../../api/apiClient';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobilePortalsOpen, setMobilePortalsOpen] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();

  // Scroll listener for sticky header styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Close menu on route change or ESC key
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-close drawer if screen is resized to desktop width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991 && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [menuOpen]);

  const isActive = (path) => {
    if (path.startsWith('/#')) {
      return location.pathname === '/' && location.hash === path.replace('/', '');
    }
    return location.pathname === path;
  };

  const portalLinks = [
    { to: '/dashboard', label: 'Restaurant Admin', icon: 'fa-utensils', badge: 'Admin' },
    { to: '/super-admin/login', label: 'Super Admin', icon: 'fa-user-shield', badge: 'Root' },
    { to: '/kitchen-login', label: 'Kitchen Login', icon: 'fa-fire', badge: 'KDS' },
    { to: '/cashier-login', label: 'Cashier Login', icon: 'fa-cash-register', badge: 'POS' },
    { to: '/accountant-login', label: 'Accountant Login', icon: 'fa-file-invoice-dollar', badge: 'Finance' },
    { to: '/housekeeper', label: 'HouseKeeper Login', icon: 'fa-broom', badge: 'Staff' },
  ];

  return (
    <header className={`landing-header${scrolled ? ' scrolled' : ''}`}>
      <div className="landing-container">
        <nav className="landing-nav">
          {/* Logo */}
          <Link to="/" className="landing-logo" onClick={() => setMenuOpen(false)}>
            <img src="/assets/images/logos/logo-rmbg-2.png" alt="Anawuma" />
          </Link>

          {/* Desktop Nav Links (Hidden on Tablet / Mobile) */}
          <ul className="nav-links desktop-only">
            <li>
              <a href="/#home" className={isActive('/#home') ? 'active-link' : ''}>Home</a>
            </li>
            <li>
              <a href="/#features" className={isActive('/#features') ? 'active-link' : ''}>Features</a>
            </li>
            <li>
              <Link to="/pricing" className={isActive('/pricing') ? 'active-link' : ''}>Pricing</Link>
            </li>
            <li>
              <Link to="/about" className={isActive('/about') ? 'active-link' : ''}>About</Link>
            </li>
            <li>
              <Link to="/blog" className={isActive('/blog') ? 'active-link' : ''}>Blogs</Link>
            </li>
            <li>
              <Link to="/contact" className={isActive('/contact') ? 'active-link' : ''}>Contact</Link>
            </li>

            {/* Desktop More Dropdown */}
            <li
              className="dropdown-parent"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button
                type="button"
                className="dropdown-toggle-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setMoreOpen(prev => !prev);
                }}
              >
                More <i className={`fas fa-chevron-down${moreOpen ? ' rotated' : ''}`}></i>
              </button>
              {moreOpen && (
                <ul className="dropdown-menu-custom">
                  {portalLinks.map(portal => (
                    <li key={portal.to}>
                      <Link to={portal.to} onClick={() => setMoreOpen(false)}>
                        <i className={`fas ${portal.icon} portal-icon-desktop`}></i>
                        <span>{portal.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>

          {/* Desktop CTA Buttons (Hidden on Tablet / Mobile) */}
          <div className="nav-cta desktop-only">
            {user ? (
              <div className="nav-user-info">
                <Link to="/my-hotel" className="nav-restaurant-name">
                  {user.restaurantName || 'My Hotel'}
                </Link>
                <div className="nav-user-avatar">
                  {user.restaurantLogo ? (
                    <img src={sanitizeUrl(user.restaurantLogo)} alt="Restaurant Logo" />
                  ) : (
                    <i className="fas fa-store"></i>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/register" className="nav-link-register">
                  Register Restaurant <i className="fas fa-arrow-right"></i>
                </Link>
                <Link to="/login" className="nav-btn-login">
                  Restaurant Login <i className="fas fa-lock"></i>
                </Link>
              </>
            )}
          </div>

          {/* Hamburger Button (Visible on Tablet / Mobile) */}
          <button
            className={`hamburger${menuOpen ? ' active' : ''}`}
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </nav>
      </div>
    </header>

    {/* ===================================== */}
    {/* MOBILE & TABLET DRAWER OVERLAY       */}
    {/* Rendered into body via createPortal   */}
    {/* to avoid header backdrop-filter clip */}
    {/* ===================================== */}
    {typeof document !== 'undefined' && createPortal(
      <>
        <div
          className={`nav-drawer-backdrop${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden={!menuOpen}
        />

        <aside
          className={`nav-drawer${menuOpen ? ' open' : ''}`}
          aria-hidden={!menuOpen}
        >
          {/* Drawer Header */}
          <div className="nav-drawer-header">
            <Link to="/" className="drawer-logo" onClick={() => setMenuOpen(false)}>
              <img src="/assets/images/logos/logo-rmbg-2.png" alt="Anawuma" />
            </Link>
            <button
              type="button"
              className="nav-drawer-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="nav-drawer-content">
            {/* Main Navigation Links */}
            <div className="drawer-section">
              <span className="drawer-section-title">Navigation</span>
              <ul className="drawer-nav-list">
                <li>
                  <a href="/#home" onClick={() => setMenuOpen(false)} className={isActive('/#home') ? 'active-drawer-link' : ''}>
                    <i className="fas fa-home"></i>
                    <span>Home</span>
                  </a>
                </li>
                <li>
                  <a href="/#features" onClick={() => setMenuOpen(false)} className={isActive('/#features') ? 'active-drawer-link' : ''}>
                    <i className="fas fa-layer-group"></i>
                    <span>Features</span>
                  </a>
                </li>
                <li>
                  <Link to="/pricing" onClick={() => setMenuOpen(false)} className={isActive('/pricing') ? 'active-drawer-link' : ''}>
                    <i className="fas fa-tags"></i>
                    <span>Pricing</span>
                  </Link>
                </li>
                <li>
                  <Link to="/about" onClick={() => setMenuOpen(false)} className={isActive('/about') ? 'active-drawer-link' : ''}>
                    <i className="fas fa-info-circle"></i>
                    <span>About</span>
                  </Link>
                </li>
                <li>
                  <Link to="/blog" onClick={() => setMenuOpen(false)} className={isActive('/blog') ? 'active-drawer-link' : ''}>
                    <i className="fas fa-newspaper"></i>
                    <span>Blogs</span>
                  </Link>
                </li>
                <li>
                  <Link to="/contact" onClick={() => setMenuOpen(false)} className={isActive('/contact') ? 'active-drawer-link' : ''}>
                    <i className="fas fa-envelope"></i>
                    <span>Contact</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Portals & Logins Section */}
            <div className="drawer-section">
              <button
                type="button"
                className="drawer-accordion-btn"
                onClick={() => setMobilePortalsOpen(prev => !prev)}
              >
                <div className="accordion-label-group">
                  <i className="fas fa-th-large"></i>
                  <span>Portals & Staff Logins</span>
                  <span className="portal-badge-count">{portalLinks.length}</span>
                </div>
                <i className={`fas fa-chevron-down accordion-arrow${mobilePortalsOpen ? ' rotated' : ''}`}></i>
              </button>

              <div className={`drawer-portals-grid${mobilePortalsOpen ? ' open' : ''}`}>
                {portalLinks.map(portal => (
                  <Link
                    key={portal.to}
                    to={portal.to}
                    className="drawer-portal-card"
                    onClick={() => setMenuOpen(false)}
                  >
                    <div className="portal-card-icon-wrap">
                      <i className={`fas ${portal.icon}`}></i>
                    </div>
                    <div className="portal-card-info">
                      <span className="portal-card-title">{portal.label}</span>
                      <span className="portal-card-badge">{portal.badge}</span>
                    </div>
                    <i className="fas fa-arrow-right portal-card-arrow"></i>
                  </Link>
                ))}
              </div>
            </div>

            {/* Auth / Action Section */}
            <div className="drawer-section drawer-cta-section">
              {user ? (
                <div className="drawer-user-box">
                  <div className="drawer-user-info">
                    <div className="drawer-user-avatar">
                      {user.restaurantLogo ? (
                        <img src={sanitizeUrl(user.restaurantLogo)} alt="Restaurant Logo" />
                      ) : (
                        <i className="fas fa-store"></i>
                      )}
                    </div>
                    <div className="drawer-user-meta">
                      <span className="drawer-user-name">{user.restaurantName || 'My Hotel'}</span>
                      <span className="drawer-user-role">{user.role || 'Administrator'}</span>
                    </div>
                  </div>
                  <Link to="/my-hotel" className="drawer-btn-hotel" onClick={() => setMenuOpen(false)}>
                    Manage Hotel <i className="fas fa-cog"></i>
                  </Link>
                </div>
              ) : (
                <div className="drawer-auth-buttons">
                  <Link to="/register" className="drawer-btn-register" onClick={() => setMenuOpen(false)}>
                    <span>Register Restaurant</span>
                    <i className="fas fa-arrow-right"></i>
                  </Link>
                  <Link to="/login" className="drawer-btn-login" onClick={() => setMenuOpen(false)}>
                    <i className="fas fa-lock"></i>
                    <span>Restaurant Login</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="nav-drawer-footer">
            <p>© {new Date().getFullYear()} Anawuma. Cloud Restaurant POS.</p>
          </div>
        </aside>
      </>,
      document.body
    )}
  </>
  );
};

export default Navbar;
