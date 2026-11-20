import { VoicePanel } from '../voice/VoicePanel.jsx';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery, useLiveTopic } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { useMe } from '../account/MeProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { SelectField, TextAreaField } from '../../components/ui/Field.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Bone, Lines } from '../../components/ui/Skeleton.jsx';
import { WeeklyScheduleEditor } from '../schedule/WeeklyScheduleEditor.jsx';
import { clockLabel, dayOrder, durationLabel, sameWeek, slotsFromWeek, studyDays, weekFromSlots, weekdayName, zonedDay } from '../schedule/week.js';
import styles from './Circles.module.css';
import learn from './Learning.module.css';

const TOTAL_AYAT = 6236;

function useSurahNames() {
  const { locale } = useI18n();
  const surahs = useApiQuery('/api/v1/quran/surahs').data ?? [];
  return (number) => {
    const surah = surahs.find((s) => s.number === number);
    return surah ? (locale === 'ar' ? surah.nameAr : surah.nameEn) : '';
  };
}

/** "Al-Mulk 1–10" or "Al-Mulk 25 – Al-Qalam 12". */
function RangeText({ range, surahName }) {
  const { formatters } = useI18n();
  const n = formatters.integer;
  if (range.startSurah === range.endSurah) return `${surahName(range.startSurah)} ${n(range.startAyah)}–${n(range.endAyah)}`;
  return `${surahName(range.startSurah)} ${n(range.startAyah)} – ${surahName(range.endSurah)} ${n(range.endAyah)}`;
}

function PanelBones({ rows = 3 }) {
  return (
    <span className={learn.sessionList} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} height="3.5rem" radius="md" />
      ))}
    </span>
  );
}

// ---- The week's sessions (everyone in the circle) --------------------------------------------
/**
 * Sessions repeat every week at the same local time, so they are shown as a
 * timetable (day, time, length), never as calendar dates. Today's row carries
 * the action for today's occurrence: enter when live, open it (staff), or
 * when it starts.
 */
export function SessionsPanel({ circle, staff }) {
  const { t, locale, formatters } = useI18n();
  const schedule = useApiQuery(`/api/v1/circles/${circle.id}/schedules`);
  const sessions = useApiQuery(`/api/v1/circles/${circle.id}/sessions`);
  useLiveTopic(staff || circle.myMembership?.status === 'active' ? `circle:${circle.id}` : null, sessions.reload);
  useLiveTopic(staff || circle.myMembership?.status === 'active' ? `circle:${circle.id}` : null, schedule.reload, { fallbackMs: 0 });
  const [now] = useState(() => Date.now());

  const loading = schedule.status === 'loading' || sessions.status === 'loading';
  const failed = schedule.status === 'error' ? schedule : sessions.status === 'error' ? sessions : null;
  const slots = schedule.data ?? [];
  const occurrences = (sessions.data ?? []).filter((s) => s.status !== 'cancelled');
  const today = zonedDay(now, circle.timeZone);
  const todays = occurrences.filter((s) => zonedDay(s.startsAt, circle.timeZone).date === today.date);
  const live = occurrences.find((s) => s.status === 'live');
  const offDays = dayOrder(locale).filter((d) => !slots.some((s) => s.weekday === d));

  return (
    <section className={styles.panel} aria-labelledby="sessions-title">
      <h2 id="sessions-title" className={styles.panelTitle}>
        {t('learning.sessionsTitle')}
      </h2>
      {loading && <PanelBones rows={3} />}
      {failed && <LoadError error={failed.error} onRetry={failed.reload} />}
      {!loading && !failed && live && (
        <div className={learn.liveBanner} role="status">
          <span className={learn.liveDot} aria-hidden="true" />
          <span className={learn.liveText}>{t('learning.liveNow')}</span>
          <Button size="sm" to={`/sessions/${live.id}`}>
            {t('learning.enter')}
          </Button>
        </div>
      )}
      {!loading && !failed && slots.length === 0 && <EmptyState title={t('learning.noTimetable')} body={staff ? t('learning.noTimetableStaff') : undefined} />}
      {!loading && !failed && slots.length > 0 && (
        <>
          <p className={styles.muted}>{t('learning.weeklyHelp', { zone: formatters.timeZoneName(circle.timeZone) })}</p>
          <ul className={learn.sessionList}>
            {dayOrder(locale)
              .map((d) => slots.find((s) => s.weekday === d))
              .filter(Boolean)
              .map((slot) => {
                const isToday = slot.weekday === today.weekday;
                const occurrence = isToday ? todays.find((s) => s.status === 'live') ?? todays.find((s) => s.status === 'scheduled') ?? todays.find((s) => s.status === 'ended') : null;
                return (
                  <li key={slot.id} className={learn.sessionItem} data-live={occurrence?.status === 'live'} data-today={isToday}>
                    <span className={learn.when}>
                      <span className={learn.whenDay}>
                        {weekdayName(locale, slot.weekday)}
                        {isToday && <span className={learn.todayTag}>{t('learning.today')}</span>}
                      </span>
                      <span className={styles.muted}>
                        {clockLabel(formatters.tag, slot.localStart)} · {durationLabel(t, slot.durationMinutes)}
                      </span>
                    </span>
                    {occurrence && (
                      <span className={styles.rowActions}>
                        {occurrence.status !== 'scheduled' && <StatusBadge status={occurrence.status} />}
                        {occurrence.status === 'live' && (
                          <Button size="sm" to={`/sessions/${occurrence.id}`}>
                            {t('learning.enter')}
                          </Button>
                        )}
                        {occurrence.status === 'ended' && staff && (
                          <Button size="sm" variant="secondary" to={`/sessions/${occurrence.id}`}>
                            {t('learning.goToSession')}
                          </Button>
                        )}
                        {occurrence.status === 'scheduled' && (
                          <Button size="sm" variant={staff ? 'primary' : 'secondary'} to={`/sessions/${occurrence.id}`}>
                            {staff ? t('learning.goToSession') : t('learning.view')}
                          </Button>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
          {offDays.length > 0 && <p className={styles.muted}>{t('schedule.offList', { days: offDays.map((d) => weekdayName(locale, d)).join(t('schedule.listSeparator')) })}</p>}
        </>
      )}
    </section>
  );
}

// ---- Weekly timetable (Sheikhs and managers) ---------------------------------------------------
export function SchedulePanel({ circle }) {
  const { t, formatters } = useI18n();
  const query = useApiQuery(`/api/v1/circles/${circle.id}/schedules`);
  const save = useMutation();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const loaded = query.data ? weekFromSlots(query.data) : null;
  const week = draft ?? loaded;
  const dirty = Boolean(draft && loaded && !sameWeek(draft, loaded));

  async function submit() {
    setSaved(false);
    // Pausing the circle (settings) is how teaching stops; a timetable has at least one day.
    if (studyDays(week).length === 0) return setError(t('schedule.chooseOneDay'));
    setError(null);
    const result = await save.run('save', (api) => api.put(`/api/v1/circles/${circle.id}/schedule`, { slots: slotsFromWeek(week) }));
    if (result) {
      query.setData(result);
      setDraft(null);
      setSaved(true);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="schedule-title">
      <h2 id="schedule-title" className={styles.panelTitle}>
        {t('learning.schedulesTitle')}
      </h2>
      <p className={styles.muted}>{t('learning.timesIn', { zone: formatters.timeZoneName(circle.timeZone) })}</p>
      {query.status === 'loading' && <PanelBones rows={4} />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {week && (
        <>
          <WeeklyScheduleEditor
            key={query.data?.map((s) => s.id).join()}
            value={week}
            onChange={(next) => {
              setSaved(false);
              setError(null);
              setDraft(next);
            }}
            error={error}
          />
          {save.error && <Alert tone="danger">{errorMessage(t, save.error)}</Alert>}
          {saved && <Alert tone="success">{t('schedule.saved')}</Alert>}
          <span className={styles.rowActions}>
            <Button loading={save.busy === 'save'} disabled={!dirty} onClick={submit}>
              {t('schedule.save')}
            </Button>
            {dirty && (
              <Button variant="quiet" onClick={() => setDraft(null)}>
                {t('schedule.discard')}
              </Button>
            )}
          </span>
          <p className={styles.muted}>{t('schedule.changeHelp')}</p>
        </>
      )}
    </section>
  );
}

// ---- Progress (students) -------------------------------------------------------------------
export function ProgressPanel({ circle }) {
  const { t, formatters } = useI18n();
  const progress = useApiQuery(`/api/v1/circles/${circle.id}/progress`);
  const history = useApiQuery(`/api/v1/me/recitations?circleId=${circle.id}`);
  const surahName = useSurahNames();
  const p = progress.data;
  const attended = p ? p.attendance.present + p.attendance.late : 0;
  const share = p ? Math.min(100, (p.memorizedAyat / TOTAL_AYAT) * 100) : 0;

  return (
    <section className={styles.panel} aria-labelledby="progress-title">
      <h2 id="progress-title" className={styles.panelTitle}>
        {t('learning.progressTitle')}
      </h2>
      {progress.status === 'loading' && (
        <span className={learn.stats} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} height="5.5rem" radius="md" />
          ))}
        </span>
      )}
      {progress.status === 'error' && <LoadError error={progress.error} onRetry={progress.reload} />}
      {p && (
        <dl className={learn.stats}>
          <div className={learn.stat}>
            <dt>{t('learning.memorized')}</dt>
            <dd>{formatters.integer(p.memorizedAyat)}</dd>
            <span className={learn.meter} role="img" aria-label={`${formatters.number(Math.round(share * 10) / 10)}%`}>
              <span style={{ inlineSize: `${share}%` }} />
            </span>
            <span className={styles.muted}>{t('learning.ofQuran', { total: formatters.integer(TOTAL_AYAT) })}</span>
          </div>
          <div className={learn.stat}>
            <dt>{t('learning.recitationsDone')}</dt>
            <dd>{formatters.integer(p.recitations.completed)}</dd>
          </div>
          <div className={learn.stat}>
            <dt>{t('learning.attendanceRate')}</dt>
            <dd>{formatters.integer(attended)}</dd>
          </div>
          <div className={learn.stat}>
            <dt>{t('learning.revisionsDone')}</dt>
            <dd>{formatters.integer(p.revisionsCompleted)}</dd>
          </div>
        </dl>
      )}

      <h3 className={styles.panelTitle}>{t('learning.history')}</h3>
      {history.status === 'loading' && <Lines widths={['70%', '90%', '60%']} />}
      {history.status === 'error' && <LoadError error={history.error} onRetry={history.reload} />}
      {history.status === 'ready' && history.data.length === 0 && <EmptyState title={t('learning.noHistory')} body={t('learning.noHistoryBody')} />}
      {history.status === 'ready' && history.data.length > 0 && (
        <ol className={learn.history}>
          {history.data.slice(0, 10).map((r) => (
            <li key={r.id} className={learn.historyItem}>
              <span className={learn.historyHead}>
                <strong>
                  {r.ranges.map((range, i) => (
                    <span key={i}>
                      {i > 0 && '، '}
                      <RangeText range={range} surahName={surahName} />
                    </span>
                  ))}
                </strong>
                <StatusBadge status={r.outcome === 'completed' ? 'completed' : 'pending'} />
              </span>
              <span className={styles.muted}>
                {formatters.date(r.at, { dateStyle: 'medium' })}
                {r.sheikhName && ` · ${t('learning.withSheikh', { name: r.sheikhName })}`}
                {r.quality && ` · ${t(`sessions.qualities.${r.quality}`)}`}
                {r.outcome !== 'completed' && ` · ${t(`sessions.outcomes.${r.outcome}`)}`}
              </span>
              {r.feedback && (
                <p className={learn.feedback} dir="auto">
                  {r.feedback}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---- Peer revision (students) ------------------------------------------------------------------
export function RevisionPanel({ circle }) {
  const { t, formatters } = useI18n();
  const { me } = useMe();
  const members = useApiQuery(`/api/v1/circles/${circle.id}/members`);
  const revisions = useApiQuery('/api/v1/me/revisions');
  useLiveTopic(me ? `user:${me.id}` : null, revisions.reload);
  const send = useMutation();
  const act = useMutation();
  const [invitee, setInvitee] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const classmates = members.data?.filter((m) => m.status === 'active' && m.student.id !== me?.id) ?? [];
  const mine = revisions.data?.filter((r) => r.circle.id === circle.id) ?? [];

  async function submit(event) {
    event.preventDefault();
    setSent(false);
    setError(invitee ? null : t('learning.chooseClassmate'));
    if (!invitee) return;
    const body = { inviteeId: invitee, ...(message.trim() ? { message: message.trim() } : {}) };
    if (await send.run('send', (api) => api.post(`/api/v1/circles/${circle.id}/revisions`, body))) {
      setInvitee('');
      setMessage('');
      setSent(true);
      revisions.reload();
    }
  }

  async function respond(id, action) {
    const result = await act.run(`${id}:${action}`, (api) => api.post(`/api/v1/revisions/${id}/${action}`, {}));
    revisions.reload();
    return result;
  }

  return (
    <section className={styles.panel} aria-labelledby="revision-title">
      <h2 id="revision-title" className={styles.panelTitle}>
        {t('learning.revisionTitle')}
      </h2>
      <p className={styles.muted}>{t('learning.revisionHelp')}</p>
      {act.error && <Alert tone="danger">{errorMessage(t, act.error)}</Alert>}
      {mine.length > 0 && (
        <ul className={styles.rows}>
          {mine.map((r) => {
            const other = r.incoming ? r.requester.name : r.invitee.name;
            const label = r.status === 'accepted' ? t('learning.acceptedWith', { name: other }) : r.incoming ? t('learning.incoming', { name: other }) : t('learning.outgoing', { name: other });
            return (
              <li key={r.id} className={styles.row}>
                <span>
                  {label}
                  {r.message && (
                    <span className={styles.muted} dir="auto">
                      {' · '}
                      {r.message}
                    </span>
                  )}
                  {r.status === 'pending' && <span className={styles.muted}> · {formatters.dateTime(r.expiresAt, { dateStyle: undefined })}</span>}
                </span>
                <span className={styles.rowActions}>
                  {r.status === 'pending' && r.incoming && (
                    <>
                      <Button size="sm" loading={act.busy === `${r.id}:accept`} onClick={() => respond(r.id, 'accept')}>
                        {t('learning.accept')}
                      </Button>
                      <Button size="sm" variant="secondary" loading={act.busy === `${r.id}:decline`} onClick={() => respond(r.id, 'decline')}>
                        {t('learning.decline')}
                      </Button>
                    </>
                  )}
                  {r.status === 'pending' && !r.incoming && (
                    <Button size="sm" variant="quiet" loading={act.busy === `${r.id}:cancel`} onClick={() => respond(r.id, 'cancel')}>
                      {t('learning.cancel')}
                    </Button>
                  )}
                  {r.status === 'accepted' && (
                    <Button size="sm" loading={act.busy === `${r.id}:complete`} onClick={() => respond(r.id, 'complete')}>
                      {t('learning.complete')}
                    </Button>
                  )}
                </span>
                {r.status === 'accepted' && (
                  <span className={styles.revisionVoice}>
                    <VoicePanel tokenPath={`/api/v1/revisions/${r.id}/voice/token`} title={t('voice.revisionTitle', { name: other })} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {members.status === 'loading' && <Lines widths={['40%', '100%']} />}
      {members.status === 'ready' && classmates.length === 0 && <p className={styles.muted}>{t('learning.noClassmates')}</p>}
      {members.status === 'ready' && classmates.length > 0 && (
        <form className={styles.form} onSubmit={submit} noValidate>
          {send.error && <Alert tone="danger">{errorMessage(t, send.error)}</Alert>}
          {sent && <Alert tone="success">{t('learning.revisionSent')}</Alert>}
          <SelectField label={t('learning.classmate')} value={invitee} onChange={(e) => setInvitee(e.target.value)} error={error}>
            <option value="" disabled>
              {t('learning.chooseClassmate')}
            </option>
            {classmates.map((m) => (
              <option key={m.student.id} value={m.student.id}>
                {m.student.name}
              </option>
            ))}
          </SelectField>
          <TextAreaField label={t('learning.revisionMessage')} optional hint={t('learning.revisionMessageHint')} rows={2} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} />
          <span>
            <Button type="submit" variant="secondary" loading={send.busy === 'send'}>
              {t('learning.requestRevision')}
            </Button>
          </span>
        </form>
      )}
    </section>
  );
}

// ---- Chat (members and staff) --------------------------------------------------------------------
function MessagesSkeleton() {
  return (
    <span className={learn.messages} aria-hidden="true">
      {['60%', '45%', '70%'].map((w, i) => (
        <span key={i} className={learn.bubbleBone} style={{ justifySelf: i === 1 ? 'end' : 'start', inlineSize: w }}>
          <Lines size="small" widths={['5rem']} />
          <Bone height="2.5rem" radius="md" />
        </span>
      ))}
    </span>
  );
}

function ChannelView({ circle, channel, staff, onRead }) {
  const { t, formatters } = useI18n();
  const query = useApiQuery(`/api/v1/circles/${circle.id}/messages?channel=${channel}`);
  useLiveTopic(`circle:${circle.id}`, query.reload, { fallbackMs: 30_000 });
  const send = useMutation();
  const remove = useMutation();
  const [body, setBody] = useState('');
  const listRef = useRef(null);
  const count = query.data?.length ?? 0;
  const canPost = channel === 'discussion' || staff;

  // Keep the newest message in view, and record that this channel was read.
  useEffect(() => {
    if (!count) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    onRead(channel);
  }, [count, channel, onRead]);

  async function submit(event) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (await send.run('send', (api) => api.post(`/api/v1/circles/${circle.id}/messages`, { channel, body: text }))) {
      setBody('');
      query.reload();
    }
  }

  async function removeMessage(id) {
    if (await remove.run(id, (api) => api.delete(`/api/v1/circles/${circle.id}/messages/${id}`))) {
      query.setData((rows) => rows.map((m) => (m.id === id ? { ...m, deleted: true, body: null } : m)));
    }
  }

  return (
    <div className={styles.form}>
      {query.status === 'loading' && <MessagesSkeleton />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' && query.data.length === 0 && <EmptyState title={t('learning.noMessages')} body={t('learning.noMessagesBody')} />}
      {query.status === 'ready' && query.data.length > 0 && (
        <ol className={learn.messages} ref={listRef} aria-live="polite" aria-relevant="additions">
          {query.data.map((m) => (
            <li key={m.id} className={learn.message} data-mine={m.mine} data-deleted={m.deleted}>
              <span className={learn.sender}>
                <span className={learn.senderName}>{m.mine ? t('learning.you') : m.sender.name}</span>
                {m.sender.staff && <span className={learn.tag}>{t('learning.sheikhTag')}</span>}
                <time dateTime={m.at}>{formatters.dateTime(m.at, { dateStyle: undefined })}</time>
              </span>
              <p className={learn.bubble} dir="auto">
                {m.deleted ? t('learning.deletedMessage') : m.body}
              </p>
              {!m.deleted && (m.mine || staff) && (
                <button type="button" className={learn.linkButton} onClick={() => removeMessage(m.id)} disabled={remove.busy === m.id}>
                  {t('learning.deleteMessage')}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {remove.error && <Alert tone="danger">{errorMessage(t, remove.error)}</Alert>}
      {canPost ? (
        <form className={learn.composer} onSubmit={submit} noValidate>
          {send.error && <Alert tone="danger">{errorMessage(t, send.error)}</Alert>}
          <TextAreaField
            label={t('learning.messageLabel')}
            placeholder={t('learning.messagePlaceholder')}
            rows={2}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a line (not while composing with an IME).
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
            }}
          />
          <Button type="submit" loading={send.busy === 'send'} disabled={!body.trim()}>
            {t('learning.send')}
          </Button>
        </form>
      ) : (
        <p className={styles.muted}>{t('learning.readOnlyChat')}</p>
      )}
    </div>
  );
}

export function ChatPanel({ circle, staff }) {
  const { t } = useI18n();
  const [channel, setChannel] = useState('discussion');
  const unread = useApiQuery(`/api/v1/circles/${circle.id}/unread`);
  useLiveTopic(`circle:${circle.id}`, unread.reload, { fallbackMs: 60_000 });
  const mark = useMutation();
  const { run } = mark;
  const { setData } = unread;
  // Stable across renders so ChannelView's effect only fires on new messages.
  const [onRead] = useState(() => (name) => {
    setData((counts) => (counts ? { ...counts, [name]: 0 } : counts));
    run(`read:${name}`, (api) => api.post(`/api/v1/circles/${circle.id}/read`, { channel: name }));
  });
  const tabs = [
    { id: 'discussion', label: t('learning.discussion'), count: channel === 'discussion' ? 0 : unread.data?.discussion },
    { id: 'announcements', label: t('learning.announcements'), count: channel === 'announcements' ? 0 : unread.data?.announcements },
  ];

  return (
    <section className={styles.panel} aria-labelledby="chat-title">
      <h2 id="chat-title" className={styles.panelTitle}>
        {t('learning.chatTitle')}
      </h2>
      <Tabs tabs={tabs} selected={channel} onSelect={setChannel} label={t('learning.chatTitle')}>
        <ChannelView key={channel} circle={circle} channel={channel} staff={staff} onRead={onRead} />
      </Tabs>
    </section>
  );
}
