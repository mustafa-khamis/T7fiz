import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ar from './dictionaries/ar.js';
import en from './dictionaries/en.js';
import { createTranslator } from './translate.js';
import { I18nContext } from './context.js';
import { createFormatters } from './format.js';
import { readPreference, writePreference } from '../lib/preferences.js';

export const SUPPORTED_LOCALES = ['ar', 'en'];
export const DEFAULT_LOCALE = 'ar';
const DICTIONARIES = { ar, en };
const DIRECTION = { ar: 'rtl', en: 'ltr' };


function initialLocale() {
  const stored = readPreference('locale');
  return SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
}

function reportMissing(key, locale) {
  if (import.meta.env.DEV) console.warn(`[i18n] missing key "${key}" for locale "${locale}"`);
}

export function I18nProvider({ children, locale: forcedLocale }) {
  const [locale, setLocaleState] = useState(() => forcedLocale ?? initialLocale());
  const [numberingSystem, setNumberingSystem] = useState('auto');

  const value = useMemo(() => {
    const formatters = createFormatters(locale, numberingSystem);
    const t = createTranslator(DICTIONARIES[locale], locale, {
      formatNumber: formatters.number,
      onMissing: reportMissing,
    });
    return { locale, dir: DIRECTION[locale], t, formatters, numberingSystem };
  }, [locale, numberingSystem]);

  // Direction and language live on <html> so every component, portal, and
  // native control (scrollbars, selects) follows the locale.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = DIRECTION[locale];
    document.title = value.t('meta.title');
  }, [locale, value]);

  const setLocale = useCallback((next) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    writePreference('locale', next);
    setLocaleState(next);
  }, []);

  const api = useMemo(() => ({ ...value, setLocale, setNumberingSystem }), [value, setLocale]);
  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}
