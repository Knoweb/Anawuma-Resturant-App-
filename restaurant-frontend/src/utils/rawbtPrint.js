const ESC = 0x1b;
const GS = 0x1d;
const LINE_WIDTH = 48; // Standard 80mm thermal paper (Font A = 48 chars)

export const KDS_PRINT_MODES = {
  RAWBT_WS: 'rawbt-ws',
  RAWBT_INTENT: 'rawbt-intent',
  BROWSER: 'browser',
};

const STORAGE_KEY = 'anawuma_kds_print_mode';

export const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const getSavedKdsPrintMode = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (
      saved === KDS_PRINT_MODES.RAWBT_WS ||
      saved === KDS_PRINT_MODES.RAWBT_INTENT ||
      saved === KDS_PRINT_MODES.BROWSER
    ) {
      return saved;
    }
  } catch {
    // Ignore storage access errors
  }
  return isAndroidDevice() ? KDS_PRINT_MODES.RAWBT_WS : KDS_PRINT_MODES.BROWSER;
};

export const saveKdsPrintMode = (mode) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage access errors
  }
};

const sanitizeAscii = (value) => {
  return String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\n]/g, ' ');
};

const formatPairLine = (leftText, rightText, width = LINE_WIDTH) => {
  const left = sanitizeAscii(leftText).trim();
  const right = sanitizeAscii(rightText).trim();
  if (!right) return `${left.slice(0, width)}\n`;
  const minGap = 1;
  const maxLeft = Math.max(0, width - right.length - minGap);
  const clippedLeft = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  const spaces = Math.max(minGap, width - clippedLeft.length - right.length);
  return `${clippedLeft}${' '.repeat(spaces)}${right}\n`;
};

const wrapItemWithQty = (itemName, qtyText, width = LINE_WIDTH) => {
  const cleanName = sanitizeAscii(itemName).trim() || 'Item';
  const cleanQty = sanitizeAscii(qtyText).trim();
  const qtyColWidth = Math.max(cleanQty.length + 2, 6);
  const nameColWidth = width - qtyColWidth;

  const words = cleanName.split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= nameColWidth) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  if (lines.length === 0) lines.push('Item');

  return lines.map((line, index) => {
    if (index === 0) {
      return formatPairLine(line, cleanQty, width);
    }
    return `${line}\n`;
  });
};

const formatKotHeaderText = (order) => {
  const rawOrderNo = String(order?.orderNo || '-').replace(/^#/, '');
  const rawLocation = order?.roomNo || order?.tableNo || '';
  let formattedLocation = '';

  if (rawLocation) {
    const trimmed = String(rawLocation).trim();
    if (/^(ROOM|TABLE)\b/i.test(trimmed)) {
      formattedLocation = trimmed;
    } else {
      formattedLocation = order?.roomNo ? `Room ${trimmed}` : `Table ${trimmed}`;
    }
  }

  return {
    rawOrderNo,
    formattedLocation,
    headerLine: formattedLocation ? `KOT #${rawOrderNo} - ${formattedLocation}` : `KOT #${rawOrderNo}`,
  };
};

/**
 * Builds compact 80mm ESC/POS byte stream for a Kitchen Order Ticket with trailing feed + auto-cut.
 */
export const buildKdsEscPosBytes = ({ order, formatDateTime }) => {
  const chunks = [];
  const pushBytes = (...bytes) => {
    chunks.push(new Uint8Array(bytes));
  };
  const pushText = (text) => {
    const safe = sanitizeAscii(text);
    const arr = new Uint8Array(safe.length);
    for (let i = 0; i < safe.length; i += 1) {
      arr[i] = safe.charCodeAt(i) & 0x7f;
    }
    chunks.push(arr);
  };

  const { rawOrderNo, formattedLocation, headerLine } = formatKotHeaderText(order);
  const divider = `${'-'.repeat(LINE_WIDTH)}\n`;
  const dateStr = formatDateTime ? formatDateTime(order?.createdAt || new Date()) : '';
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];

  // Initialize printer
  pushBytes(ESC, 0x40);

  // Single-line KOT header (Centered, Bold, Tall)
  pushBytes(ESC, 0x61, 0x01, ESC, 0x45, 0x01, GS, 0x21, 0x01);
  pushText(`${headerLine}\n`);
  pushBytes(GS, 0x21, 0x00, ESC, 0x45, 0x00, ESC, 0x61, 0x00);

  pushText(divider);

  // 2-line compact metadata
  pushText(formatPairLine(`Order: #${rawOrderNo}`, dateStr));
  pushText(formatPairLine(formattedLocation || '-', order?.customerName || 'Guest'));

  pushText(divider);

  // Items header
  pushBytes(ESC, 0x45, 0x01);
  pushText(formatPairLine('Item', 'Qty'));
  pushBytes(ESC, 0x45, 0x00);
  pushText(divider);

  // Item rows
  items.forEach((item) => {
    const qty = Number(item.qty || 1);
    const name = item.itemName || item.foodItem?.itemName || 'Item';
    const itemLines = wrapItemWithQty(name, `x${qty}`);
    itemLines.forEach((line) => pushText(line));

    if (item.notes) {
      pushText(`  Note: ${sanitizeAscii(item.notes).trim()}\n`);
    }
  });

  pushText(divider);

  // Compact kitchen prompt (no customer footer)
  pushBytes(ESC, 0x61, 0x01, ESC, 0x45, 0x01);
  pushText('PLEASE PREPARE THE ABOVE ITEMS\n');
  pushBytes(ESC, 0x45, 0x00, ESC, 0x61, 0x00);

  // Feed paper past cutter blade and execute partial auto-cut (GS V B 0)
  pushBytes(ESC, 0x64, 0x04);
  pushBytes(GS, 0x56, 0x42, 0x00);

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((c) => {
    result.set(c, offset);
    offset += c.length;
  });

  return result;
};

export const uint8ArrayToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, slice);
  }
  return window.btoa(binary);
};

const connectAndSendWebSocket = (url, escPosBytes, timeoutMs) => {
  return new Promise((resolve) => {
    let settled = false;
    let socket = null;

    const finish = (ok, reason) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({ ok, reason });
    };

    const timer = window.setTimeout(() => {
      try {
        if (socket && socket.readyState !== WebSocket.CLOSED) {
          socket.close();
        }
      } catch {
        // Ignore close errors
      }
      finish(false, 'Connection timed out');
    }, timeoutMs);

    try {
      socket = new WebSocket(url);
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        try {
          socket.send(escPosBytes.buffer);
          window.setTimeout(() => {
            try {
              socket.close(1000, 'Printed');
            } catch {
              // Ignore
            }
          }, 150);
          finish(true);
        } catch (sendErr) {
          finish(false, sendErr?.message || 'Send failed');
        }
      };

      socket.onerror = () => {
        finish(false, `Cannot reach ${url}`);
      };
    } catch (err) {
      finish(false, err?.message || 'WebSocket blocked');
    }
  });
};

/**
 * Sends ESC/POS bytes directly to RawBT local WebSocket server (port 40213).
 * Tries localhost first, then 127.0.0.1.
 */
export const sendToRawbtWebSocket = async (escPosBytes, { timeoutMs = 1200 } = {}) => {
  const first = await connectAndSendWebSocket('ws://localhost:40213/', escPosBytes, timeoutMs);
  if (first.ok) return first;

  const second = await connectAndSendWebSocket('ws://127.0.0.1:40213/', escPosBytes, timeoutMs);
  return second;
};

/**
 * Triggers RawBT Android app synchronously via rawbt:base64,... scheme.
 * Must be called inside a direct user click gesture on Android Chrome.
 */
export const sendToRawbtIntentSync = (escPosBytes) => {
  try {
    const base64 = uint8ArrayToBase64(escPosBytes);
    window.location.href = `rawbt:base64,${base64}`;
    return true;
  } catch (error) {
    console.error('RawBT Intent print failed:', error);
    return false;
  }
};
