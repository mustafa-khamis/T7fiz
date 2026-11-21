const ARABIC_INDIC = /[٠-٩۰-۹]/g;

/** Keeps the first `length` digits of anything typed or pasted (Arabic-Indic digits included). */
export function normalizeCode(value, length = 6) {
  return String(value ?? '')
    .replace(ARABIC_INDIC, (d) => String((d.charCodeAt(0) & 0xf) % 10))
    .replace(/\D/g, '')
    .slice(0, length);
}
