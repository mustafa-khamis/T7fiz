import { useId, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { ImageDecodeError, squareJpeg } from '../../lib/images.js';
import { useMe } from './MeProvider.jsx';
import styles from './AvatarField.module.css';

function initials(name) {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

/** Profile picture: shows the current one, uploads a replacement, or removes it. */
export function AvatarField({ me, prepare = squareJpeg }) {
  const { t } = useI18n();
  const { setAvatar, removeAvatar } = useMe();
  const inputRef = useRef(null);
  const hintId = useId();
  const [state, setState] = useState({ status: 'idle' }); // idle | uploading | removing | error

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setState({ status: 'uploading' });
    try {
      const blob = await prepare(file);
      await setAvatar(blob);
      setState({ status: 'idle' });
    } catch (error) {
      setState({ status: 'error', message: error instanceof ImageDecodeError ? t('account.avatar.invalidImage') : errorMessage(t, error) });
    }
  }

  async function handleRemove() {
    setState({ status: 'removing' });
    try {
      await removeAvatar();
      setState({ status: 'idle' });
    } catch (error) {
      setState({ status: 'error', message: errorMessage(t, error) });
    }
  }

  const busy = state.status === 'uploading' || state.status === 'removing';
  return (
    <div className={styles.field}>
      <div className={styles.row}>
        {me.avatar?.url ? (
          <img className={styles.avatar} src={me.avatar.url} alt={t('account.avatar.current')} width="72" height="72" />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            {initials(me.displayName)}
          </span>
        )}
        <div className={styles.actions}>
          <input
            ref={inputRef}
            className={styles.input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            aria-describedby={hintId}
            tabIndex={-1}
            data-testid="avatar-input"
          />
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={state.status === 'uploading'} disabled={busy}>
            {state.status === 'uploading' ? t('account.avatar.uploading') : me.avatar ? t('account.avatar.change') : t('account.avatar.upload')}
          </Button>
          {me.avatar && (
            <Button variant="quiet" size="sm" onClick={handleRemove} loading={state.status === 'removing'} disabled={busy}>
              {t('account.avatar.remove')}
            </Button>
          )}
        </div>
      </div>
      <p id={hintId} className={styles.hint}>
        {t('account.avatar.hint')}
      </p>
      {state.status === 'error' && <Alert tone="danger">{state.message}</Alert>}
    </div>
  );
}
