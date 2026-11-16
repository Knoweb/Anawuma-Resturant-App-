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
 */
export const renderDiscountSectionHtml = ({
  idPrefix = 'checkout',
  initialType = DISCOUNT_TYPES.NONE,
  initialValue = 0,
  initialReason = '',
}) => {
  return `
    <div class="discount-config-section mb-3 px-2 bg-light p-2 rounded border text-start" id="${idPrefix}-discount-wrapper">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <label class="small fw-bold text-muted mb-0">
          <i class="fas fa-tags text-primary me-1"></i> DISCOUNT / PROMO
        </label>
        <span class="badge bg-secondary-soft text-secondary small" id="${idPrefix}-discount-badge" style="font-size:0.75rem;">None</span>
      </div>

      <!-- Quick Preset Pills -->
      <div class="discount-quick-pills d-flex gap-1 mb-2">
        <button type="button" class="btn btn-sm btn-outline-secondary flex-fill py-1 discount-preset-btn ${initialType === DISCOUNT_TYPES.NONE ? 'active' : ''}" data-type="NONE" data-val="0">None</button>
        <button type="button" class="btn btn-sm btn-outline-primary flex-fill py-1 discount-preset-btn ${initialType === DISCOUNT_TYPES.PERCENTAGE && initialValue === 5 ? 'active' : ''}" data-type="PERCENTAGE" data-val="5">5%</button>
        <button type="button" class="btn btn-sm btn-outline-primary flex-fill py-1 discount-preset-btn ${initialType === DISCOUNT_TYPES.PERCENTAGE && initialValue === 10 ? 'active' : ''}" data-type="PERCENTAGE" data-val="10">10%</button>
        <button type="button" class="btn btn-sm btn-outline-primary flex-fill py-1 discount-preset-btn ${initialType === DISCOUNT_TYPES.PERCENTAGE && initialValue === 15 ? 'active' : ''}" data-type="PERCENTAGE" data-val="15">15%</button>
      </div>

      <!-- Type Toggle & Value Input -->
      <div class="row g-2 align-items-center mb-2">
        <div class="col-5">
          <div class="btn-group w-100" role="group">
            <button type="button" id="${idPrefix}-type-fixed-btn" class="btn btn-sm btn-outline-secondary py-1 ${initialType === DISCOUNT_TYPES.FIXED ? 'active' : ''}" style="font-size:0.78rem;">Rs. Fixed</button>
            <button type="button" id="${idPrefix}-type-percent-btn" class="btn btn-sm btn-outline-secondary py-1 ${initialType === DISCOUNT_TYPES.PERCENTAGE ? 'active' : ''}" style="font-size:0.78rem;">% Percent</button>
          </div>
        </div>
        <div class="col-7">
          <div class="input-group input-group-sm">
            <span class="input-group-text" id="${idPrefix}-val-prefix">${initialType === DISCOUNT_TYPES.PERCENTAGE ? '%' : 'Rs.'}</span>
            <input 
              type="number" 
              id="${idPrefix}-discount-input" 
              class="form-control form-control-sm text-end fw-bold shadow-none" 
              placeholder="0.00" 
              min="0" 
              step="any" 
              value="${initialValue > 0 ? initialValue : ''}"
            />
          </div>
        </div>
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
  getCurrency = () => 'LKR',
  getRate = () => 1,
  getSymbol = () => 'Rs.',
  onChange,
}) => {
  if (!popup) return;

  let currentType = DISCOUNT_TYPES.NONE;
  let currentValue = 0;
  let currentReason = '';

  const presetBtns = popup.querySelectorAll('.discount-preset-btn');
  const fixedBtn = popup.querySelector(`#${idPrefix}-type-fixed-btn`);
  const percentBtn = popup.querySelector(`#${idPrefix}-type-percent-btn`);
  const valPrefix = popup.querySelector(`#${idPrefix}-val-prefix`);
  const valInput = popup.querySelector(`#${idPrefix}-discount-input`);
  const reasonSelect = popup.querySelector(`#${idPrefix}-discount-reason`);
  const badgeEl = popup.querySelector(`#${idPrefix}-discount-badge`);

  const updateStateAndTrigger = (type, val, reason = currentReason) => {
    currentType = type;
    currentValue = Math.max(0, parseFloat(val) || 0);
    currentReason = reason;

    if (currentType === DISCOUNT_TYPES.NONE || currentValue === 0) {
      currentType = DISCOUNT_TYPES.NONE;
      currentValue = 0;
      if (badgeEl) badgeEl.innerText = 'None';
      if (valPrefix) valPrefix.innerText = 'Rs.';
    } else if (currentType === DISCOUNT_TYPES.PERCENTAGE) {
      if (badgeEl) badgeEl.innerText = `${currentValue}% Off`;
      if (valPrefix) valPrefix.innerText = '%';
    } else {
      if (badgeEl) badgeEl.innerText = `Rs. ${currentValue.toFixed(0)} Off`;
      if (valPrefix) valPrefix.innerText = 'Rs.';
    }

    // Update active button highlights
    presetBtns.forEach((btn) => {
      const bType = btn.getAttribute('data-type');
      const bVal = parseFloat(btn.getAttribute('data-val'));
      if (bType === currentType && bVal === currentValue) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (fixedBtn && percentBtn) {
      if (currentType === DISCOUNT_TYPES.FIXED) {
        fixedBtn.classList.add('active');
        percentBtn.classList.remove('active');
      } else if (currentType === DISCOUNT_TYPES.PERCENTAGE) {
        percentBtn.classList.add('active');
        fixedBtn.classList.remove('active');
      } else {
        fixedBtn.classList.remove('active');
        percentBtn.classList.remove('active');
      }
    }

    const breakdown = calculateDiscountBreakdown({
      subtotal,
      serviceCharge,
      discountType: currentType,
      discountValue: currentValue,
    });

    if (typeof onChange === 'function') {
      onChange({
        ...breakdown,
        discountReason: currentReason,
        currency: getCurrency(),
        rate: getRate(),
        symbol: getSymbol(),
      });
    }
  };

  // Wire preset buttons
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const val = parseFloat(btn.getAttribute('data-val'));
      if (valInput) valInput.value = val > 0 ? val : '';
      updateStateAndTrigger(type, val);
    });
  });

  // Wire Fixed / Percent toggle buttons
  if (fixedBtn) {
    fixedBtn.addEventListener('click', () => {
      const nextVal = parseFloat(valInput?.value) || 0;
      updateStateAndTrigger(DISCOUNT_TYPES.FIXED, nextVal);
    });
  }

  if (percentBtn) {
    percentBtn.addEventListener('click', () => {
      const nextVal = parseFloat(valInput?.value) || 0;
      updateStateAndTrigger(DISCOUNT_TYPES.PERCENTAGE, nextVal);
    });
  }

  // Wire manual numeric input
  if (valInput) {
    valInput.addEventListener('input', (e) => {
      const raw = parseFloat(e.target.value) || 0;
      let effectiveType = currentType === DISCOUNT_TYPES.NONE ? DISCOUNT_TYPES.PERCENTAGE : currentType;
      if (raw === 0) {
        updateStateAndTrigger(DISCOUNT_TYPES.NONE, 0);
      } else {
        updateStateAndTrigger(effectiveType, raw);
      }
    });
  }

  // Wire reason select
  if (reasonSelect) {
    reasonSelect.addEventListener('change', (e) => {
      updateStateAndTrigger(currentType, currentValue, e.target.value);
    });
  }

  return {
    getCurrentState: () => ({
      discountType: currentType,
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
  currency = 'LKR',
  symbol = 'Rs.',
  rate = 1,
  onChange,
}) {
  const [discountType, setDiscountType] = useState(DISCOUNT_TYPES.NONE);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  const breakdown = useMemo(() => {
    return calculateDiscountBreakdown({
      subtotal,
      serviceCharge,
      discountType,
      discountValue,
    });
  }, [subtotal, serviceCharge, discountType, discountValue]);

  useEffect(() => {
    if (typeof onChange === 'function') {
      onChange({
        ...breakdown,
        discountReason,
      });
    }
  }, [breakdown, discountReason, onChange]);

  const handlePreset = (type, val) => {
    setDiscountType(type);
    setDiscountValue(val);
  };

  const safeRate = Number(rate) > 0 ? Number(rate) : 1;

  return (
    <div className="discount-input-section bg-light p-3 rounded border mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <label className="fw-bold text-muted mb-0 small">
          <i className="fas fa-tags text-primary me-1"></i> DISCOUNT / PROMOTION
        </label>
        {breakdown.discountAmount > 0 && (
          <span className="badge bg-danger">
            -{symbol} {(breakdown.discountAmount / safeRate).toFixed(2)}
          </span>
        )}
      </div>

      <div className="d-flex gap-1 mb-2">
        <button
          type="button"
          className={`btn btn-sm btn-outline-secondary flex-fill ${discountType === DISCOUNT_TYPES.NONE ? 'active' : ''}`}
          onClick={() => handlePreset(DISCOUNT_TYPES.NONE, 0)}
        >
          None
        </button>
        <button
          type="button"
          className={`btn btn-sm btn-outline-primary flex-fill ${discountType === DISCOUNT_TYPES.PERCENTAGE && discountValue === 5 ? 'active' : ''}`}
          onClick={() => handlePreset(DISCOUNT_TYPES.PERCENTAGE, 5)}
        >
          5%
        </button>
        <button
          type="button"
          className={`btn btn-sm btn-outline-primary flex-fill ${discountType === DISCOUNT_TYPES.PERCENTAGE && discountValue === 10 ? 'active' : ''}`}
          onClick={() => handlePreset(DISCOUNT_TYPES.PERCENTAGE, 10)}
        >
          10%
        </button>
        <button
          type="button"
          className={`btn btn-sm btn-outline-primary flex-fill ${discountType === DISCOUNT_TYPES.PERCENTAGE && discountValue === 15 ? 'active' : ''}`}
          onClick={() => handlePreset(DISCOUNT_TYPES.PERCENTAGE, 15)}
        >
          15%
        </button>
      </div>

      <div className="row g-2 mb-2">
        <div className="col-5">
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn btn-sm btn-outline-secondary ${discountType === DISCOUNT_TYPES.FIXED ? 'active' : ''}`}
              onClick={() => setDiscountType(DISCOUNT_TYPES.FIXED)}
            >
              Fixed
            </button>
            <button
              type="button"
              className={`btn btn-sm btn-outline-secondary ${discountType === DISCOUNT_TYPES.PERCENTAGE ? 'active' : ''}`}
              onClick={() => setDiscountType(DISCOUNT_TYPES.PERCENTAGE)}
            >
              Percent (%)
            </button>
          </div>
        </div>
        <div className="col-7">
          <div className="input-group input-group-sm">
            <span className="input-group-text">
              {discountType === DISCOUNT_TYPES.PERCENTAGE ? '%' : symbol}
            </span>
            <input
              type="number"
              className="form-control text-end fw-bold"
              placeholder="0.00"
              min="0"
              value={discountValue > 0 ? discountValue : ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setDiscountValue(val);
                if (discountType === DISCOUNT_TYPES.NONE && val > 0) {
                  setDiscountType(DISCOUNT_TYPES.PERCENTAGE);
                }
              }}
            />
          </div>
        </div>
      </div>

      <select
        className="form-select form-select-sm"
        value={discountReason}
        onChange={(e) => setDiscountReason(e.target.value)}
      >
        <option value="">-- Reason (Optional) --</option>
        {DISCOUNT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
