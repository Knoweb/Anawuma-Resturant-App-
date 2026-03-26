import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/apiClient';
import './Sidebar.css';

function Sidebar() {
  const location = useLocation();
  const { user, updateUser } = useAuthStore();
  const [menuStates, setMenuStates] = useState({
    menus: false,
    qrcodes: false,
    kitchen: false,
    housekeeping: false,
    offers: false,
    reports: false,
    settings: false
  });

  useEffect(() => {
    // If we're an admin/staff and don't have restaurant name/logo in the store, fetch it
    if (user && (user.role !== 'super_admin') && user.restaurantId && (!user.restaurantName || !user.restaurantLogo)) {
      apiClient.get(`/restaurant/${user.restaurantId}`)
        .then(response => {
          if (response.data && response.data.success) {
            const restaurant = response.data.data;
            updateUser({
              restaurantName: restaurant.restaurantName,
              restaurantLogo: restaurant.logo
            });
          }
        })
        .catch(err => console.error('Error fetching restaurant info for sidebar:', err));
    }
  }, [user, updateUser]);

  const toggleMenu = (menuName) => {
    setMenuStates(prev => {
      const nextState = { ...prev };
      const isCurrentlyOpen = prev[menuName];

      // Close all menus first
      Object.keys(nextState).forEach(key => {
        nextState[key] = false;
      });

      // Toggle the targeted menu
      nextState[menuName] = !isCurrentlyOpen;
      return nextState;
    });
  };

  const closeSubmenus = () => {
    setMenuStates({
      menus: false,
      qrcodes: false,
      kitchen: false,
      housekeeping: false,
      offers: false,
      reports: false,
      settings: false
    });
  };

  const closeSidebar = () => {
    document.body.classList.remove('sb-sidenav-toggled');
  };

  useEffect(() => {
    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;

    const handleSidebarClick = (event) => {
      if (!event.target.closest('a')) return;
      if (window.innerWidth < 992) {
        closeSidebar();
      }
    };

    sidebarEl.addEventListener('click', handleSidebarClick);
    return () => {
      sidebarEl.removeEventListener('click', handleSidebarClick);
    };
  }, []);

  const isActive = (path, exact = true) => {
    if (exact) {
      return location.pathname === path && !location.search ? 'active' : '';
    }
    return location.pathname === path ? 'active' : '';
  };

  const isQueryActive = (path, search) => {
    return location.pathname === path && location.search === search ? 'active' : '';
  };

  const isCashierTabActive = (tab) => {
    return location.pathname === `/cashier/dashboard/${tab}` ? 'active' : '';
  };

  // Role-based permissions
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isKitchen = user?.role === 'kitchen';
  const isCashier = user?.role === 'cashier';
  const isAccountant = user?.role === 'accountant';
  const isHousekeeper = user?.role === 'housekeeper';

  // Restaurant feature flags
  const restaurantSettings = user?.restaurantSettings || {};
  const isHousekeepingEnabled = restaurantSettings.enableHousekeeping == null || Boolean(restaurantSettings.enableHousekeeping);
  const isKdsEnabled = restaurantSettings.enableKds == null || Boolean(restaurantSettings.enableKds);
  const isReportsEnabled = restaurantSettings.enableReports == null || Boolean(restaurantSettings.enableReports);
  const isAccountantEnabled = restaurantSettings.enableAccountant == null || Boolean(restaurantSettings.enableAccountant);
  const isCashierEnabled = restaurantSettings.enableCashier == null || Boolean(restaurantSettings.enableCashier);

  // Permission helpers
  const canAccessAdminFeatures = isSuperAdmin || isAdmin;
  const canAccessKitchen = (isSuperAdmin || isAdmin || isKitchen) && isKdsEnabled;
  const canAccessKitchenDashboard = (isKitchen || isSuperAdmin) && isKdsEnabled;
  const canAccessCashierDashboard = isCashier && isCashierEnabled;
  const canAccessAccountantDashboard = (isAccountant || isSuperAdmin || isAdmin) && isAccountantEnabled;
  const canAccessHousekeeping = (isSuperAdmin || isAdmin || isHousekeeper) && isHousekeepingEnabled;
  const canAccessReports = (canAccessAdminFeatures || isAccountant) && isReportsEnabled;
  const dashboardPath = isKitchen
    ? '/kitchen/dashboard'
    : isCashier
      ? '/cashier/dashboard/queue'
      : isAccountant
        ? '/accountant/dashboard'
        : '/dashboard';

  return (
    <>
      <div className="sidebar" id="sidebar">
        <ul className="sidebar-menu">
          {/* Menus Section - Admin Only */}
          {canAccessAdminFeatures && (
            <li className={`has-submenu ${menuStates.menus ? 'open' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); toggleMenu('menus'); }}>
                <i className="fas fa-bars"></i>
                <span>Menus</span>
                <i className={`fas fa-chevron-${menuStates.menus ? 'down' : 'right'} submenu-arrow`}></i>
              </a>
              <ul className="submenu" style={{ display: menuStates.menus ? 'block' : 'none' }}>
                <li className={isActive('/menus/all', true)}>
                  <Link to="/menus/all">
                    All Menus
                  </Link>
                </li>
                <li className={isQueryActive('/menus/all', '?add=true')}>
                  <Link to="/menus/all?add=true">
                    Add Menu
                  </Link>
                </li>
                <li className={isQueryActive('/menus/categories', '?add=true')}>
                  <Link to="/menus/categories?add=true">
                    Add Category
                  </Link>
                </li>
                <li className={isQueryActive('/menus/subcategories', '?add=true')}>
                  <Link to="/menus/subcategories?add=true">
                    Add Subcategories
                  </Link>
                </li>
                <li className={isQueryActive('/menus/food-items', '?add=true')}>
                  <Link to="/menus/food-items?add=true">
                    Add Food Items
                  </Link>
                </li>
              </ul>
            </li>
          )}

          {!isCashier && !isAccountant && (
            <li className={isActive(dashboardPath)}>
              <Link to={dashboardPath} onClick={closeSubmenus}>
                <i className="fas fa-home"></i>
                <span>Dashboard</span>
              </Link>
            </li>
          )}

          {canAccessCashierDashboard && (
            <>
              <li className={isCashierTabActive('queue')}>
                <Link to="/cashier/dashboard/queue" onClick={closeSubmenus}>
                  <i className="fas fa-cash-register"></i>
                  <span>Cashier Queue</span>
                </Link>
              </li>
              <li className={isCashierTabActive('transfers')}>
                <Link to="/cashier/dashboard/transfers" onClick={closeSubmenus}>
                  <i className="fas fa-share-square"></i>
                  <span>Accountant Transfers</span>
                </Link>
              </li>
              <li className={isCashierTabActive('history')}>
                <Link to="/cashier/dashboard/history" onClick={closeSubmenus}>
                  <i className="fas fa-history"></i>
                  <span>Invoice History</span>
                </Link>
              </li>
            </>
          )}



          {/* Offers Section - Admin Only */}
          {canAccessAdminFeatures && (
            <li className={`has-submenu ${menuStates.offers ? 'open' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); toggleMenu('offers'); }}>
                <i className="fas fa-tag"></i>
                <span>Offers</span>
                <i className={`fas fa-chevron-${menuStates.offers ? 'down' : 'right'} submenu-arrow`}></i>
              </a>
              <ul className="submenu" style={{ display: menuStates.offers ? 'block' : 'none' }}>
                <li className={isActive('/offers/add')}>
                  <Link to="/offers/add">
                    <i className="fas fa-plus-circle"></i>
                    Add New Offer
                  </Link>
                </li>
                <li className={isActive('/menus/offers')}>
                  <Link to="/menus/offers">
                    <i className="fas fa-list"></i>
                    Manage Offers
                  </Link>
                </li>
              </ul>
            </li>
          )}

          {/* QR Codes Section - Admin Only */}
          {canAccessAdminFeatures && (
            <li className={isActive('/qr-codes/generate')}>
              <Link to="/qr-codes/generate" onClick={closeSubmenus}>
                <i className="fas fa-qrcode"></i>
                <span>QR Codes</span>
              </Link>
            </li>
          )}

          {/* Kitchen Section - Kitchen Staff + Admin */}
          {canAccessKitchen && (
            <li className={`has-submenu ${menuStates.kitchen ? 'open' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); toggleMenu('kitchen'); }}>
                <i className="fas fa-fire"></i>
                <span>Kitchen</span>
                <i className={`fas fa-chevron-${menuStates.kitchen ? 'down' : 'right'} submenu-arrow`}></i>
              </a>
              <ul className="submenu" style={{ display: menuStates.kitchen ? 'block' : 'none' }}>
                {canAccessKitchenDashboard && (
                  <li className={isActive('/kitchen/dashboard')}>
                    <Link to="/kitchen/dashboard">
                      <i className="fas fa-tachometer-alt"></i>
                      Kitchen Dashboard
                    </Link>
                  </li>
                )}
                <li className={isActive('/kitchen/kds')}>
                  <Link to="/kitchen/kds">
                    <i className="fas fa-chart-line"></i>
                    Kitchen KDS
                  </Link>
                </li>
                <li className={isActive('/kitchen/orders')}>
                  <Link to="/kitchen/orders">
                    <i className="fas fa-clipboard-list"></i>
                    Active Orders
                  </Link>
                </li>
                <li className={isActive('/kitchen/history')}>
                  <Link to="/kitchen/history">
                    <i className="fas fa-history"></i>
                    Order History
                  </Link>
                </li>
                <li className={isActive('/orders/manage')}>
                  <Link to="/orders/manage">
                    <i className="fas fa-tasks"></i>
                    Order Management
                  </Link>
                </li>
              </ul>
            </li>
          )}

          {/* Housekeeping Section - Housekeepers + Admin */}
          {canAccessHousekeeping && (
            <li className={`has-submenu ${menuStates.housekeeping ? 'open' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); toggleMenu('housekeeping'); }}>
                <i className="fas fa-concierge-bell"></i>
                <span>Room Orders</span>
                <i className={`fas fa-chevron-${menuStates.housekeeping ? 'down' : 'right'} submenu-arrow`}></i>
              </a>
              <ul className="submenu" style={{ display: menuStates.housekeeping ? 'block' : 'none' }}>
                <li className={isActive('/housekeeping/messages')}>
                  <Link to="/housekeeping/messages">
                    <i className="fas fa-envelope"></i>
                    Messages
                  </Link>
                </li>
                <li className={isActive('/housekeeping/room-qr')}>
                  <Link to="/housekeeping/room-qr">
                    <i className="fas fa-qrcode"></i>
                    All Room QR codes
                  </Link>
                </li>
                <li className={isActive('/housekeeping/room-qr/generate')}>
                  <Link to="/housekeeping/room-qr/generate">
                    <i className="fas fa-plus-circle"></i>
                    Generate Room QR Codes
                  </Link>
                </li>
              </ul>
            </li>
          )}

          {/* Accountant Dashboard Link */}
          {canAccessAccountantDashboard && (
            <li className={isActive('/accountant/dashboard')}>
              <Link to="/accountant/dashboard" onClick={closeSubmenus}>
                <i className="fas fa-calculator"></i>
                <span>Accountant Dashboard</span>
              </Link>
            </li>
          )}

          {/* Reports Section - Admin + Accountant */}
          {canAccessReports && (
            <li className={`has-submenu ${menuStates.reports ? 'open' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); toggleMenu('reports'); }}>
                <i className="fas fa-chart-bar"></i>
                <span>Reports</span>
                <i className={`fas fa-chevron-${menuStates.reports ? 'down' : 'right'} submenu-arrow`}></i>
              </a>
              <ul className="submenu" style={{ display: menuStates.reports ? 'block' : 'none' }}>
                <li className={isActive('/reports/daily')}>
                  <Link to="/reports/daily">
                    <i className="fas fa-calendar-day"></i>
                    Daily Report
                  </Link>
                </li>
                <li className={isActive('/reports/monthly')}>
                  <Link to="/reports/monthly">
                    <i className="fas fa-calendar-alt"></i>
                    Monthly Report
                  </Link>
                </li>
                <li className={isActive('/reports/sales')}>
                  <Link to="/reports/sales">
                    <i className="fas fa-dollar-sign"></i>
                    Sales Report
                  </Link>
                </li>
              </ul>
            </li>
          )}



          {/* Super Admin Only */}
          {isSuperAdmin && (
            <>
              <li className={isActive('/restaurants')}>
                <Link to="/restaurants" onClick={closeSubmenus}>
                  <i className="fas fa-building"></i>
                  <span>Restaurants</span>
                </Link>
              </li>
              <li className={isActive('/admins')}>
                <Link to="/admins" onClick={closeSubmenus}>
                  <i className="fas fa-user-shield"></i>
                  <span>Admins</span>
                </Link>
              </li>
            </>
          )}

          {canAccessAdminFeatures && (
            <li className={isActive('/settings/restaurant')}>
              <Link to="/settings/restaurant" onClick={closeSubmenus}>
                <i className="fas fa-cog"></i>
                <span>Restaurant Settings</span>
              </Link>
            </li>
          )}

          {/* Settings */}
          <li className={`has-submenu ${menuStates.settings ? 'open' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); toggleMenu('settings'); }}>
              <i className="fas fa-user-cog"></i>
              <span>User Settings</span>
              <i className={`fas fa-chevron-${menuStates.settings ? 'down' : 'right'} submenu-arrow`}></i>
            </a>
            <ul className="submenu" style={{ display: menuStates.settings ? 'block' : 'none' }}>
              <li className={isActive('/settings/profile')}>
                <Link to="/settings/profile">
                  <i className="fas fa-user"></i>
                  Profile
                </Link>
              </li>
              <li className={isActive('/settings/password')}>
                <Link to="/settings/password">
                  <i className="fas fa-key"></i>
                  Change Password
                </Link>
              </li>
            </ul>
          </li>

          {isAdmin && (
            <li className={isActive('/my-hotel')}>
              <Link to="/my-hotel" onClick={closeSubmenus}>
                <i className="fas fa-hotel"></i>
                <span>Hotel Profile</span>
              </Link>
            </li>
          )}
        </ul>
      </div>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Close sidebar"
        onClick={closeSidebar}
      />
    </>
  );
}

export default Sidebar;
