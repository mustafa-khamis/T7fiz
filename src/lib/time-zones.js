/** IANA region time zones supported by this browser (plus UTC and `current`), sorted. */
export function timeZoneOptions(current) {
  let zones = [];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = [];
  }
  const set = new Set(['UTC', ...zones]);
  if (current) set.add(current);
  return [...set].sort();
}
