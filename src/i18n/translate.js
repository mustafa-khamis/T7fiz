/**
 * Small, dependency-free translator.
 * - Nested keys: t('auth.signIn.title')
 * - Named params: "مرحبًا، {name}" with t(key, { name })
 * - CLDR plurals: an object with zero/one/two/few/many/other, selected by params.count.
 *   Arabic uses all six categories.
 */

function lookup(dictionary, key) {
  let node = dictionary;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

export function createTranslator(dictionary, locale, { formatNumber = String, onMissing } = {}) {
  const pluralRules = new Intl.PluralRules(locale);

  return function t(key, params) {
    let entry = lookup(dictionary, key);

    if (entry && typeof entry === 'object' && params && typeof params.count === 'number') {
      entry = entry[pluralRules.select(params.count)] ?? entry.other;
    }

    if (typeof entry !== 'string') {
      onMissing?.(key, locale);
      return key;
    }
    if (!params) return entry;

    return entry.replace(/\{(\w+)\}/g, (match, name) => {
      if (!(name in params)) return match;
      const value = params[name];
      return typeof value === 'number' ? formatNumber(value) : String(value);
    });
  };
}

const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

/** A plural entry: an object of CLDR categories that always includes `other`. */
export function isPluralEntry(value) {
  return Boolean(value) && typeof value === 'object' && 'other' in value && Object.keys(value).every((key) => PLURAL_CATEGORIES.has(key));
}

/**
 * Flattened list of keys, used to verify that dictionaries match. A plural
 * entry counts as one key: Arabic needs six forms where English needs two.
 */
export function collectKeys(dictionary, prefix = '') {
  return Object.entries(dictionary).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPluralEntry(value)) return [path];
    return value && typeof value === 'object' ? collectKeys(value, path) : [path];
  });
}
