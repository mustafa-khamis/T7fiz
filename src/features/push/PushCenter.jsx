import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useMe } from '../account/MeProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { BellIcon, CloseIcon } from '../../components/ui/icons.jsx';
import { dismissPushPrompt, enablePush, pushPermission, pushPromptDismissed, pushSupported } from './push.js';
import styles from './Push.module.css';

// Moments that cost the person their turn if missed stay until dismissed.
const STICKY = new Set(['recitation.your_turn', 'recitation.requested']);
const AUTO_HIDE_MS = 8000;
const MAX_ALERTS = 3;

/**
 * Push notifications in the web app, for signed-in people:
 *  - keeps this browser's FCM token registered (it can change over time);
 *  - asks once, politely, to turn notifications on (never the bare browser prompt);
 *  - shows an in-app alert when a push arrives while T7fiz is in front, and
 *    follows notification clicks to the right page.
 */
export function PushCenter() {
  const auth = useAuth();
  const { me } = useMe();
  const signedIn = auth.status === 'signedIn' && Boolean(me);
  if (!signedIn || !pushSupported()) return null;
  return <SignedInPush api={auth.api} />;
}

function SignedInPush({ api }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [permission, setPermission] = useState(pushPermission);
  const [showPrompt, setShowPrompt] = useState(() => pushPermission() === 'default' && !pushPromptDismissed());
  const [busy, setBusy] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const timers = useRef(new Map());

  // Already allowed: refresh the registration silently (new token, other account on this browser).
  useEffect(() => {
    if (permission === 'granted') enablePush(api).catch(() => {});
  }, [api, permission]);

  const close = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setAlerts((list) => list.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    const live = timers.current;
    const onMessage = (event) => {
      const message = event.data;
      if (message?.type === 't7fiz:navigate' && typeof message.link === 'string' && message.link.startsWith('/')) {
        navigate(message.link);
      } else if (message?.type === 't7fiz:push' && message.push) {
        const id = `${Date.now()}-${Math.random()}`;
        const alert = { id, ...message.push, sticky: STICKY.has(message.push.kind) };
        setAlerts((list) => [...list.filter((a) => !alert.tag || a.tag !== alert.tag), alert].slice(-MAX_ALERTS));
        if (!alert.sticky) live.set(id, setTimeout(() => close(id), AUTO_HIDE_MS));
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
      for (const timer of live.values()) clearTimeout(timer);
    };
  }, [navigate, close]);

  async function turnOn() {
    setBusy(true);
    try {
      setPermission(await enablePush(api, { ask: true }));
    } catch {
      setPermission(pushPermission());
    } finally {
      setBusy(false);
      setShowPrompt(false);
    }
  }

  function later() {
    dismissPushPrompt();
    setShowPrompt(false);
  }

  return (
    <>
      {showPrompt && permission === 'default' && (
        <aside className={styles.prompt} aria-labelledby="push-prompt-title">
          <span className={styles.promptIcon} aria-hidden="true">
            <BellIcon size={22} />
          </span>
          <div className={styles.promptText}>
            <p id="push-prompt-title" className={styles.promptTitle}>
              {t('push.promptTitle')}
            </p>
            <p className={styles.promptBody}>{t('push.promptBody')}</p>
          </div>
          <div className={styles.promptActions}>
            <Button size="sm" loading={busy} onClick={turnOn}>
              {t('push.enable')}
            </Button>
            <Button size="sm" variant="quiet" onClick={later}>
              {t('push.later')}
            </Button>
          </div>
        </aside>
      )}
      <div className={styles.alerts}>
        {alerts.map((alert) => (
          <div key={alert.id} className={styles.alert} data-sticky={alert.sticky} role={alert.sticky ? 'alert' : 'status'}>
            <span className={styles.alertIcon} aria-hidden="true">
              <BellIcon size={20} />
            </span>
            <div className={styles.alertText}>
              <p className={styles.alertTitle}>{alert.title}</p>
              {alert.body && <p className={styles.alertBody}>{alert.body}</p>}
            </div>
            <div className={styles.alertActions}>
              <Button
                size="sm"
                variant={alert.sticky ? 'primary' : 'secondary'}
                onClick={() => {
                  close(alert.id);
                  navigate(alert.link);
                }}
              >
                {t('push.open')}
              </Button>
              <button type="button" className={styles.closeButton} aria-label={t('push.dismiss')} onClick={() => close(alert.id)}>
                <CloseIcon size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
