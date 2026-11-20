/** Digits after the decimal point for an ISO 4217 currency (USD 2, SDG 2, JPY 0, KWD 3). */
export function currencyDigits(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

/** Amounts are stored in minor units (cents) to avoid floating point; this formats them for people. */
export function formatMoney(minor, currency, locale = 'ar') {
  const digits = currencyDigits(currency);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: digits }).format(minor / 10 ** digits);
  } catch {
    return `${(minor / 10 ** digits).toFixed(digits)} ${currency}`;
  }
}

/** "12.50" (or "12٫50", "12,5") → 1250 minor units; NaN when it is not a valid amount. */
export function parseMoney(text, currency) {
  const digits = currencyDigits(currency);
  const ascii = String(text ?? '')
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.')
    .replace(/[\s٬]/g, '');
  if (!/^\d+(\.\d+)?$/.test(ascii)) return NaN;
  const [whole, fraction = ''] = ascii.split('.');
  if (fraction.length > digits) return NaN;
  return Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0') || 0);
}
