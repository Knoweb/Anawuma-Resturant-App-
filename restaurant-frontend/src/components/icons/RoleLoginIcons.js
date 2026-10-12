import React from 'react';

// Cashier POS Register Illustration
export const CashierSvg = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* POS Monitor Base & Stand */}
    <path d="M18 40H30" stroke="#5fe1d3" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M24 34V40" stroke="#5fe1d3" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Main Terminal Screen */}
    <rect x="7" y="10" width="34" height="24" rx="4" fill="#133638" stroke="#5fe1d3" strokeWidth="2.2" />
    <rect x="11" y="14" width="26" height="16" rx="2" fill="#1c484a" />
    
    {/* Receipt / Scanner Light Line */}
    <line x1="14" y1="18" x2="26" y2="18" stroke="#2da195" strokeWidth="2" strokeLinecap="round" />
    <line x1="14" y1="22" x2="32" y2="22" stroke="#5fe1d3" strokeWidth="2" strokeLinecap="round" />
    <line x1="14" y1="26" x2="22" y2="26" stroke="#2da195" strokeWidth="2" strokeLinecap="round" />
    
    {/* Success / Coin Indicator Badge */}
    <circle cx="36" cy="11" r="5" fill="#2da195" stroke="#112d2e" strokeWidth="2" />
    <path d="M34.5 11L35.5 12.2L37.8 9.8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Kitchen Chef Flame / Cloche Illustration
export const KitchenSvg = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Hot Pan / Plate Base */}
    <path d="M8 35C8 35 12 39 24 39C36 39 40 35 40 35" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="6" y1="41" x2="42" y2="41" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
    
    {/* Cloche Dome */}
    <path d="M10 32C10 24 16 18 24 18C32 18 38 24 38 32H10Z" fill="#3b1703" stroke="#fdba74" strokeWidth="2.2" strokeLinejoin="round" />
    
    {/* Dome Handle */}
    <ellipse cx="24" cy="16" rx="3.5" ry="2.5" fill="#f97316" stroke="#fdba74" strokeWidth="1.5" />
    
    {/* Vibrant Fire Flame rising */}
    <path 
      d="M24 6C24 6 20 10 20 13C20 15.2 21.8 17 24 17C26.2 17 28 15.2 28 13C28 10 24 6 24 6Z" 
      fill="url(#kitchenFlameGrad)" 
    />
    <defs>
      <linearGradient id="kitchenFlameGrad" x1="24" y1="6" x2="24" y2="17" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fbbf24" />
        <stop offset="1" stopColor="#ea580c" />
      </linearGradient>
    </defs>
  </svg>
);

// Accountant Ledger / Analytics Illustration
export const AccountantSvg = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ledger / Document Shield Backplate */}
    <rect x="9" y="8" width="30" height="34" rx="4" fill="#0d253f" stroke="#60a5fa" strokeWidth="2.2" />
    
    {/* Chart Bars */}
    <rect x="14" y="28" width="4" height="8" rx="1" fill="#3b82f6" />
    <rect x="22" y="22" width="4" height="14" rx="1" fill="#60a5fa" />
    <rect x="30" y="16" width="4" height="20" rx="1" fill="#93c5fd" />
    
    {/* Trend Line with Arrow */}
    <path d="M14 24L22 18L30 13L35 15" stroke="#bfdbfe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Currency / Finance Pill Icon */}
    <circle cx="36" cy="38" r="6" fill="#2563eb" stroke="#071320" strokeWidth="2" />
    <path d="M36 34.5V41.5M34.5 36H37.2C37.8 36 38.2 36.4 38.2 37C38.2 37.6 37.8 38 37.2 38H34.8C34.2 38 33.8 38.4 33.8 39C33.8 39.6 34.2 40 34.8 40H37.5" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
