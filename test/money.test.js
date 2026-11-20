import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney } from '../src/lib/money.js';

describe('money', () => {
  it('parses amounts typed with Arabic digits and separators into minor units', () => {
    expect(parseMoney('12.50', 'USD')).toBe(1250);
    expect(parseMoney('١٢٫٥', 'USD')).toBe(1250);
    expect(parseMoney('7', 'SDG')).toBe(700);
    expect(parseMoney('1.234', 'USD')).toBeNaN();
    expect(parseMoney('', 'USD')).toBeNaN();
    expect(parseMoney('-3', 'USD')).toBeNaN();
  });
  it('formats minor units for people', () => {
    expect(formatMoney(1250, 'USD', 'en')).toBe('$12.50');
  });
});
