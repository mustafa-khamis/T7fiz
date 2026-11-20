import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readPreference, writePreference } from '../lib/preferences.js';

const ThemeContext = createContext(null);
const MODES = ['system', 'light', 'dark'];

function systemPrefersDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 'system' follows the OS; 'light'/'dark' are explicit choices stored per device.
 * The attribute is also set by an inline script in index.html before first paint.
 */
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    const stored = readPreference('theme');
    return MODES.includes(stored) ? stored : 'system';
  });
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
  }, [mode]);

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    writePreference('theme', next === 'system' ? null : next);
    setModeState(next);
  }, []);

  const value = useMemo(
    () => ({ mode, resolved: mode === 'system' ? (systemDark ? 'dark' : 'light') : mode, setMode }),
    [mode, systemDark, setMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
