import { escapeHtml } from './thermalPrint';

export const buildKdsOrderTicketDocument = ({
  restaurantName,
  restaurantInfo,
  order,
  formatDateTime,
}) => {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const itemsMarkup = items
    .map((item) => {
      const qty = Number(item.qty || 1);
      const itemName = escapeHtml(item.itemName || item.foodItem?.itemName || 'Item');
      const notes = item.notes
        ? `<div class="kds-item-note">Note: ${escapeHtml(item.notes)}</div>`
        : '';

      return `
        <tr>
          <td class="kds-td-item">${itemName}${notes}</td>
          <td class="kds-td-qty">x${qty}</td>
        </tr>
      `;
    })
    .join('');

  const locationLabel = order?.roomNo ? 'Room' : 'Table';
  const locationValue = escapeHtml(order?.roomNo || order?.tableNo || '-');

  const styles = `
    #anawuma-print-root .kds-bill-wrap {
      font-family: Arial, sans-serif;
      width: 100%;
      color: #000;
      box-sizing: border-box;
    }
    #anawuma-print-root .kds-receipt-header {
      text-align: center;
      border-bottom: 2px dashed #444;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    #anawuma-print-root .kds-restaurant-name {
      font-size: 20px;
      font-weight: 800;
      margin: 0;
      color: #000;
      text-transform: uppercase;
    }
    #anawuma-print-root .kds-contact-box {
      font-size: 13px;
      color: #333;
      margin-top: 6px;
      border-top: 1px dashed #666;
      border-bottom: 1px dashed #666;
      padding: 4px 0;
    }
    #anawuma-print-root .kds-invoice-label {
      font-size: 13px;
      font-weight: bold;
      margin-top: 5px;
      color: #444;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    #anawuma-print-root .kds-meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 13px;
    }
    #anawuma-print-root .kds-meta-table td {
      padding: 3px 0;
      vertical-align: top;
    }
    #anawuma-print-root .kds-info-label {
      display: block;
      font-weight: bold;
      color: #555;
      font-size: 10px;
      text-transform: uppercase;
    }
    #anawuma-print-root .kds-info-value {
      display: block;
      font-weight: bold;
      color: #000;
      font-size: 13px;
    }
    #anawuma-print-root .kds-items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 15px;
    }
    #anawuma-print-root .kds-items-table th {
      padding: 6px 4px;
      border-bottom: 2px solid #222;
    }
    #anawuma-print-root .kds-td-item {
      padding: 6px 4px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }
    #anawuma-print-root .kds-td-qty {
      padding: 6px 4px;
      border-bottom: 1px solid #ddd;
      text-align: right;
      font-weight: bold;
      font-size: 15px;
      white-space: nowrap;
    }
    #anawuma-print-root .kds-item-note {
      font-size: 12px;
      color: #444;
      margin-top: 2px;
    }
    #anawuma-print-root .kds-prepare-banner {
      margin-top: 12px;
      text-align: center;
      border-top: 2px dashed #444;
      padding-top: 8px;
    }
    #anawuma-print-root .kds-prepare-banner p {
      margin: 0;
      font-weight: bold;
      font-size: 14px;
    }
    #anawuma-print-root .kds-receipt-footer {
      border-top: 2px dashed #444;
      padding-top: 10px;
      margin-top: 12px;
      text-align: center;
    }
  `;

  const html = `
    <div class="kds-bill-wrap">
      <div class="kds-receipt-header">
        <h1 class="kds-restaurant-name">${escapeHtml(restaurantName || 'ANAWUMA')}</h1>
        ${(restaurantInfo?.address || restaurantInfo?.contactNumber) ? `
          <div class="kds-contact-box">
            ${restaurantInfo.address ? `<div style="margin-bottom:2px;">${escapeHtml(restaurantInfo.address)}</div>` : ''}
            ${restaurantInfo.contactNumber ? `<div>Tel: ${escapeHtml(restaurantInfo.contactNumber)}</div>` : ''}
          </div>
        ` : `
          <div class="kds-invoice-label">ORDER TICKET</div>
        `}
      </div>

      <table class="kds-meta-table">
        <tbody>
          <tr>
            <td style="text-align:left;">
              <span class="kds-info-label">Order No</span>
              <span class="kds-info-value">${escapeHtml(order?.orderNo || '-')}</span>
            </td>
            <td style="text-align:right;">
              <span class="kds-info-label">Date &amp; Time</span>
              <span class="kds-info-value">${escapeHtml(formatDateTime(order?.createdAt || new Date()))}</span>
            </td>
          </tr>
          <tr>
            <td style="text-align:left;">
              <span class="kds-info-label">${locationLabel}</span>
              <span class="kds-info-value">${locationValue}</span>
            </td>
            <td style="text-align:right;">
              <span class="kds-info-label">Customer</span>
              <span class="kds-info-value">${escapeHtml(order?.customerName || 'Guest')}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <table class="kds-items-table">
        <thead>
          <tr>
            <th style="text-align:left;">Item</th>
            <th style="text-align:right;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsMarkup}
        </tbody>
      </table>

      <div class="kds-prepare-banner">
        <p>PLEASE PREPARE THE ABOVE ITEMS</p>
      </div>

      <div class="kds-receipt-footer">
        <div style="font-size:13px;font-weight:bold;margin-bottom:4px;">THANK YOU FOR VISITING!</div>
        <div style="font-size:12px;color:#555;">Please come again.</div>
      </div>
    </div>
  `;

  return { html, styles };
};

export const buildOrderReceiptDocument = ({
  restaurantName,
  order,
  locationLine,
  formatDateTime,
}) => {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  const itemsHtml = items
    .map(
      (item) => `
      <div class="rc-item-row">
        <span>${escapeHtml(item.itemName || 'Item')} x${Number(item.qty || 1)}</span>
        <span>${parseFloat(item.lineTotal || 0).toFixed(0)}</span>
      </div>
    `
    )
    .join('');

  const styles = `
    #anawuma-print-root .rc-wrap {
      font-family: 'Courier New', Courier, monospace;
      width: 100%;
      color: #000;
      box-sizing: border-box;
    }
    #anawuma-print-root .rc-header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    #anawuma-print-root .rc-item-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 13px;
      margin-bottom: 5px;
    }
    #anawuma-print-root .rc-total-section {
      border-top: 1px dashed #000;
      margin-top: 10px;
      padding-top: 10px;
    }
    #anawuma-print-root .rc-total-row {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 17px;
      margin-top: 6px;
    }
    #anawuma-print-root .rc-footer {
      text-align: center;
      margin-top: 16px;
      font-size: 12px;
    }
  `;

  const html = `
    <div class="rc-wrap">
      <div class="rc-header">
        <h2 style="margin:0; font-size:15px; font-weight:bold; text-transform:uppercase;">${escapeHtml(restaurantName || 'Restaurant')}</h2>
        <p style="margin:4px 0;">Order Receipt</p>
        <p style="margin:2px 0;">Order No: ${escapeHtml(order?.orderNo || '-')}</p>
        <p style="margin:2px 0;">${escapeHtml(formatDateTime(order?.createdAt))}</p>
        ${locationLine ? `<p style="margin:2px 0;">${escapeHtml(locationLine)}</p>` : ''}
      </div>
      <div class="rc-items">
        ${itemsHtml}
      </div>
      <div class="rc-total-section">
        <div class="rc-item-row">
          <span>Subtotal:</span>
          <span>${parseFloat(order?.subtotal || 0).toFixed(0)}</span>
        </div>
        <div class="rc-item-row">
          <span>Service Charge (10%):</span>
          <span>${parseFloat(order?.serviceCharge || 0).toFixed(0)}</span>
        </div>
        <div class="rc-total-row">
          <span>TOTAL:</span>
          <span>Rs. ${parseFloat(order?.totalAmount || 0).toFixed(0)}</span>
        </div>
      </div>
      <div class="rc-footer">
        <p style="margin:0;">Thank You!</p>
      </div>
    </div>
  `;

  return { html, styles };
};

export const buildAccountBillDocument = ({
  restaurantName,
  restaurantInfo,
  account,
  summaryHeading,
  locationLabel,
  locationValue,
  currency = 'LKR',
  rate = 1,
  symbol = 'Rs.',
  invoiceNumber = null,
  qrUrl,
  formatDateTime,
  formatTime,
}) => {
  const safeRate = Number(rate) > 0 ? Number(rate) : 1;
  const orders = Array.isArray(account?.orders) ? account.orders : [];
  const subtotal = orders.reduce((sum, o) => sum + parseFloat(o.subtotal || 0), 0);
  const serviceCharge = orders.reduce((sum, o) => sum + parseFloat(o.serviceCharge || 0), 0);
  const total = parseFloat(account?.totalAmount || 0);
  const orderNos = orders.map((o) => o.orderNo).join(', ');
  const paymentMethod = (account?.selectedPaymentMethod || 'CASH').toUpperCase();

  const ordersMarkup = orders
    .map((order) => {
      const itemsHtml = (Array.isArray(order.orderItems) ? order.orderItems : [])
        .map(
          (item) => `
          <div class="ab-item-row">
            <span>${escapeHtml(item.itemName || 'Item')} x${Number(item.qty || 1)}</span>
            <span>${escapeHtml(symbol)} ${(parseFloat(item.lineTotal || 0) / safeRate).toFixed(2)}</span>
          </div>
        `
        )
        .join('');

      return `
        <div class="ab-order-block">
          <div style="font-weight:bold; font-size:11px; margin-bottom:5px;">
            Order No: ${escapeHtml(order.orderNo)} - ${escapeHtml(formatTime(order.createdAt))}
          </div>
          ${itemsHtml}
        </div>
      `;
    })
    .join('');

  const styles = `
    #anawuma-print-root .ab-wrap {
      font-family: 'Courier New', Courier, monospace;
      width: 100%;
      color: #000;
      box-sizing: border-box;
    }
    #anawuma-print-root .ab-header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    #anawuma-print-root .ab-meta-box {
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    #anawuma-print-root .ab-meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      margin-bottom: 3px;
    }
    #anawuma-print-root .ab-order-block {
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px dotted #ccc;
    }
    #anawuma-print-root .ab-item-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 13px;
      margin-bottom: 3px;
    }
    #anawuma-print-root .ab-total-section {
      border-top: 2px solid #000;
      margin-top: 12px;
      padding-top: 10px;
    }
    #anawuma-print-root .ab-grand-total {
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: bold;
      margin-top: 5px;
      border-top: 1px solid #000;
      padding-top: 5px;
    }
    #anawuma-print-root .ab-payment-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-top: 8px;
      font-weight: bold;
      border-top: 1px dashed #000;
      padding-top: 5px;
    }
    #anawuma-print-root .ab-footer {
      text-align: center;
      margin-top: 16px;
      font-size: 12px;
    }
    #anawuma-print-root .ab-qr-section {
      text-align: center;
      margin-top: 14px;
      border-top: 1px dashed #000;
      padding-top: 12px;
    }
    #anawuma-print-root .ab-qr-section img {
      width: 130px;
      height: 130px;
      object-fit: contain;
    }
    #anawuma-print-root .ab-qr-section p {
      font-size: 11px;
      margin: 6px 0 0;
    }
  `;

  const html = `
    <div class="ab-wrap">
      <div class="ab-header">
        <h1 style="margin:0; font-size:19px; font-weight:bold;">${escapeHtml(restaurantName || 'Restaurant')}</h1>
        ${(restaurantInfo?.address || restaurantInfo?.contactNumber) ? `
          <div style="font-size:11px; color:#333; margin-top:5px; border-top:1px dashed #000; border-bottom:1px dashed #000; padding:4px 0;">
            ${restaurantInfo.address ? `<div style="margin-bottom:2px;">${escapeHtml(restaurantInfo.address)}</div>` : ''}
            ${restaurantInfo.contactNumber ? `<div>Tel: ${escapeHtml(restaurantInfo.contactNumber)}</div>` : ''}
          </div>
        ` : `
          <div style="border-top:1px dashed #000; margin-top:5px;"></div>
        `}
        <h3 style="margin:10px 0 4px; font-size:14px; font-weight:bold;">${escapeHtml(summaryHeading)}</h3>
        <p style="margin:3px 0; font-size:11px;">Currency: ${escapeHtml(currency)}</p>
        <p style="margin:3px 0; font-size:11px;">Printed: ${escapeHtml(formatDateTime(new Date()))}</p>
      </div>

      <div class="ab-meta-box">
        <div class="ab-meta-row"><span><b>Invoice No:</b></span><span>${escapeHtml(invoiceNumber || 'INV-DRAFT')}</span></div>
        <div class="ab-meta-row"><span><b>Order No(s):</b></span><span>${escapeHtml(orderNos)}</span></div>
        <div class="ab-meta-row"><span><b>${escapeHtml(locationLabel)}:</b></span><span>${escapeHtml(locationValue)}</span></div>
        <div class="ab-meta-row"><span><b>Payment:</b></span><span>${escapeHtml(paymentMethod)}</span></div>
      </div>

      ${ordersMarkup}

      <div class="ab-total-section">
        <div class="ab-item-row" style="font-size:14px; margin-bottom:5px;">
          <span>Subtotal:</span>
          <span>${escapeHtml(symbol)} ${(subtotal / safeRate).toFixed(2)}</span>
        </div>
        <div class="ab-item-row" style="font-size:14px; margin-bottom:5px;">
          <span>Service Charge (10%):</span>
          <span>${escapeHtml(symbol)} ${(serviceCharge / safeRate).toFixed(2)}</span>
        </div>
        <div class="ab-grand-total">
          <span>TOTAL DUE:</span>
          <span>${escapeHtml(symbol)} ${(total / safeRate).toFixed(2)}</span>
        </div>
        <div class="ab-payment-row">
          <span>PAYMENT METHOD:</span>
          <span>${escapeHtml(paymentMethod)}</span>
        </div>
      </div>

      <div class="ab-footer">
        <p style="margin:0;">Thank You For Dining With Us!</p>
      </div>

      ${qrUrl ? `
        <div class="ab-qr-section">
          <p style="font-size:12px; font-weight:bold; margin-bottom:8px;">⭐ Rate Your Experience</p>
          <img src="${escapeHtml(qrUrl)}" alt="Google Review QR" />
          <p>Scan to leave us a Google Review!</p>
        </div>
      ` : ''}
    </div>
  `;

  return { html, styles };
};
