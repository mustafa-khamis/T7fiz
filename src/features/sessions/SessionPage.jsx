import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery, useLiveTopic } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { Lines } from '../../components/ui/Skeleton.jsx';
import { NotFoundPage } from '../../app/NotFoundPage.jsx';
import { invalidRanges, parseAyah } from './ranges.js';
import styles from './Sessions.module.css';
import { SessionSkeleton } from './SessionSkeletons.jsx';
import { VoicePanel } from '../voice/VoicePanel.jsx';

/** "Saturday, 6:00 PM": sessions repeat weekly, so they are named by weekday and time, never by date. */
const WEEKLY = { dateStyle: undefined, timeStyle: undefined, weekday: 'long', hour: 'numeric', minute: '2-digit' };

/** Seconds left until `iso`, ticking every second (null when there is no deadline). */
function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [iso]);
  return iso ? Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000)) : null;
}

function Clock({ seconds }) {
  const { formatters } = useI18n();
  const ss = formatters.integer(seconds % 60);
  return (
    <span className={styles.clock} role="timer">
      {formatters.integer(Math.floor(seconds / 60))}:{seconds % 60 < 10 ? formatters.integer(0) + ss : ss}
    </span>
  );
}

function NotLive({ session, children }) {
  const { t, formatters } = useI18n();
  return (
    <div className={styles.stage}>
      {session.status === 'scheduled' ? (
        <>
          <p className={styles.stageTitle}>{t('sessions.notStarted')}</p>
          <p className={styles.muted}>{t('sessions.startsAt', { time: formatters.dateTime(session.startsAt, WEEKLY) })}</p>
        </>
      ) : (
        <p className={styles.stageTitle}>{t(`sessions.over.${session.status}`)}</p>
      )}
      {children}
    </div>
  );
}

// ---- Visitors: ask to attend as a guest ----------------------------------------------
function VisitorStage({ session, reload }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const [reason, setReason] = useState('');
  const request = session.guestRequest;

  if (!['scheduled', 'live'].includes(session.status)) return <NotLive session={session} />;
  async function submit(event) {
    event.preventDefault();
    const body = reason.trim() ? { reason: reason.trim() } : {};
    if (await mutation.run('guest', (api) => api.post(`/api/v1/sessions/${session.id}/guests`, body))) reload();
  }
  return (
    <div className={styles.stage}>
      <p className={styles.stageTitle}>{t('sessions.visitorTitle')}</p>
      {request?.status === 'pending' && <Alert tone="info">{t('sessions.guestPending')}</Alert>}
      {request?.status === 'rejected' && <Alert tone="warning">{t('sessions.guestRejected')}</Alert>}
      {!request && (
        <form className={styles.form} onSubmit={submit} noValidate>
          <p className={styles.muted}>{t('sessions.visitorHelp')}</p>
          {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
          <TextAreaField label={t('sessions.guestReason')} optional rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <span>
            <Button type="submit" loading={mutation.busy === 'guest'}>
              {t('sessions.requestGuest')}
            </Button>
          </span>
        </form>
      )}
    </div>
  );
}

// ---- Students and approved guests -----------------------------------------------------
function StudentStage({ session, reload }) {
  const { t, formatters } = useI18n();
  const mutation = useMutation();
  const queue = session.queue;
  const mine = queue?.mine;
  const left = useCountdown(mine?.status === 'invited' ? mine.inviteExpiresAt : null);
  // Refresh after failures too: most conflicts mean the line moved in the meantime.
  const act = (key, fn) => mutation.run(key, fn).then(reload);
  const base = `/api/v1/sessions/${session.id}`;

  if (session.status !== 'live') {
    return <NotLive session={session}>{session.myAttendance && <StatusBadge status={session.myAttendance} />}</NotLive>;
  }
  if (!session.myAttendance) {
    return (
      <div className={styles.stage}>
        <p className={styles.stageTitle}>{t('sessions.liveNow')}</p>
        <p className={styles.muted}>{t('sessions.joinHelp')}</p>
        {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
        <Button
          loading={mutation.busy === 'join'}
          onClick={async () => {
            // Joining the session also enters its audio room: one step for students.
            // Once joined, the page enters the session's audio room by itself.
            await mutation.run('join', (api) => api.post(`${base}/join`, {}));
            reload();
          }}
        >
          {t('sessions.join')}
        </Button>
      </div>
    );
  }

  const someoneElse = queue?.current && queue.current.requestId !== mine?.requestId;
  return (
    <div className={styles.stage} aria-live="polite">
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {someoneElse && <p className={styles.muted}>{t('sessions.nowReciting', { name: queue.current.studentName })}</p>}
      {!mine && (
        <>
          <p className={styles.stageTitle}>{t('sessions.queueOpen')}</p>
          <p className={styles.muted}>{t('sessions.waitingCount', { count: queue?.waitingCount ?? 0 })}</p>
          <Button loading={mutation.busy === 'request'} onClick={() => act('request', (api) => api.post(`${base}/queue`, {}))}>
            {t('sessions.requestRecitation')}
          </Button>
        </>
      )}
      {mine?.status === 'waiting' && (
        <>
          <p className={styles.position}>
            <span className={styles.positionNumber}>{formatters.integer(mine.position)}</span>
            <span>{t('sessions.yourPosition')}</span>
          </p>
          <p className={styles.muted}>
            {t('sessions.ahead', { count: mine.ahead })}
            {mine.estimatedWaitSeconds !== null && ` · ${t('sessions.estimate', { minutes: formatters.integer(Math.max(1, Math.round(mine.estimatedWaitSeconds / 60))) })}`}
          </p>
          <Button variant="quiet" size="sm" loading={mutation.busy === 'cancel'} onClick={() => act('cancel', (api) => api.delete(`${base}/queue`))}>
            {t('sessions.leaveQueue')}
          </Button>
        </>
      )}
      {mine?.status === 'invited' && (
        <div className={styles.turn} role="alert">
          <p className={styles.stageTitle}>{t('sessions.yourTurn')}</p>
          <p>
            {t('sessions.turnExpires')} <Clock seconds={left ?? 0} />
          </p>
          <Button loading={mutation.busy === 'start'} onClick={() => act('start', (api) => api.post(`${base}/queue/start`, {}))}>
            {t('sessions.startReciting')}
          </Button>
        </div>
      )}
      {mine?.status === 'in_progress' && (
        <div className={styles.turn}>
          <p className={styles.stageTitle}>{t('sessions.withSheikh')}</p>
          <p className={styles.muted}>{t('sessions.withSheikhHelp')}</p>
        </div>
      )}
    </div>
  );
}

// ---- Sheikh -------------------------------------------------------------------------------
function SurahSelect({ label, value, onChange, surahs }) {
  const { locale, formatters } = useI18n();
  return (
    <SelectField label={label} value={value} onChange={onChange}>
      {surahs.map((s) => (
        <option key={s.number} value={s.number}>
          {formatters.integer(s.number)}. {locale === 'ar' ? s.nameAr : s.nameEn}
        </option>
      ))}
    </SelectField>
  );
}

function RangeRow({ range, surahs, onChange, onRemove, index, invalid }) {
  const { t, formatters } = useI18n();
  const ayahs = (number) => surahs.find((s) => s.number === Number(number))?.ayahCount ?? 0;
  const set = (name) => (event) => onChange({ ...range, [name]: event.target.value });
  const ayahProps = { inputMode: 'numeric', autoComplete: 'off', dir: 'ltr', maxLength: 3, 'aria-invalid': invalid || undefined };
  return (
    <fieldset className={styles.range}>
      <legend className={styles.legend}>{t('sessions.rangeN', { n: formatters.integer(index + 1) })}</legend>
      <div className={styles.rangeGrid}>
        <SurahSelect label={t('sessions.fromSurah')} value={range.startSurah} onChange={set('startSurah')} surahs={surahs} />
        <TextField label={t('sessions.fromAyah')} {...ayahProps} value={range.startAyah} onChange={set('startAyah')} hint={t('sessions.ayahOf', { count: ayahs(range.startSurah) })} />
        <SurahSelect label={t('sessions.toSurah')} value={range.endSurah} onChange={set('endSurah')} surahs={surahs} />
        <TextField label={t('sessions.toAyah')} {...ayahProps} value={range.endAyah} onChange={set('endAyah')} hint={t('sessions.ayahOf', { count: ayahs(range.endSurah) })} />
      </div>
      {onRemove && (
        <Button size="sm" variant="quiet" onClick={onRemove}>
          {t('sessions.removeRange')}
        </Button>
      )}
    </fieldset>
  );
}

function RecordForm({ session, current, onDone }) {
  const { t } = useI18n();
  const surahs = useApiQuery('/api/v1/quran/surahs').data ?? [];
  const mutation = useMutation();
  const [outcome, setOutcome] = useState('completed');
  const [quality, setQuality] = useState('good');
  const [feedback, setFeedback] = useState('');
  const [note, setNote] = useState('');
  const [ranges, setRanges] = useState([{ startSurah: '1', startAyah: '1', endSurah: '1', endAyah: '7' }]);
  const [invalid, setInvalid] = useState([]);

  async function submit(event) {
    event.preventDefault();
    const bad = invalidRanges(ranges, surahs);
    setInvalid(bad);
    if (bad.length) return;
    const payload = {
      studentId: current.studentId,
      outcome,
      quality,
      ...(feedback.trim() ? { feedbackToStudent: feedback.trim() } : {}),
      ...(note.trim() ? { privateNote: note.trim() } : {}),
      ranges: ranges.map((r) => ({ kind: 'new', startSurah: Number(r.startSurah), startAyah: parseAyah(r.startAyah), endSurah: Number(r.endSurah), endAyah: parseAyah(r.endAyah) })),
    };
    if (await mutation.run('record', (api) => api.post(`/api/v1/sessions/${session.id}/recitations`, payload))) onDone();
  }

  return (
    <form className={styles.record} onSubmit={submit} noValidate aria-labelledby="record-title">
      <h2 id="record-title" className={styles.panelTitle}>
        {t('sessions.recordFor', { name: current.studentName })}
      </h2>
      {invalid.length > 0 && <Alert tone="danger">{t('sessions.invalidAyah')}</Alert>}
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {ranges.map((range, index) => (
        <RangeRow
          key={index}
          index={index}
          range={range}
          surahs={surahs}
          invalid={invalid.includes(index)}
          onChange={(next) => setRanges((all) => all.map((r, i) => (i === index ? next : r)))}
          onRemove={ranges.length > 1 ? () => setRanges((all) => all.filter((_, i) => i !== index)) : null}
        />
      ))}
      {ranges.length < 10 && (
        <span>
          <Button size="sm" variant="secondary" onClick={() => setRanges((all) => [...all, { ...all.at(-1) }])}>
            {t('sessions.addRange')}
          </Button>
        </span>
      )}
      <div className={`${styles.rangeGrid} ${styles.even}`}>
        <SelectField label={t('sessions.outcome')} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          {['completed', 'incomplete', 'repeat_required'].map((o) => (
            <option key={o} value={o}>
              {t(`sessions.outcomes.${o}`)}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('sessions.quality')} value={quality} onChange={(e) => setQuality(e.target.value)}>
          {['excellent', 'very_good', 'good', 'acceptable', 'needs_work'].map((q) => (
            <option key={q} value={q}>
              {t(`sessions.qualities.${q}`)}
            </option>
          ))}
        </SelectField>
      </div>
      <TextAreaField label={t('sessions.feedback')} optional hint={t('sessions.feedbackHint')} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} rows={2} />
      <TextAreaField label={t('sessions.privateNote')} optional hint={t('sessions.privateNoteHint')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} />
      <span>
        <Button type="submit" loading={mutation.busy === 'record'}>
          {t('sessions.saveRecord')}
        </Button>
      </span>
    </form>
  );
}

function EndSession({ sessionId, onEnded }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <span>
        <Button variant="quiet" size="sm" onClick={() => setConfirming(true)}>
          {t('sessions.end')}
        </Button>
      </span>
    );
  }
  return (
    <div className={styles.confirm} role="group" aria-label={t('sessions.end')}>
      <p>{t('sessions.endWarning')}</p>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      <span className={styles.actions}>
        <Button variant="danger" size="sm" loading={mutation.busy === 'close'} onClick={() => mutation.run('close', (api) => api.post(`/api/v1/sessions/${sessionId}/close`, {})).then((r) => r && onEnded())}>
          {t('sessions.confirmEnd')}
        </Button>
        <Button variant="quiet" size="sm" onClick={() => setConfirming(false)}>
          {t('sessions.keepGoing')}
        </Button>
      </span>
    </div>
  );
}

function QueuePanel({ session, reload }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const queue = session.queue;
  const current = queue?.current;
  const left = useCountdown(current?.status === 'invited' ? current.inviteExpiresAt : null);
  const act = (key, fn) => mutation.run(key, fn).then(reload);
  const base = `/api/v1/sessions/${session.id}`;
  const waiting = queue?.line.filter((entry) => entry.status === 'waiting') ?? [];

  return (
    <section className={styles.panel} aria-labelledby="queue-title">
      <div className={styles.panelHead}>
        <h2 id="queue-title" className={styles.panelTitle}>
          {t('sessions.queue')}
        </h2>
        <span className={styles.muted} aria-live="polite">
          {t('sessions.waitingCount', { count: waiting.length })}
        </span>
      </div>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {current ? (
        <div className={styles.current}>
          <p>
            <strong>{current.studentName}</strong> · {t(`sessions.currentStatus.${current.status}`)}
            {left !== null && (
              <>
                {' · '}
                <Clock seconds={left} />
              </>
            )}
          </p>
          {current.status === 'invited' && (
            <Button size="sm" variant="secondary" loading={mutation.busy === 'skip'} onClick={() => act('skip', (api) => api.post(`${base}/queue/skip`, {}))}>
              {t('sessions.skip')}
            </Button>
          )}
          {current.status === 'in_progress' && (
            // Ends the turn without recording it; the student goes back to listening and may ask again.
            <Button size="sm" variant="secondary" loading={mutation.busy === 'stop'} onClick={() => act('stop', (api) => api.post(`${base}/queue/stop`, {}))}>
              {t('sessions.stopRecitation')}
            </Button>
          )}
        </div>
      ) : (
        <span>
          <Button disabled={waiting.length === 0} loading={mutation.busy === 'next'} onClick={() => act('next', (api) => api.post(`${base}/queue/next`, {}))}>
            {t('sessions.callNext')}
          </Button>
        </span>
      )}
      {waiting.length > 0 && (
        <ol className={styles.line}>
          {waiting.map((entry) => (
            <li key={entry.requestId}>
              {entry.studentName}
              {entry.kind === 'guest' && <span className={styles.muted}> · {t('sessions.guest')}</span>}
            </li>
          ))}
        </ol>
      )}
      {waiting.length === 0 && !current && <EmptyState title={t('sessions.queueEmpty')} />}
      <EndSession sessionId={session.id} onEnded={reload} />
    </section>
  );
}

function AttendancePanel({ session }) {
  const { t } = useI18n();
  const query = useApiQuery(`/api/v1/sessions/${session.id}/attendance`);
  useLiveTopic(`session:${session.id}`, query.reload, { fallbackMs: 0 });
  const mutation = useMutation();
  async function mark(userId, status) {
    const ok = await mutation.run(userId, (api) => api.put(`/api/v1/sessions/${session.id}/attendance`, { userId, status }));
    if (ok) query.setData((rows) => rows.map((row) => (row.userId === userId ? { ...row, status } : row)));
  }
  return (
    <section className={styles.panel} aria-labelledby="attendance-title">
      <h2 id="attendance-title" className={styles.panelTitle}>
        {t('sessions.attendance')}
      </h2>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      {query.status === 'loading' && <Lines widths={['70%', '60%', '65%']} />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' && query.data.length === 0 && <p className={styles.muted}>{t('sessions.noAttendees')}</p>}
      {query.status === 'ready' && query.data.length > 0 && (
        <ul className={styles.rows}>
          {query.data.map((row) => (
            <li key={row.userId} className={styles.row}>
              <span>
                {row.name}
                {row.kind === 'guest' && <span className={styles.muted}> · {t('sessions.guest')}</span>}
              </span>
              <select
                className={styles.inlineSelect}
                aria-label={t('sessions.attendanceFor', { name: row.name })}
                value={row.status ?? ''}
                disabled={mutation.busy === row.userId}
                onChange={(e) => mark(row.userId, e.target.value)}
              >
                <option value="" disabled>
                  {t('sessions.notMarked')}
                </option>
                {['present', 'late', 'absent', 'excused'].map((s) => (
                  <option key={s} value={s}>
                    {t(`sessions.attendanceStatus.${s}`)}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GuestsPanel({ session }) {
  const { t } = useI18n();
  const query = useApiQuery(`/api/v1/sessions/${session.id}/guests`);
  useLiveTopic(`session:${session.id}`, query.reload, { fallbackMs: 0 });
  const mutation = useMutation();
  async function decide(id, decision) {
    const result = await mutation.run(`${id}:${decision}`, (api) => api.post(`/api/v1/sessions/${session.id}/guests/${id}/${decision}`, {}));
    if (result) query.setData((rows) => rows.map((g) => (g.id === id ? { ...g, status: result.status } : g)));
  }
  if (query.status !== 'ready' || query.data.length === 0) return null;
  return (
    <section className={styles.panel} aria-labelledby="guests-title">
      <h2 id="guests-title" className={styles.panelTitle}>
        {t('sessions.guests')}
      </h2>
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      <ul className={styles.rows}>
        {query.data.map((g) => (
          <li key={g.id} className={styles.row}>
            <span>
              {g.name}
              {g.reason && (
                <span className={styles.muted} dir="auto">
                  {' · '}
                  {g.reason}
                </span>
              )}
            </span>
            {g.status === 'pending' ? (
              <span className={styles.actions}>
                <Button size="sm" loading={mutation.busy === `${g.id}:approve`} onClick={() => decide(g.id, 'approve')}>
                  {t('circles.approve')}
                </Button>
                <Button size="sm" variant="secondary" loading={mutation.busy === `${g.id}:reject`} onClick={() => decide(g.id, 'reject')}>
                  {t('circles.reject')}
                </Button>
              </span>
            ) : (
              <StatusBadge status={g.status} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StaffStage({ session, reload }) {
  const { t } = useI18n();
  const mutation = useMutation();
  const act = (key, fn) => mutation.run(key, fn).then(reload);
  const base = `/api/v1/sessions/${session.id}`;

  if (session.status === 'scheduled') {
    return (
      <NotLive session={session}>
        {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
        <span className={styles.actions}>
          <Button loading={mutation.busy === 'open'} onClick={() => act('open', (api) => api.post(`${base}/open`, {}))}>
            {t('sessions.open')}
          </Button>
          <Button variant="quiet" loading={mutation.busy === 'cancel'} onClick={() => act('cancel', (api) => api.post(`${base}/close`, {}))}>
            {t('sessions.cancelSession')}
          </Button>
        </span>
      </NotLive>
    );
  }
  if (session.status !== 'live') {
    return (
      <>
        <NotLive session={session}>
          {session.status === 'ended' && (
            <>
              {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
              <Button loading={mutation.busy === 'reopen'} onClick={() => act('reopen', (api) => api.post(`${base}/open`, {}))}>
                {t('sessions.startAgain')}
              </Button>
            </>
          )}
        </NotLive>
        {session.status === 'ended' && <AttendancePanel session={session} />}
      </>
    );
  }
  const current = session.queue?.current;
  return (
    <div className={styles.staffGrid}>
      <QueuePanel session={session} reload={reload} />
      {current?.status === 'in_progress' && <RecordForm key={current.requestId} session={session} current={current} onDone={reload} />}
      <AttendancePanel session={session} />
      <GuestsPanel session={session} />
    </div>
  );
}

const STAGES = { staff: StaffStage, visitor: VisitorStage, member: StudentStage, guest: StudentStage };

/** One learning session: the live room for students and guests, the control room for the Sheikh. */
export function SessionPage() {
  const { t, formatters } = useI18n();
  const { sessionId } = useParams();
  const query = useApiQuery(`/api/v1/sessions/${sessionId}`);
  useLiveTopic(`session:${sessionId}`, query.reload);

  if (query.status === 'loading') return <SessionSkeleton />;
  if (query.status === 'error' && query.error?.status === 404) return <NotFoundPage />;
  if (query.status === 'error') {
    return (
      <div className={styles.page}>
        <LoadError error={query.error} onRetry={query.reload} />
      </div>
    );
  }

  const session = query.data;
  const Stage = STAGES[session.role] ?? StudentStage;
  const staff = session.role === 'staff';
  // Audio is for people in the session: staff, and students or guests who joined.
  const inVoice = session.status === 'live' && (staff || Boolean(session.myAttendance));
  const current = session.queue?.current;
  const reciter = current?.status === 'in_progress' ? { userId: current.studentId, name: current.studentName } : null;
  return (
    <div className={styles.page}>
      <p className={styles.breadcrumb}>
        <Link to={`/circles/${session.circleId}`}>{session.circleName}</Link>
      </p>
      <header className={styles.header}>
        <h1 className={styles.title}>{session.title ?? t('sessions.sessionTitle')}</h1>
        <p className={styles.actions}>
          <StatusBadge status={session.status} />
          <span className={styles.muted}>{formatters.dateTime(session.startsAt, WEEKLY)}</span>
          {session.role === 'guest' && <span className={styles.muted}>· {t('sessions.youAreGuest')}</span>}
        </p>
      </header>
      {inVoice && (
        <VoicePanel
          tokenPath={`/api/v1/sessions/${session.id}/voice/token`}
          sessionId={session.id}
          staff={staff}
          // Everyone in a live session is in its audio room; the Sheikh speaks from the start.
          autoJoin
          micOnJoin={staff}
          reciting={session.queue?.mine?.status === 'in_progress'}
          reciter={reciter}
        />
      )}
      <Stage session={session} reload={query.reload} />
    </div>
  );
}
