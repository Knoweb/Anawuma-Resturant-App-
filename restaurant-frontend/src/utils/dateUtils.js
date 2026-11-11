/**
 * Utility functions for consistent date & time formatting in Sri Lanka Time (Asia/Colombo, UTC+5:30)
 */

export const parseDateTime = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  if (typeof dateVal === 'string') {
    let str = dateVal.trim();
    // If it lacks timezone information (e.g. MySQL "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"),
    // append 'Z' because the server database stores UTC timestamps.
    if (!str.endsWith('Z') && !str.includes('+') && !str.includes('GMT')) {
      str = str.replace(' ', 'T') + 'Z';
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(dateVal);
  return isNaN(fallback.getTime()) ? null : fallback;
};

/**
 * Format date & time for thermal bills and invoices in Asia/Colombo timezone
 * Example output: "11 Nov 2026, 11:45 am"
 */
export const formatBillDateTime = (dateVal) => {
  const d = parseDateTime(dateVal) || new Date();
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format time only in Asia/Colombo timezone
 * Example output: "11:45 AM"
 */
export const formatBillTime = (dateVal) => {
  const d = parseDateTime(dateVal) || new Date();
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format date only in Asia/Colombo timezone
 * Example output: "11 Nov 2026"
 */
export const formatBillDate = (dateVal) => {
  const d = parseDateTime(dateVal) || new Date();
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Colombo',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
