import { useId } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { AlertCircleIcon, CheckIcon } from '../../components/ui/icons.jsx';
import styles from './auth.module.css';

/**
 * Required gender choice (male / female) as two large selectable cards, with
 * the reason it is asked shown before the choice, and the error next to it.
 * Native radio inputs keep keyboard (arrow keys) and screen reader behaviour.
 */
export function GenderField({ value, onChange, onBlur, error, name = 'gender' }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <fieldset
      className={styles.fieldset}
      aria-describedby={[`${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')}
      aria-invalid={error ? true : undefined}
      data-invalid={error ? 'true' : undefined}
    >
      <legend className={styles.legend}>{t('auth.gender.label')}</legend>
      <p id={`${id}-hint`} className={styles.muted}>
        {t('auth.gender.hint')}
      </p>
      <div className={styles.choices} role="presentation">
        {['male', 'female'].map((option) => (
          <label key={option} className={styles.choice}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              onBlur={onBlur}
              required
            />
            <span className={styles.choiceLabel}>{t(`auth.gender.${option}`)}</span>
            <span className={styles.choiceCheck} aria-hidden="true">
              <CheckIcon size={18} />
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          <AlertCircleIcon size={18} />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
