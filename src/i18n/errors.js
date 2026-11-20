/** Localized message for an API (or network) error, with a generic fallback. */
const ISSUE_MESSAGES = {
  password_too_common: 'auth.validation.passwordCommon',
};

export function errorMessage(t, error) {
  // A validation error caused by one known rule is explained specifically.
  const issue = error?.code === 'VALIDATION_FAILED' ? error.details?.find((detail) => ISSUE_MESSAGES[detail.issue]) : null;
  if (issue) return t(ISSUE_MESSAGES[issue.issue]);
  const key = `errors.${error?.code}`;
  const message = t(key);
  return message === key ? t('errors.generic') : message;
}
