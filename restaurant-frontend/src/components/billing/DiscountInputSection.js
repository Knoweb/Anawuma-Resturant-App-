import React, { useState, useEffect, useMemo } from 'react';

export const DISCOUNT_TYPES = {
  NONE: 'NONE',
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
};

export const DISCOUNT_REASONS = [
  'VIP Guest',
  'Promotion / Offer',
  'Staff / Owner Discretion',
  'Courtesy / Complaint',
  'Loyal Customer',
  'Other',
];

/**
 * Single Source of Truth calculation engine for final bill calculations.
 * Gross Total = Subtotal + Service Charge (10%).
 * Discount is applied to the Gross Total.
 */
export const calculateDiscountBreakdown = ({
  subtotal = 0,
  serviceCharge = 0,
  discountType = DISCOUNT_TYPES.NONE,
  discountValue = 0,
}) => {
  const safeSubtotal = Number(Math.max(0, Number(subtotal) || 0).toFixed(2));
  const safeServiceCharge = Number(Math.max(0, Number(serviceCharge) || 0).toFixed(2));
  const grossTotal = Number((safeSubtotal + safeServiceCharge).toFixed(2));

  const safeDiscountVal = Number(Math.max(0, Number(discountValue) || 0));
  let discountAmount = 0;
  const normalizedType = [DISCOUNT_TYPES.PERCENTAGE, DISCOUNT_TYPES.FIXED].includes(discountType)
    ? discountType
    : DISCOUNT_TYPES.NONE;

  if (normalizedType === DISCOUNT_TYPES.PERCENTAGE) {
    const percentage = Math.min(100, safeDiscountVal);
    discountAmount = Number(((grossTotal * percentage) / 100).toFixed(2));
  } else if (normalizedType === DISCOUNT_TYPES.FIXED) {
    discountAmount = Number(Math.min(grossTotal, safeDiscountVal).toFixed(2));
  } else {
    discountAmount = 0;
  }

  const totalAmount = Number(Math.max(0, grossTotal - discountAmount).toFixed(2));

  return {
    subtotal: safeSubtotal,
    serviceCharge: safeServiceCharge,
    grossTotal,
    discountType: normalizedType,
    discountValue: safeDiscountVal,
    discountAmount,
    totalAmount,
  };
};

/**
 * Reusable HTML generator for SweetAlert2 POS Checkout Modals
 * Simplified to price / fixed rupee amount discount only.
 */
export const renderDiscountSectionHtml = ({
  idPrefix = 'checkout',
  initialType = DISCOUNT_TYPES.NONE,
  initialValue = 0,
  initialReason = '',
  initialDiningType = 'DINE_IN',
  hideDiningType = false,
}) => {
  const hasInitialDiscount = initialValue > 0;
  const isTakeaway = initialDiningType === 'TAKEAWAY';
  return `
    <div class="discount-config-section mb-3 px-2 bg-light p-2 rounded border text-start" id="${idPrefix}-discount-wrapper">
      ${!hideDiningType ? `
      <!-- Order Mode / Dining Type Selector -->
      <div class="mb-2">
        <label class="small fw-bold text-muted mb-1 d-block">
          <i class="fas fa-concierge-bell text-primary me-1"></i> ORDER MODE
        </label>
        <div class="btn-group w-100" role="group">
          <button type="button" id="${idPrefix}-dining-dinein-btn" class="btn btn-sm btn-outline-primary py-1 ${!isTakeaway ? 'active' : ''}" style="font-size:0.8rem;">
            <i class="fas fa-utensils me-1"></i> Dine-In (10% SC)
          </button>
          <button type="button" id="${idPrefix}-dining-takeaway-btn" class="btn btn-sm btn-outline-warning text-dark py-1 ${isTakeaway ? 'active' : ''}" style="font-size:0.8rem;">
            <i class="fas fa-shopping-bag me-1"></i> Take Away (0% SC)
          </button>
        </div>
      </div>
      ` : ''}

      <div class="d-flex justify-content-between align-items-center mb-2">
        <label class="small fw-bold text-muted mb-0">
          <i class="fas fa-tag text-primary me-1"></i> DISCOUNT (RS.)
        </label>
        <span class="badge ${hasInitialDiscount ? 'bg-danger text-white fw-bold' : 'bg-secondary-soft text-secondary'} small" id="${idPrefix}-discount-badge" style="font-size:0.75rem;">
          ${hasInitialDiscount ? `Rs. ${Number(initialValue).toFixed(2)} OFF` : 'None'}
        </span>
      </div>

      <!-- Price Input -->
      <div class="input-group input-group-sm mb-2">
        <span class="input-group-text fw-bold bg-white text-secondary">Rs.</span>
        <input 
          type="number" 
          id="${idPrefix}-discount-input" 
          class="form-control form-control-sm text-end fw-bold shadow-none" 
          placeholder="0.00" 
          min="0" 
          step="any" 
          value="${initialValue > 0 ? initialValue : ''}"
          style="font-size: 0.95rem;"
        />
        <button class="btn btn-outline-secondary px-2" type="button" id="${idPrefix}-clear-discount-btn" title="Clear Discount">
          <i class="fas fa-times me-1"></i> Clear
        </button>
      </div>

      <!-- Discount Reason Selector -->
      <div class="mb-1">
        <select id="${idPrefix}-discount-reason" class="form-select form-select-sm shadow-none" style="font-size:0.78rem;">
          <option value="">-- Select Reason (Optional) --</option>
          ${DISCOUNT_REASONS.map(
            (r) => `<option value="${r}" ${initialReason === r ? 'selected' : ''}>${r}</option>`
          ).join('')}
        </select>
      </div>
    </div>
  `;
};

/**
 * Event wireup helper for SweetAlert2 Checkout Modal
 */
export const initDiscountSectionListeners = ({
  popup,
  idPrefix = 'checkout',
  subtotal = 0,
  serviceCharge = 0,
  initialDiningType = 'DINE_IN',
  getCurrency = () => 'LKR',
  getRate = () => 1,
  getSymbol = () => 'Rs.',
  onChange,
}) => {
  if (!popup) return;

  let currentDiningType = initialDiningType === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN';
  let currentValue = 0;
  let currentReason = '';

  const dineInBtn = popup.querySelector(`#${idPrefix}-dining-dinein-btn`);
  const takeawayBtn = popup.querySelector(`#${idPrefix}-dining-takeaway-btn`);
  const valInput = popup.querySelector(`#${idPrefix}-discount-input`);
  const clearBtn = popup.querySelector(`#${idPrefix}-clear-discount-btn`);
  const reasonSelect = popup.querySelector(`#${idPrefix}-discount-reason`);
  const badgeEl = popup.querySelector(`#${idPrefix}-discount-badge`);

  // Initialize from existing DOM value if present
  if (valInput && parseFloat(valInput.value) > 0) {
    currentValue = Math.max(0, parseFloat(valInput.value) || 0);
  }
  if (reasonSelect && reasonSelect.value) {
    currentReason = reasonSelect.value;
  }

  const updateStateAndTrigger = (val = currentValue, reason = currentReason, diningType = currentDiningType) => {
    currentValue = Math.max(0, parseFloat(val) || 0);
    const currentType = currentValue > 0 ? DISCOUNT_TYPES.FIXED : DISCOUNT_TYPES.NONE;
    currentReason = reason;
    currentDiningType = diningType;

    if (dineInBtn && takeawayBtn) {
      if (currentDiningType === 'TAKEAWAY') {
        takeawayBtn.classList.add('active');
        dineInBtn.classList.remove('active');
      } else {
        dineInBtn.classList.add('active');
        takeawayBtn.classList.remove('active');
      }
    }

    if (badgeEl) {
      if (currentValue > 0) {
        badgeEl.className = 'badge bg-danger text-white fw-bold small';
        badgeEl.innerText = `Rs. ${currentValue.toFixed(2)} OFF`;
      } else {
        badgeEl.className = 'badge bg-secondary-soft text-secondary small';
        badgeEl.innerText = 'None';
      }
    }

    // When TAKEAWAY is active, effective service charge is strictly 0
    const effectiveServiceCharge = currentDiningType === 'TAKEAWAY' ? 0 : serviceCharge;

    const breakdown = calculateDiscountBreakdown({
      subtotal,
      serviceCharge: effectiveServiceCharge,
      discountType: currentType,
      discountValue: currentValue,
    });

    if (typeof onChange === 'function') {
      onChange({
        ...breakdown,
        diningType: currentDiningType,
        serviceCharge: effectiveServiceCharge,
        discountReason: currentReason,
        currency: getCurrency(),
        rate: getRate(),
        symbol: getSymbol(),
      });
    }
  };

  // Wire dining buttons
  if (dineInBtn) {
    dineInBtn.addEventListener('click', () => {
      updateStateAndTrigger(valInput ? valInput.value : 0, reasonSelect ? reasonSelect.value : '', 'DINE_IN');
    });
  }

  if (takeawayBtn) {
    takeawayBtn.addEventListener('click', () => {
      updateStateAndTrigger(valInput ? valInput.value : 0, reasonSelect ? reasonSelect.value : '', 'TAKEAWAY');
    });
  }

  // Wire manual numeric input
  if (valInput) {
    valInput.addEventListener('input', (e) => {
      updateStateAndTrigger(e.target.value);
    });
  }

  // Wire clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (valInput) {
        valInput.value = '';
        valInput.focus();
      }
      updateStateAndTrigger(0);
    });
  }

  // Wire reason select
  if (reasonSelect) {
    reasonSelect.addEventListener('change', (e) => {
      updateStateAndTrigger(valInput ? valInput.value : 0, e.target.value);
    });
  }

  return {
    getCurrentState: () => ({
      diningType: currentDiningType,
      discountType: currentValue > 0 ? DISCOUNT_TYPES.FIXED : DISCOUNT_TYPES.NONE,
      discountValue: currentValue,
      discountReason: currentReason,
    }),
  };
};

/**
 * Standard React Component for React-based checkouts/modals
 */
export default function DiscountInputSection({
  subtotal = 0,
  serviceCharge = 0,
  initialDiningType = 'DINE_IN',
  currency = 'LKR',
  symbol = 'Rs.',
  rate = 1,
  onChange,
}) {
  const [diningType, setDiningType] = useState(initialDiningType);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  const discountType = discountValue > 0 ? DISCOUNT_TYPES.FIXED : DISCOUNT_TYPES.NONE;
  const effectiveServiceCharge = diningType === 'TAKEAWAY' ? 0 : serviceCharge;

  const breakdown = useMemo(() => {
    return calculateDiscountBreakdown({
      subtotal,
      serviceCharge: effectiveServiceCharge,
      discountType,
      discountValue,
    });
  }, [subtotal, effectiveServiceCharge, discountType, discountValue]);

  useEffect(() => {
    if (typeof onChange === 'function') {
      onChange({
        ...breakdown,
        diningType,
        serviceCharge: effectiveServiceCharge,
        discountReason,
      });
    }
  }, [breakdown, diningType, effectiveServiceCharge, discountReason, onChange]);

  const safeRate = Number(rate) > 0 ? Number(rate) : 1;

  return (
    <div className="discount-input-section bg-light p-3 rounded border mb-3">
      {/* Order Mode Selector */}
      <div className="mb-2">
        <label className="small fw-bold text-muted mb-1 d-block">
          <i className="fas fa-concierge-bell text-primary me-1"></i> ORDER MODE
        </label>
        <div className="btn-group w-100" role="group">
          <button
            type="button"
            className={`btn btn-sm btn-outline-primary py-1 ${diningType !== 'TAKEAWAY' ? 'active' : ''}`}
            onClick={() => setDiningType('DINE_IN')}
            style={{ fontSize: '0.8rem' }}
          >
            <i className="fas fa-utensils me-1"></i> Dine-In (10% SC)
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-outline-warning text-dark py-1 ${diningType === 'TAKEAWAY' ? 'active' : ''}`}
            onClick={() => setDiningType('TAKEAWAY')}
            style={{ fontSize: '0.8rem' }}
          >
            <i className="fas fa-shopping-bag me-1"></i> Take Away (0% SC)
          </button>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <label className="fw-bold text-muted mb-0 small">
          <i className="fas fa-tag text-primary me-1"></i> DISCOUNT (RS.)
        </label>
        {breakdown.discountAmount > 0 ? (
          <span className="badge bg-danger">
            -{symbol} {(breakdown.discountAmount / safeRate).toFixed(2)} OFF
          </span>
        ) : (
          <span className="badge bg-secondary-soft text-secondary small">None</span>
        )}
      </div>

      <div className="input-group input-group-sm mb-2">
        <span className="input-group-text fw-bold bg-white text-secondary">Rs.</span>
        <input
          type="number"
          className="form-control text-end fw-bold shadow-none"
          placeholder="0.00"
          min="0"
          step="any"
          value={discountValue > 0 ? discountValue : ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            setDiscountValue(val);
          }}
        />
        <button
          className="btn btn-outline-secondary px-2"
          type="button"
          onClick={() => setDiscountValue(0)}
          title="Clear Discount"
        >
          <i className="fas fa-times me-1"></i> Clear
        </button>
      </div>

      <select
        className="form-select form-select-sm shadow-none"
        value={discountReason}
        onChange={(e) => setDiscountReason(e.target.value)}
      >
        <option value="">-- Select Reason (Optional) --</option>
        {DISCOUNT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}

