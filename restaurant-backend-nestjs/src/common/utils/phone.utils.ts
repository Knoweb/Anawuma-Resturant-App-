/**
 * Normalizes a phone number for WhatsApp compatibility.
 * Removes all non-numeric characters except for a leading plus which is then removed.
 * Returns the number in international format without the + sign.
 * 
 * Examples:
 * +94 77 123 4567 -> 94771234567
 * 94-771-234567 -> 94771234567
 * 0771234567 (with country code 94) -> 94771234567
 */
export function normalizeWhatsAppNumber(
  phone: string,
  defaultCountryCode: string = '94',
): string {
  if (!phone) return '';

  // Keep digits and a leading plus, then strip formatting chars.
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  cleaned = cleaned.replace(/\D/g, '');

  // Handle international prefix 00...
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  if (!cleaned) {
    return '';
  }

  // Already in international format (e.g. 9477xxxxxxx)
  if (cleaned.startsWith(defaultCountryCode)) {
    return cleaned;
  }

  // Local format with trunk prefix (e.g. 077xxxxxxx)
  if (cleaned.startsWith('0')) {
    return `${defaultCountryCode}${cleaned.slice(1)}`;
  }

  // Local format without trunk prefix (e.g. 77xxxxxxx)
  if (cleaned.length === 9) {
    return `${defaultCountryCode}${cleaned}`;
  }

  // Fallback for other countries already entered as plain digits.
  return cleaned;
}

export function isLikelyWhatsAppNumber(phone: string): boolean {
  const normalized = normalizeWhatsAppNumber(phone);
  return normalized.length >= 10 && normalized.length <= 15;
}
