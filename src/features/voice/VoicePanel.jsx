import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery, useLiveTopic } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { HandIcon, HeadphonesIcon, MicIcon, MicOffIcon } from '../../components/ui/icons.jsx';
import { useVoiceRoom } from './useVoiceRoom.js';
import styles from './Voice.module.css';

const STATUS_TONE = { connected: 'live', reconnecting: 'warn', connecting: 'warn' };
const ORDER = { staff: 0, peer: 1, student: 2 };

/** Animated sound bars while someone speaks; still, low bars otherwise. */
function SoundBars({ active }) {
  return (
    <span className={styles.bars} data-active={active} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function initials(name) {
  const words = (name || '?').trim().split(/\s+/);
  return words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2);
}

/** One person in the room, as a card (like a call tile, audio only). */
function Tile({ person, handRaised, reciting }) {
  const { t } = useI18n();
  const name = person.name || t('voice.someone');
  const state = person.speaking ? t('voice.speaking') : person.micOn ? t('voice.micOn') : person.canPublish ? t('voice.micOff') : t('voice.listening');
  return (
    <li className={styles.tile} data-speaking={person.speaking} data-staff={person.role === 'staff'} data-reciting={reciting}>
      {handRaised && (
        <span className={styles.handBadge}>
          <HandIcon size={18} />
          <span className="visually-hidden">{t('voice.handRaised')}</span>
        </span>
      )}
      <span className={styles.micBadge} data-on={person.micOn} aria-hidden="true">
        {person.micOn ? <MicIcon size={16} /> : <MicOffIcon size={16} />}
      </span>
      <span className={styles.avatar} aria-hidden="true">
        {initials(name)}
      </span>
      <span className={styles.tileName} dir="auto">
        {person.isLocal ? t('voice.you', { name }) : name}
      </span>
      <span className={styles.tileMeta}>
        {person.role === 'staff' && <span className={styles.roleTag}>{t('voice.roleStaff')}</span>}
        {reciting && <span className={styles.recitingTag}>{t('voice.reciting')}</span>}
        <SoundBars active={person.speaking} />
        <span className="visually-hidden">{state}</span>
      </span>
    </li>
  );
}

function ControlButton({ tone, pressed, onClick, disabled, icon, label }) {
  return (
    <button type="button" className={styles.control} data-tone={tone} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <span className={styles.controlIcon}>{icon}</span>
      <span className={styles.controlLabel}>{label}</span>
    </button>
  );
}

const LeaveIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M3 15.5c5-4.7 13-4.7 18 0l-2.2 2.3-3.3-1.6v-2.4a11 11 0 0 0-7 0v2.4l-3.3 1.6z" />
  </svg>
);

/**
 * The audio room for a live session (`sessionId`) or an accepted peer
 * revision. Laid out like a call: everyone as a card, whoever speaks
 * highlighted with moving sound bars, and a control bar (microphone, raise
 * hand, leave). Sessions add the floor: students raise a hand, staff give or
 * take it. When voice is not configured on the server the room renders nothing.
 */
/**
 * autoJoin       enter the room as soon as the panel shows (people already in a live session)
 * micOnJoin      open the microphone on entering (the Sheikh teaches by voice)
 * reciting       this student is reciting now: their microphone opens by itself
 * reciter        { userId, name } of the student reciting now, highlighted for everyone
 */
export function VoicePanel({ tokenPath, sessionId = null, staff = false, title, autoJoin = false, micOnJoin = false, reciting = false, reciter = null }) {
  const { t } = useI18n();
  const { audioContainer, ...voice } = useVoiceRoom(tokenPath);
  const floorPath = sessionId ? `/api/v1/sessions/${sessionId}/voice/floor` : null;
  const floor = useApiQuery(floorPath, { enabled: Boolean(floorPath) });
  useLiveTopic(sessionId ? `session:${sessionId}` : null, floor.reload, { fallbackMs: 0 });
  const mutation = useMutation();
  const { join } = voice;
  // Entered right after the user pressed "Join session": no second click needed.
  useEffect(() => {
    if (autoJoin) join({ mic: micOnJoin });
  }, [autoJoin, join, micOnJoin]);

  // The student's turn began (the server granted the floor): open the microphone once, so the Sheikh hears them.
  const micOpenedForTurn = useRef(false);
  const { status, canPublish, micOn, toggleMic } = voice;
  useEffect(() => {
    if (!reciting) {
      micOpenedForTurn.current = false;
      return;
    }
    if (status === 'connected' && canPublish && !micOn && !micOpenedForTurn.current) {
      micOpenedForTurn.current = true;
      toggleMic();
    }
  }, [reciting, status, canPublish, micOn, toggleMic]);

  if (floor.status === 'error' && floor.error?.code === 'VOICE_NOT_CONFIGURED') return null;
  if (voice.error?.code === 'VOICE_NOT_CONFIGURED') return null;

  const connected = voice.status === 'connected' || voice.status === 'reconnecting';
  const hands = floor.data?.hands ?? [];
  const speakers = floor.data?.speakers ?? [];
  const nameOf = (identity) => voice.participants.find((p) => p.identity === identity)?.name || t('voice.someone');
  const handRaised = Boolean(voice.identity && hands.includes(voice.identity));
  const base = sessionId ? `/api/v1/sessions/${sessionId}/voice` : null;
  const setHand = (raised) => mutation.run('hand', (api) => api.post(`${base}/hand`, { raised })).then(floor.reload);
  const setSpeaker = (userId, allow) => mutation.run(`${userId}:${allow}`, (api) => api.post(`${base}/speakers`, { userId, allow })).then(floor.reload);
  const errorText = voice.error && (typeof voice.error === 'string' ? t(`voice.errors.${voice.error}`) : errorMessage(t, voice.error));
  // The Sheikh first, then whoever is talking: the grid stays readable in big circles.
  const rank = (p) => (p.identity === reciter?.userId ? 0.5 : ORDER[p.role] ?? 3);
  const people = [...voice.participants].sort((a, b) => rank(a) - rank(b) || Number(b.speaking) - Number(a.speaking));

  return (
    <section className={styles.room} aria-labelledby="voice-title" data-connected={connected}>
      <div className={styles.head}>
        <h2 id="voice-title" className={styles.title}>
          <HeadphonesIcon />
          {title ?? t('voice.title')}
        </h2>
        <span className={styles.headMeta}>
          {connected && <span className={styles.count}>{t('voice.inRoom', { count: voice.participants.length })}</span>}
          {voice.status !== 'idle' && voice.status !== 'error' && (
            <span className={`${styles.state} ${styles[STATUS_TONE[voice.status] ?? 'muted']}`} role="status">
              {t(`voice.status.${voice.status}`)}
            </span>
          )}
        </span>
      </div>

      {sessionId && connected && <p className={styles.roomHelp}>{staff ? t('voice.roomHelpStaff') : t('voice.roomHelp')}</p>}
      {errorText && <Alert tone="danger">{errorText}</Alert>}
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}

      {!connected && (
        <div className={styles.prejoin}>
          <span className={styles.prejoinIcon} aria-hidden="true">
            <HeadphonesIcon size={32} />
          </span>
          {staff && reciter && <Alert tone="warning">{t('voice.reciterWaiting', { name: reciter.name })}</Alert>}
          <p className={styles.prejoinText}>{voice.status === 'closed' ? t('voice.closed') : staff ? t('voice.joinHelpStaff') : t('voice.joinHelp')}</p>
          <Button loading={voice.status === 'connecting'} onClick={() => voice.join({ mic: micOnJoin })}>
            {voice.status === 'error' ? t('voice.retry') : t('voice.join')}
          </Button>
        </div>
      )}

      {connected && (
        <>
          {voice.audioBlocked && (
            <Alert
              tone="warning"
              action={
                <Button size="sm" variant="secondary" onClick={voice.startAudio}>
                  {t('voice.enableAudio')}
                </Button>
              }
            >
              {t('voice.audioBlocked')}
            </Alert>
          )}
          {!staff && voice.canPublish && !voice.micOn && <Alert tone="success">{t('voice.mayspeak')}</Alert>}

          {staff && sessionId && hands.length > 0 && (
            <div className={styles.hands} role="region" aria-label={t('voice.hands', { count: hands.length })}>
              <p className={styles.handsTitle}>
                <HandIcon size={18} />
                {t('voice.hands', { count: hands.length })}
              </p>
              <ul className={styles.list}>
                {hands.map((id) => (
                  <li key={id} className={styles.item}>
                    <span dir="auto">{nameOf(id)}</span>
                    <Button size="sm" loading={mutation.busy === `${id}:true`} onClick={() => setSpeaker(id, true)}>
                      {t('voice.allow')}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className={styles.grid} aria-label={t('voice.inRoom', { count: voice.participants.length })}>
            {people.map((p) => (
              <Tile key={p.identity} person={p} handRaised={hands.includes(p.identity)} reciting={p.identity === reciter?.userId} />
            ))}
          </ul>

          {staff && sessionId && speakers.length > 0 && (
            <div className={styles.speakers}>
              <span className={styles.speakersLabel}>{t('voice.speakers')}</span>
              {speakers.map((id) => (
                <Button key={id} size="sm" variant="secondary" loading={mutation.busy === `${id}:false`} onClick={() => setSpeaker(id, false)} aria-label={t('voice.revokeLabel', { name: nameOf(id) })}>
                  {nameOf(id)} · {t('voice.revoke')}
                </Button>
              ))}
            </div>
          )}

          <div className={styles.controls} role="toolbar" aria-label={t('voice.controls')}>
            {voice.canPublish ? (
              <ControlButton tone={voice.micOn ? 'on' : 'off'} pressed={voice.micOn} onClick={voice.toggleMic} icon={voice.micOn ? <MicIcon size={24} /> : <MicOffIcon size={24} />} label={voice.micOn ? t('voice.micOn') : t('voice.micOff')} />
            ) : (
              <ControlButton tone="disabled" disabled icon={<MicOffIcon size={24} />} label={t('voice.listening')} />
            )}
            {sessionId && !staff && !voice.canPublish && (
              <ControlButton tone={handRaised ? 'hand' : 'off'} pressed={handRaised} disabled={mutation.busy === 'hand'} onClick={() => setHand(!handRaised)} icon={<HandIcon size={24} />} label={handRaised ? t('voice.lowerHand') : t('voice.raiseHand')} />
            )}
            <ControlButton tone="leave" onClick={voice.leave} icon={<LeaveIcon />} label={t('voice.leave')} />
          </div>
        </>
      )}
      <div ref={audioContainer} hidden />
    </section>
  );
}
