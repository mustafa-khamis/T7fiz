import { describe, expect, it } from 'vitest';
import { invalidRanges, parseAyah } from '../src/features/sessions/ranges.js';

const surahs = [
  { number: 1, ayahCount: 7 },
  { number: 2, ayahCount: 286 },
  { number: 67, ayahCount: 30 },
];

describe('ayah ranges', () => {
  it('reads Arabic-Indic, Persian and ASCII digits', () => {
    expect(parseAyah('١٢')).toBe(12);
    expect(parseAyah('۱۲')).toBe(12);
    expect(parseAyah(' 7 ')).toBe(7);
    expect(parseAyah('')).toBeNaN();
    expect(parseAyah('3a')).toBeNaN();
  });

  it('accepts real passages, including across surahs', () => {
    expect(invalidRanges([{ startSurah: '67', startAyah: '1', endSurah: '67', endAyah: '30' }], surahs)).toEqual([]);
    expect(invalidRanges([{ startSurah: '1', startAyah: '5', endSurah: '2', endAyah: '٥' }], surahs)).toEqual([]);
  });

  it('flags ayat outside the surah, zero, empty and backwards passages', () => {
    const ranges = [
      { startSurah: '1', startAyah: '1', endSurah: '1', endAyah: '8' },
      { startSurah: '67', startAyah: '0', endSurah: '67', endAyah: '3' },
      { startSurah: '67', startAyah: '', endSurah: '67', endAyah: '3' },
      { startSurah: '67', startAyah: '10', endSurah: '67', endAyah: '2' },
      { startSurah: '2', startAyah: '1', endSurah: '1', endAyah: '7' },
    ];
    expect(invalidRanges(ranges, surahs)).toEqual([0, 1, 2, 3, 4]);
  });
});
