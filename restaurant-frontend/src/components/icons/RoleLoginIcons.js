import React from 'react';

// Clean, Professional SVG Icons styled with #235F61 brand palette

// Cashier POS Register Illustration
export const CashierSvg = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="8" width="36" height="26" rx="4" fill="#235F61" />
    <rect x="10" y="12" width="28" height="18" rx="2" fill="#2d787a" />
    {/* Screen details */}
    <rect x="14" y="16" width="12" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.9" />
    <rect x="14" y="21" width="18" height="2.5" rx="1.25" fill="#ffffff" fillOpacity="0.6" />
    <circle cx="33" cy="17" r="2" fill="#ffffff" fillOpacity="0.9" />
    {/* Stand & Base */}
    <path d="M20 34L17 40H31L28 34" fill="#1b4b4d" />
    <rect x="12" y="40" width="24" height="3" rx="1.5" fill="#235F61" />
  </svg>
);

// Kitchen Chef Cloche & Flame Illustration
export const KitchenSvg = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Platter Base */}
    <rect x="6" y="38" width="36" height="3.5" rx="1.75" fill="#1b4b4d" />
    <path d="M10 38H38C38 38 36 34 24 34C12 34 10 38 10 38Z" fill="#235F61" />
    {/* Cloche Dome */}
    <path d="M12 34C12 23 17 18 24 18C31 18 36 23 36 34H12Z" fill="#2d787a" />
    <circle cx="24" cy="16" r="3" fill="#1b4b4d" />
    {/* Warm Steam Aroma lines */}
    <path d="M20 10C20 8 22 7 22 5" stroke="#235F61" strokeWidth="2" strokeLinecap="round" />
    <path d="M28 10C28 8 26 7 26 5" stroke="#235F61" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Accountant Financial Analytics Illustration
export const AccountantSvg = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Card Sheet */}
    <rect x="8" y="6" width="32" height="36" rx="4" fill="#1b4b4d" />
    <rect x="11" y="9" width="26" height="30" rx="3" fill="#ffffff" />
    {/* Header line */}
    <rect x="15" y="14" width="12" height="2.5" rx="1" fill="#235F61" />
    {/* Chart Bars */}
    <rect x="15" y="27" width="4" height="8" rx="1" fill="#5ba6a8" />
    <rect x="22" y="21" width="4" height="14" rx="1" fill="#2d787a" />
    <rect x="29" y="16" width="4" height="19" rx="1" fill="#235F61" />
    {/* Baseline */}
    <line x1="13" y1="36" x2="35" y2="36" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
