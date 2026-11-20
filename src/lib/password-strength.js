/**
 * Password guidance without a heavyweight dictionary library.
 *
 * Follows NIST SP 800-63B: length matters most, no composition rules are
 * imposed, and passwords that are common or derived from the account's own
 * details are discouraged. The API enforces the hard rules (length, common
 * passwords); this module only explains them and estimates strength.
 *
 * score: 0 too short · 1 weak · 2 fair · 3 good · 4 strong
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Most frequent passwords in public breach corpora that satisfy an 8-character
// minimum, plus product-specific ones. Kept in sync with the API's list.
export const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '12345678910', '123123123', '11111111', '00000000', '88888888',
  '87654321', '11223344', '12341234', '1q2w3e4r', '1qaz2wsx', 'qwertyui', 'qwertyuiop', 'asdfghjk',
  'zxcvbnm1', 'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'iloveyou', 'iloveyou1',
  'princess', 'sunshine', 'football', 'baseball', 'superman', 'whatever', 'trustno1', 'welcome1',
  'abcd1234', 'abc12345', 'aa123456', 'qwerty123', 'q1w2e3r4', 'letmein1', 'computer', 'internet',
  'starwars', 'mustang1', 'michael1', 'jennifer', 'charlie1', 'pakistan', 'bismillah', 'bismilah',
  'allahakbar', 'alhamdulillah', 'mashallah', 'muhammad', 'mohammed', 'mohamed1', 'quran123',
  't7fiz123', 'tahfeez1', 'tahfiz123', '٠١٢٣٤٥٦٧', '١٢٣٤٥٦٧٨',
]);

const SEQUENCES = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiopasdfghjklzxcvbnm', '٠١٢٣٤٥٦٧٨٩'];

function isSequential(value) {
  const lower = value.toLowerCase();
  return SEQUENCES.some((sequence) => sequence.includes(lower) || [...sequence].reverse().join('').includes(lower));
}

function characterClasses(value) {
  let classes = 0;
  if (/[a-z]/.test(value)) classes += 1;
  if (/[A-Z]/.test(value)) classes += 1;
  if (/[0-9٠-٩]/.test(value)) classes += 1;
  if (/[^\p{L}\p{N}]/u.test(value)) classes += 1;
  if (/[^\p{ASCII}]/u.test(value) && /\p{L}/u.test(value)) classes += 1; // non-Latin letters (e.g. Arabic)
  return classes;
}

/** Account details a password should not be built from. */
function personalTokens({ email = '', name = '' }) {
  const local = email.split('@')[0] ?? '';
  return [local, ...name.split(/\s+/)].map((token) => token.trim().toLowerCase()).filter((token) => token.length >= 3);
}

export function assessPassword(password, context = {}) {
  const length = [...password].length;
  const checks = {
    length: length >= PASSWORD_MIN_LENGTH && length <= PASSWORD_MAX_LENGTH,
    notCommon: !COMMON_PASSWORDS.has(password.toLowerCase()),
    notPersonal: !personalTokens(context).some((token) => password.toLowerCase().includes(token)),
  };
  if (length === 0) return { score: 0, checks, empty: true };
  if (length < PASSWORD_MIN_LENGTH) return { score: 0, checks };
  if (!checks.notCommon || /^(.)\1+$/.test(password) || isSequential(password)) return { score: 1, checks: { ...checks, notCommon: false } };

  let score = 1;
  if (length >= 10) score += 1;
  if (length >= 14) score += 1;
  if (characterClasses(password) >= 3 || length >= 16) score += 1;
  if (!checks.notPersonal) score = Math.min(score, 1);
  return { score: Math.min(score, 4), checks };
}
