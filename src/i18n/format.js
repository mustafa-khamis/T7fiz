/**
 * Locale-aware formatting. All numbers and dates shown in the UI go through
 * these functions so the user's digit preference and time zone are respected.
 *
 * numberingSystem: 'auto' (locale default — Western digits for `ar`),
 *                  'latn' (0-9), 'arab' (٠-٩).
 */
export function localeTag(locale, numberingSystem = 'auto') {
  return numberingSystem === 'auto' ? locale : `${locale}-u-nu-${numberingSystem}`;
}

export function createFormatters(locale, numberingSystem = 'auto') {
  const tag = localeTag(locale, numberingSystem);
  const numberFormat = new Intl.NumberFormat(tag);
  const integerFormat = new Intl.NumberFormat(tag, { useGrouping: false, maximumFractionDigits: 0 });

  return {
    tag,
    number: (value) => numberFormat.format(value),
    // No grouping separators: years, ayah numbers, step numbers.
    integer: (value) => integerFormat.format(value),
    dateTime: (value, { timeZone, ...options } = {}) =>
      new Intl.DateTimeFormat(tag, {
        dateStyle: 'medium',
        timeStyle: 'short',
        ...options,
        ...(timeZone ? { timeZone } : {}),
      }).format(value instanceof Date ? value : new Date(value)),
    date: (value, options = {}) => new Intl.DateTimeFormat(tag, { dateStyle: 'long', ...options }).format(value instanceof Date ? value : new Date(value)),
    timeZoneName: (timeZone) => {
      try {
        const parts = new Intl.DateTimeFormat(tag, { timeZone, timeZoneName: 'longGeneric' }).formatToParts(new Date());
        return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
      } catch {
        return timeZone;
      }
    },
  };
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
