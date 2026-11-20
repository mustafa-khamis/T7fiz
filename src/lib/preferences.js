// Per-device conveniences (language before sign-in, theme). Storage can be
// unavailable (private mode, blocked site data), so every access is guarded.
const PREFIX = 't7fiz.';

export function readPreference(name) {
  try {
    return window.localStorage.getItem(PREFIX + name);
  } catch {
    return null;
  }
}

export function writePreference(name, value) {
  try {
    if (value == null) window.localStorage.removeItem(PREFIX + name);
    else window.localStorage.setItem(PREFIX + name, value);
  } catch {
    // Preference simply won't persist on this device.
  }
}
