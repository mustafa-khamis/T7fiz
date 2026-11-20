import { useId, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DEFAULT_DURATION, DEFAULT_TIME, DURATIONS, clockLabel, dayOrder, durationLabel, studyDays, weekdayName } from './week.js';
import styles from './Schedule.module.css';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * Hour, minute and morning/evening as three plain choices: easier than a
 * native time input for people who rarely use forms, and the same in every
 * browser and in right-to-left layouts.
 */
export function TimePicker({ value, onChange, label }) {
  const { t, formatters } = useI18n();
  const [h24, minute] = value.split(':').map(Number);
  const evening = h24 >= 12;
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const set = (hour, min, pm) => {
    const h = (hour % 12) + (pm ? 12 : 0);
    onChange(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  };
  const two = (n) => (n < 10 ? formatters.integer(0) : '') + formatters.integer(n);
  return (
    <div role="group" aria-label={label} className={styles.time}>
      <select className={styles.select} aria-label={t('schedule.hour')} value={hour12} onChange={(e) => set(Number(e.target.value), minute, evening)}>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {formatters.integer(h)}
          </option>
        ))}
      </select>
      <span className={styles.colon} aria-hidden="true">
        :
      </span>
      <select className={styles.select} aria-label={t('schedule.minute')} value={minute - (minute % 5)} onChange={(e) => set(hour12, Number(e.target.value), evening)}>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {two(m)}
          </option>
        ))}
      </select>
      <span className={styles.period}>
        {[false, true].map((pm) => (
          <button key={String(pm)} type="button" className={styles.periodButton} aria-pressed={evening === pm} onClick={() => set(hour12, minute, pm)}>
            {pm ? t('schedule.pm') : t('schedule.am')}
          </button>
        ))}
      </span>
    </div>
  );
}

export function DurationPicker({ value, onChange, label }) {
  const { t } = useI18n();
  const options = DURATIONS.includes(value) ? DURATIONS : [...DURATIONS, value].sort((a, b) => a - b);
  return (
    <select className={styles.select} aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((m) => (
        <option key={m} value={m}>
          {durationLabel(t, m)}
        </option>
      ))}
    </select>
  );
}

/**
 * The week at a glance: every day is either a study day (start time and
 * duration) or a day off. "Same time for every day" fills all study days at
 * once — the common case — and individual days can still differ.
 */
export function WeeklyScheduleEditor({ value, onChange, error }) {
  const { t, locale, formatters } = useI18n();
  const ids = useId();
  const first = studyDays(value)[0];
  const [common, setCommon] = useState({ time: first ? value[first].time : DEFAULT_TIME, duration: first ? value[first].duration : DEFAULT_DURATION });
  const [applied, setApplied] = useState(false);
  const update = (day, patch) => {
    setApplied(false);
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  };
  const applyToAll = () => {
    onChange(Object.fromEntries(Object.entries(value).map(([day, entry]) => [day, entry.on ? { ...entry, time: common.time, duration: common.duration } : entry])));
    setApplied(true);
  };
  const days = studyDays(value);
  const off = dayOrder(locale).filter((d) => !value[d].on);

  return (
    <div className={styles.editor}>
      <div className={styles.common}>
        <p className={styles.commonTitle} id={`${ids}-common`}>
          {t('schedule.sameForAll')}
        </p>
        <div className={styles.commonControls} role="group" aria-labelledby={`${ids}-common`}>
          <div className={styles.inline}>
            <span className={styles.inlineLabel} aria-hidden="true">{t('schedule.startsAt')}</span>
            <TimePicker label={t('schedule.startsAt')} value={common.time} onChange={(time) => setCommon({ ...common, time })} />
          </div>
          <div className={styles.inline}>
            <span className={styles.inlineLabel} aria-hidden="true">{t('schedule.duration')}</span>
            <DurationPicker label={t('schedule.duration')} value={common.duration} onChange={(duration) => setCommon({ ...common, duration })} />
          </div>
          <Button variant="secondary" size="sm" onClick={applyToAll} disabled={days.length === 0}>
            {t('schedule.applyToAll')}
          </Button>
        </div>
        <p className={styles.note} role="status">
          {applied ? t('schedule.applied', { time: clockLabel(formatters.tag, common.time), duration: durationLabel(t, common.duration) }) : t('schedule.sameForAllHelp')}
        </p>
      </div>

      <ul className={styles.days} aria-label={t('schedule.weekLabel')}>
        {dayOrder(locale).map((day) => {
          const entry = value[day];
          const name = weekdayName(locale, day);
          return (
            <li key={day} className={styles.day} data-off={!entry.on}>
              <button type="button" role="switch" aria-checked={entry.on} className={styles.switch} onClick={() => update(day, { on: !entry.on })}>
                <span className={styles.track} aria-hidden="true">
                  <span className={styles.thumb} />
                </span>
                <span className={styles.dayName}>{name}</span>
                <span className="visually-hidden">{entry.on ? t('schedule.studyDay') : t('schedule.dayOff')}</span>
              </button>
              {entry.on ? (
                <span className={styles.dayControls}>
                  <TimePicker label={t('schedule.startsAtDay', { day: name })} value={entry.time} onChange={(time) => update(day, { time })} />
                  <DurationPicker label={t('schedule.durationDay', { day: name })} value={entry.duration} onChange={(duration) => update(day, { duration })} />
                </span>
              ) : (
                <span className={styles.offLabel}>{t('schedule.dayOff')}</span>
              )}
            </li>
          );
        })}
      </ul>

      <p className={error ? styles.error : styles.note} role={error ? 'alert' : undefined}>
        {error ??
          (days.length === 0
            ? t('schedule.noDays')
            : t('schedule.summary', { count: days.length, off: off.length ? t('schedule.offList', { days: off.map((d) => weekdayName(locale, d)).join(t('schedule.listSeparator')) }) : t('schedule.noDaysOff') }))}
      </p>
    </div>
  );
}
