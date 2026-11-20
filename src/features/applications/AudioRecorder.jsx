import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import styles from './Applications.module.css';

const MAX_SECONDS = 10 * 60;
const TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];

function supportedType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return TYPES.find((type) => MediaRecorder.isTypeSupported?.(type)) ?? '';
}

/**
 * Records a recitation in the browser (or takes an audio file), lets the
 * person listen back, and hands the chosen recording to `onReady(blob)`.
 * The microphone is released as soon as recording stops.
 */
export function AudioRecorder({ onReady, busy }) {
  const { t, formatters } = useI18n();
  const [state, setState] = useState('idle'); // idle | recording | recorded | error
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const recorder = useRef(null);
  const stream = useRef(null);
  const timer = useRef(null);
  const canRecord = supportedType() !== null && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(
    () => () => {
      clearInterval(timer.current);
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  function keep(next) {
    setBlob(next);
    setUrl(URL.createObjectURL(next));
    setState('recorded');
  }

  async function start() {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError(t('apply.recorder.permission'));
      setState('error');
      return;
    }
    const type = supportedType();
    const chunks = [];
    recorder.current = new MediaRecorder(stream.current, type ? { mimeType: type, audioBitsPerSecond: 64000 } : undefined);
    recorder.current.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    recorder.current.onstop = () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      clearInterval(timer.current);
      keep(new Blob(chunks, { type: (recorder.current.mimeType || type || 'audio/webm').split(';')[0] }));
    };
    recorder.current.start(1000);
    setSeconds(0);
    setState('recording');
    timer.current = setInterval(() => {
      setSeconds((value) => {
        if (value + 1 >= MAX_SECONDS && recorder.current?.state === 'recording') recorder.current.stop();
        return value + 1;
      });
    }, 1000);
  }

  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop();
  const clock = `${formatters.integer(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className={styles.recorder}>
      {error && <Alert tone="danger">{error}</Alert>}
      {state === 'recording' ? (
        <div className={styles.recording} role="status">
          <span className={styles.recDot} aria-hidden="true" />
          <span>{t('apply.recorder.recording', { time: clock })}</span>
          <Button variant="danger" size="sm" onClick={stop}>
            {t('apply.recorder.stop')}
          </Button>
        </div>
      ) : state === 'recorded' ? (
        <div className={styles.recorded}>
          <audio src={url} controls preload="metadata" className={styles.player}>
            {t('apply.recorder.noPlayer')}
          </audio>
          <div className={styles.actions}>
            <Button size="sm" loading={busy} onClick={() => onReady(blob)}>
              {t('apply.recorder.use')}
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setState('idle')} disabled={busy}>
              {t('apply.recorder.again')}
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          {canRecord && (
            <Button size="sm" onClick={start}>
              {t('apply.recorder.start')}
            </Button>
          )}
          <label className={styles.fileButton}>
            <input
              type="file"
              accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/webm,audio/wav"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) keep(file);
              }}
            />
            {t('apply.recorder.upload')}
          </label>
        </div>
      )}
      <p className={styles.hint}>{t('apply.recorder.hint')}</p>
    </div>
  );
}
