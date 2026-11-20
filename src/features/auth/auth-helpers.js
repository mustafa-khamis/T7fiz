// Client-side checks mirror the API's rules for fast feedback only; the API
// remains the authority and its errors are always shown.
import { COMMON_PASSWORDS, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../lib/password-strength.js';

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  if (!value.trim()) return 'auth.validation.emailRequired';
  if (!EMAIL.test(value.trim())) return 'auth.validation.email';
  return null;
}

/** For choosing a new password (sign-up, reset, change). */
export function validateNewPassword(value) {
  if (!value) return 'auth.validation.newPasswordRequired';
  const length = [...value].length;
  if (length < PASSWORD_MIN_LENGTH) return 'auth.validation.passwordMin';
  if (length > PASSWORD_MAX_LENGTH) return 'auth.validation.passwordMax';
  if (COMMON_PASSWORDS.has(value.toLowerCase())) return 'auth.validation.passwordCommon';
  return null;
}

/** @deprecated name kept for existing callers */
export const validatePassword = validateNewPassword;

export function validateDisplayName(value) {
  const name = value.trim();
  if (!name) return 'auth.validation.nameRequired';
  if (name.length > 80) return 'auth.validation.nameLength';
  return null;
}

/**
 * Only same-origin paths are accepted as post-sign-in destinations, so a
 * crafted link cannot redirect users to another site.
 */
export function safeNextPath(value, fallback = '/account') {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
