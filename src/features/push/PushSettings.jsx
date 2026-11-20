import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { BellIcon } from '../../components/ui/icons.jsx';
import { config } from '../../config/env.js';
import { disablePush, enablePush, pushEnabledHere, pushPermission } from './push.js';
import styles from './PushSettings.module.css';

/** "Notifications on this device": state and the one action that fits it. Hidden until push is configured. */
export function PushSettings() {
  const { t } = useI18n();
  const { api } = useAuth();
  const [permission, setPermission] = useState(pushPermission);
  const [on, setOn] = useState(() => pushPermission() === 'granted' && pushEnabledHere());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [test, setTest] = useState(null);

  if (!config.firebase) return null;

  async function turnOn() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await enablePush(api, { ask: true });
      setPermission(result);
      setOn(result === 'granted');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      await disablePush(api);
      setOn(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await api.post('/api/v1/me/push-devices/test', {});
      setTest(result?.enabled ? 'testSent' : 'testServerOff');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const status =
    permission === 'unsupported' ? 'statusUnsupported' : permission === 'denied' ? 'statusBlocked' : on ? 'statusOn' : 'statusOff';

  return (
    <section className={styles.card} aria-labelledby="push-settings-title" data-state={on ? 'on' : permission}>
      <span className={styles.icon} aria-hidden="true">
        <BellIcon size={20} />
      </span>
      <div className={styles.text}>
        <h2 id="push-settings-title" className={styles.title}>
          {t('push.settingsTitle')}
        </h2>
        <p className={styles.status} aria-live="polite">
          {failed ? t('push.failed') : test ? t(`push.${test}`) : t(`push.${status}`)}
        </p>
      </div>
      {permission !== 'unsupported' && permission !== 'denied' && (
        <div className={styles.action}>
          {on ? (
            <>
              <Button size="sm" variant="secondary" disabled={busy} onClick={sendTest}>
                {t('push.sendTest')}
              </Button>
              <Button size="sm" variant="quiet" disabled={busy} onClick={turnOff}>
                {t('push.turnOff')}
              </Button>
            </>
          ) : (
            <Button size="sm" loading={busy} onClick={turnOn}>
              {t('push.enable')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
