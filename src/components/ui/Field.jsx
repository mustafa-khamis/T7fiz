import { useId, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { suggestEmail } from '../../lib/email-suggest.js';
import { assessPassword } from '../../lib/password-strength.js';
import { AlertCircleIcon, CheckIcon, ChevronDownIcon, CircleIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, WarningIcon } from './icons.jsx';
import styles from './Field.module.css';

/**
 * Form fields. Principles:
 *  - Visible label above the control (no placeholder-as-label, no floating
 *    labels: both fail with Arabic metrics, autofill and screen magnifiers).
 *  - Optional fields are marked; required is the default.
 *  - The error sits directly under the control with an icon (never colour
 *    alone), and is linked with aria-describedby together with the hint.
 *  - Errors are not live regions: forms move focus to the first invalid field
 *    on submit, which reads its label and message once (see lib/forms.js).
 */
function FieldShell({ id, label, optional, hint, error, children, after, labelAction }) {
  const { t } = useI18n();
  return (
    <div className={styles.field} data-invalid={error ? 'true' : undefined}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {optional && <span className={styles.optional}> ({t('common.optional')})</span>}
        </label>
        {labelAction}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          <AlertCircleIcon size={18} />
          <span>{error}</span>
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {after}
    </div>
  );
}

const describedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined;

export function TextField({ label, hint, error, optional, icon: LeadingIcon, trailing, id: providedId, className = '', describedById, labelAction, after, ...inputProps }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <FieldShell id={id} label={label} optional={optional} hint={hint} error={error} labelAction={labelAction} after={after}>
      <div className={styles.control} data-has-icon={LeadingIcon ? 'true' : undefined} data-has-trailing={trailing ? 'true' : undefined}>
        {LeadingIcon && (
          <span className={styles.leading}>
            <LeadingIcon />
          </span>
        )}
        <input
          id={id}
          className={`${styles.input} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error && `${id}-error`, hint && `${id}-hint`, describedById)}
          required={!optional}
          {...inputProps}
        />
        {trailing && <span className={styles.trailing}>{trailing}</span>}
      </div>
    </FieldShell>
  );
}

/** Email: correct keyboard and autofill, trims on blur, suggests fixes for domain typos. */
/** Multi-line text with the same label, hint, error and counter conventions. */
export function TextAreaField({ label, hint, error, optional, id: providedId, rows = 3, maxLength, value = '', ...textareaProps }) {
  const { formatters } = useI18n();
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const near = maxLength && value.length >= maxLength * 0.8;
  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      after={
        near ? (
          <p className={styles.counter} aria-live="polite">
            {formatters.integer(value.length)} / {formatters.integer(maxLength)}
          </p>
        ) : null
      }
    >
      <div className={styles.control}>
        <textarea
          id={id}
          className={`${styles.input} ${styles.textarea}`}
          rows={rows}
          maxLength={maxLength}
          value={value}
          dir="auto"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error && `${id}-error`, hint && `${id}-hint`)}
          required={!optional}
          {...textareaProps}
        />
      </div>
    </FieldShell>
  );
}

export function EmailField({ value, onChange, onBlur, ...props }) {
  const { t } = useI18n();
  const [suggestion, setSuggestion] = useState(null);
  const suggestionId = useId();
  return (
    <TextField
      type="email"
      inputMode="email"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      dir="ltr"
      icon={MailIcon}
      value={value}
      onChange={(event) => {
        if (suggestion) setSuggestion(null);
        onChange(event);
      }}
      onBlur={(event) => {
        setSuggestion(suggestEmail(event.target.value));
        onBlur?.(event);
      }}
      describedById={suggestion ? suggestionId : undefined}
      after={
        suggestion && (
          <p id={suggestionId} className={styles.suggestion}>
            {t('common.emailSuggestion')}{' '}
            <button
              type="button"
              className={styles.suggestionButton}
              onClick={() => {
                onChange(suggestion);
                setSuggestion(null);
              }}
            >
              <bdi dir="ltr">{suggestion}</bdi>
            </button>
            {t('common.questionMark')}
          </p>
        )
      }
      {...props}
    />
  );
}

/**
 * Password with show/hide, Caps Lock warning, and — for new passwords — a
 * live checklist and strength meter. `context` ({ email, name }) lets the
 * meter discourage passwords built from the account's own details.
 */
export function PasswordField({ newPassword = false, context, value, error, hint, onKeyDown, onKeyUp, onBlur, ...props }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const statusId = useId();
  const checkCaps = (event) => {
    if (typeof event.getModifierState === 'function') setCapsLock(event.getModifierState('CapsLock'));
  };

  const assessment = newPassword ? assessPassword(value ?? '', context) : null;
  const strengthKey = ['tooShort', 'weak', 'fair', 'good', 'strong'][assessment?.score ?? 0];

  const toggle = (
    <button
      type="button"
      className={styles.iconButton}
      onClick={() => setVisible((current) => !current)}
      aria-pressed={visible}
      aria-label={visible ? t('common.password.hide') : t('common.password.show')}
      title={visible ? t('common.password.hide') : t('common.password.show')}
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );

  const after = (
    <>
      {capsLock && (
        <p className={styles.notice} role="status">
          <WarningIcon size={18} />
          <span>{t('common.password.capsLock')}</span>
        </p>
      )}
      {newPassword && (
        <div className={styles.strength} id={statusId}>
          <div className={styles.meter} data-score={assessment.empty ? 'empty' : assessment.score} aria-hidden="true">
            {[1, 2, 3, 4].map((segment) => (
              <span key={segment} data-on={!assessment.empty && assessment.score >= segment ? 'true' : undefined} />
            ))}
          </div>
          <p className={styles.strengthLabel} aria-live="polite">
            {assessment.empty ? t('common.password.strengthPrompt') : `${t('common.password.strength')}: ${t(`common.password.levels.${strengthKey}`)}`}
          </p>
          <ul className={styles.checklist} aria-label={t('common.password.requirements')}>
            {[
              ['length', assessment.checks.length],
              ['notCommon', assessment.empty || assessment.checks.notCommon],
              ['notPersonal', assessment.empty || assessment.checks.notPersonal],
            ].map(([key, met]) => (
              <li key={key} data-met={!assessment.empty && met ? 'true' : undefined}>
                {!assessment.empty && met ? <CheckIcon size={16} /> : <CircleIcon size={16} />}
                <span>
                  {t(`common.password.rules.${key}`)}
                  <span className="visually-hidden"> — {!assessment.empty && met ? t('common.password.met') : t('common.password.notMet')}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      value={value}
      error={error}
      hint={hint}
      icon={LockIcon}
      dir="ltr"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={toggle}
      describedById={newPassword ? statusId : undefined}
      onKeyDown={(event) => {
        checkCaps(event);
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        checkCaps(event);
        onKeyUp?.(event);
      }}
      onBlur={(event) => {
        setCapsLock(false);
        onBlur?.(event);
      }}
      after={after}
    />
  );
}

export function SelectField({ label, hint, error, optional, id: providedId, children, ...selectProps }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
      <div className={styles.control} data-has-trailing="true">
        <select
          id={id}
          className={`${styles.input} ${styles.select}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error && `${id}-error`, hint && `${id}-hint`)}
          {...selectProps}
        >
          {children}
        </select>
        <span className={`${styles.trailing} ${styles.chevron}`} aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </div>
    </FieldShell>
  );
}

/** A value the person can see but not edit here (with the reason in `hint`). */
export function ReadOnlyField({ label, value, hint, dir }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      <p className={styles.readOnly} aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined} dir={dir}>
        {value}
      </p>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
