import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Form state with validation timing that respects the person filling it in:
 *
 *  - Nothing is flagged while someone is typing into a fresh field.
 *  - Leaving a field that has content validates it ("reward early, punish late"):
 *    a malformed email shows its message on blur, an empty field does not nag.
 *  - Once a field has shown an error, it re-validates on every change, so the
 *    message disappears the moment the value becomes valid.
 *  - Submitting validates everything, shows every error, and moves focus to the
 *    first invalid field (screen readers then read its label and message).
 *
 * `validate(values)` returns `{ field: messageKey | null }`; `t` translates keys.
 */
export function useForm({ initial, validate, t }) {
  const [values, setValues] = useState(initial);
  const [shown, setShown] = useState({}); // fields whose errors are visible
  const formRef = useRef(null);
  const [order] = useState(() => Object.keys(initial));

  const errors = validate(values);
  const visibleError = (name) => (shown[name] && errors[name] ? t(errors[name]) : null);

  const setValue = useCallback((name, value) => setValues((current) => ({ ...current, [name]: value })), []);

  function field(name, { transformOnBlur } = {}) {
    return {
      name,
      value: values[name],
      error: visibleError(name),
      onChange: (event) => setValue(name, event?.target ? event.target.value : event),
      onBlur: (event) => {
        const raw = event?.target ? event.target.value : values[name];
        if (transformOnBlur && typeof raw === 'string') {
          const next = transformOnBlur(raw);
          if (next !== raw) setValue(name, next);
        }
        if (typeof raw === 'string' ? raw.trim() !== '' : raw != null) setShown((current) => ({ ...current, [name]: true }));
      },
    };
  }

  function focusFirstInvalid(currentErrors) {
    const first = order.find((name) => currentErrors[name]);
    if (!first || !formRef.current) return;
    const element = formRef.current.elements.namedItem(first);
    const target = element && 'length' in element && !element.tagName ? element[0] : element;
    target?.focus?.();
  }

  const handleSubmit = (onValid) => async (event) => {
    event.preventDefault();
    const currentErrors = validate(values);
    setShown(Object.fromEntries(order.map((name) => [name, true])));
    if (Object.values(currentErrors).some(Boolean)) {
      focusFirstInvalid(currentErrors);
      return;
    }
    await onValid(values);
  };

  const errorCount = order.filter((name) => shown[name] && errors[name]).length;

  return { values, setValue, field, handleSubmit, formRef, errorCount, isValid: !Object.values(errors).some(Boolean) };
}

/**
 * Moves focus to a message (e.g. a server error alert) when it appears, so it
 * is announced and scrolled into view on small screens. Pass a value that
 * changes for each new message.
 */
export function useFocusWhen(ref, trigger) {
  useEffect(() => {
    if (trigger) ref.current?.focus();
  }, [ref, trigger]);
}
