import { describe, expect, it, vi } from 'vitest';
import ar from '../src/i18n/dictionaries/ar.js';
import en from '../src/i18n/dictionaries/en.js';
import { collectKeys, createTranslator } from '../src/i18n/translate.js';
import { createFormatters } from '../src/i18n/format.js';

describe('dictionaries', () => {
  it('Arabic and English define exactly the same keys', () => {
    expect(collectKeys(en).sort()).toEqual(collectKeys(ar).sort());
  });

  it('have no empty strings', () => {
    for (const [name, dictionary] of Object.entries({ ar, en })) {
      const empty = collectKeys(dictionary).filter((key) => {
        const value = key.split('.').reduce((node, part) => node[part], dictionary);
        return typeof value === 'string' && value.trim() === '';
      });
      expect(empty, name).toEqual([]);
    }
  });

  it('has a message for every API error code the backend can return', () => {
    const codes = [
      'VALIDATION_FAILED', 'AUTH_REQUIRED', 'AUTH_INVALID_TOKEN', 'AUTH_TOKEN_EXPIRED', 'ACCOUNT_SUSPENDED',
      'ACCOUNT_DEACTIVATED', 'FORBIDDEN', 'NOT_FOUND', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR',
    ];
    for (const code of codes) expect(ar.errors[code], code).toBeTypeOf('string');
  });
});

describe('createTranslator', () => {
  const dictionary = {
    greeting: 'مرحبًا، {name}',
    students: { zero: 'لا طلاب', one: 'طالب واحد', two: 'طالبان', few: '{count} طلاب', many: '{count} طالبًا', other: '{count} طالب' },
  };

  it('interpolates named parameters', () => {
    const t = createTranslator(dictionary, 'ar');
    expect(t('greeting', { name: 'عمر' })).toBe('مرحبًا، عمر');
  });

  it('selects all Arabic plural categories', () => {
    const t = createTranslator(dictionary, 'ar');
    expect(t('students', { count: 0 })).toBe('لا طلاب');
    expect(t('students', { count: 1 })).toBe('طالب واحد');
    expect(t('students', { count: 2 })).toBe('طالبان');
    expect(t('students', { count: 3 })).toBe('3 طلاب');
    expect(t('students', { count: 11 })).toBe('11 طالبًا');
    expect(t('students', { count: 100 })).toBe('100 طالب');
  });

  it('formats numeric parameters with the locale formatter', () => {
    const { number } = createFormatters('ar', 'arab');
    const t = createTranslator(dictionary, 'ar', { formatNumber: number });
    expect(t('students', { count: 3 })).toBe('٣ طلاب');
  });

  it('returns the key and reports missing translations', () => {
    const onMissing = vi.fn();
    const t = createTranslator(dictionary, 'ar', { onMissing });
    expect(t('does.not.exist')).toBe('does.not.exist');
    expect(onMissing).toHaveBeenCalledWith('does.not.exist', 'ar');
  });
});

describe('createFormatters', () => {
  it('respects the numbering-system preference', () => {
    expect(createFormatters('ar', 'auto').integer(2026)).toBe('2026');
    expect(createFormatters('ar', 'arab').integer(2026)).toBe('٢٠٢٦');
    expect(createFormatters('en', 'arab').integer(15)).toBe('١٥');
  });

  it('formats instants in the requested time zone', () => {
    const instant = '2026-11-15T14:00:00.000Z'; // 16:00 in Khartoum (UTC+2)
    const text = createFormatters('en').dateTime(instant, { timeZone: 'Africa/Khartoum', dateStyle: undefined, timeStyle: 'short' });
    expect(text).toMatch(/4:00/);
  });
});
