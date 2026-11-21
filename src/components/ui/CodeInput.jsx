import { forwardRef, useId } from 'react';
import styles from './CodeInput.module.css';
import { normalizeCode } from '../../lib/code.js';

/**
 * A one-time code field drawn as separate boxes. It is one real input
 * underneath, so pasting, the browser's and the phone's "fill code from
 * message", screen readers and undo all behave as in any text field.
 * Always left-to-right, even on Arabic pages (codes are read as typed).
 */
export const CodeInput = forwardRef(function CodeInput(
  { value, onChange, length = 6, label, hint, error, disabled = false, state = 'idle', autoFocus = false },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const active = Math.min(value.length, length - 1);
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.boxes} data-state={state} dir="ltr">
        <input
          ref={ref}
          id={id}
          className={styles.input}
          value={value}
          onChange={(event) => onChange(normalizeCode(event.target.value, length))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length * 3}
          spellCheck={false}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        />
        {Array.from({ length }, (_, index) => (
          <span key={index} className={styles.box} data-filled={index < value.length} data-active={index === active} aria-hidden="true">
            {value[index] ?? ''}
          </span>
        ))}
      </div>
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
