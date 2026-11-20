/**
 * The weekly timetable as the screens see it: one entry per weekday (ISO,
 * Monday = 1), each either a study day with a start time and duration, or a
 * day off. Sessions have no calendar date of their own (owner decision
 * 2026-11-19); they repeat every week at the same local time.
 */
export const FRIDAY = 5;
export const DEFAULT_TIME = '18:00';
export const DEFAULT_DURATION = 60;
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
/** Durations offered in the picker, in minutes. */
export const DURATIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300, 360];

/** Arabic calendars start the week on Saturday; English ones on Monday. */
export function dayOrder(locale) {
  return locale === 'ar' ? [6, 7, 1, 2, 3, 4, 5] : WEEKDAYS;
}

/** A new circle studies every day at the same time, with Friday off. */
export function defaultWeek(time = DEFAULT_TIME, duration = DEFAULT_DURATION) {
  return Object.fromEntries(WEEKDAYS.map((d) => [d, { on: d !== FRIDAY, time, duration }]));
}

export function weekFromSlots(slots = []) {
  const week = Object.fromEntries(WEEKDAYS.map((d) => [d, { on: false, time: DEFAULT_TIME, duration: DEFAULT_DURATION }]));
  for (const slot of slots) week[slot.weekday] = { on: true, time: slot.localStart.slice(0, 5), duration: slot.durationMinutes };
  return week;
}

export function slotsFromWeek(week) {
  return WEEKDAYS.filter((d) => week[d].on).map((d) => ({ weekday: d, localStart: week[d].time, durationMinutes: week[d].duration }));
}

export const studyDays = (week) => WEEKDAYS.filter((d) => week[d].on);
export const sameWeek = (a, b) => JSON.stringify(slotsFromWeek(a)) === JSON.stringify(slotsFromWeek(b));

/** "Saturday" for ISO weekday 6 (2024-01-01 was a Monday). */
export function weekdayName(locale, weekday, width = 'long') {
  return new Intl.DateTimeFormat(locale, { weekday: width, timeZone: 'UTC' }).format(Date.UTC(2024, 0, weekday));
}

/** "6:00 PM" / "6:00 م" for "18:00", in the reader's language and digits. */
export function clockLabel(tag, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Intl.DateTimeFormat(tag, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1, h, m));
}

/** "1 hour and a half", "45 minutes", "2 hours and 15 minutes". */
export function durationLabel(t, minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return t('schedule.minutes', { count: rest });
  if (rest === 0) return t('schedule.hours', { count: hours });
  if (rest === 30) return t('schedule.hoursAndHalf', { count: hours });
  return t('schedule.hoursAndMinutes', { hours: t('schedule.hours', { count: hours }), minutes: t('schedule.minutes', { count: rest }) });
}

/** ISO weekday and local date of an instant in a time zone. */
export function zonedDay(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[get('weekday')];
  return { weekday, date: `${get('year')}-${get('month')}-${get('day')}` };
}
