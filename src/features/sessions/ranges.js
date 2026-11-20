/** Accepts Arabic-Indic and Persian digits as well as ASCII ("١٢" → 12). */
export function parseAyah(value) {
  const ascii = String(value ?? '')
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  return /^\d{1,3}$/.test(ascii) ? Number(ascii) : NaN;
}

/**
 * Indexes of passages that cannot exist: an ayah outside its surah, or an end
 * before the start. `surahs` is the /quran/surahs list ({ number, ayahCount }).
 */
export function invalidRanges(ranges, surahs) {
  const count = (number) => surahs.find((s) => s.number === Number(number))?.ayahCount ?? 0;
  return ranges.flatMap((range, index) => {
    const startSurah = Number(range.startSurah);
    const endSurah = Number(range.endSurah);
    const startAyah = parseAyah(range.startAyah);
    const endAyah = parseAyah(range.endAyah);
    const valid =
      startAyah >= 1 &&
      startAyah <= count(startSurah) &&
      endAyah >= 1 &&
      endAyah <= count(endSurah) &&
      (startSurah < endSurah || (startSurah === endSurah && startAyah <= endAyah));
    return valid ? [] : [index];
  });
}
