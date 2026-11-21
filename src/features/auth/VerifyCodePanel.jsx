import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useServices } from '../../app/services.jsx';
import { useAuth } from './AuthProvider.jsx';
import { CodeInput } from '../../components/ui/CodeInput.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import styles from './auth.module.css';

const LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Enter the 6-digit code from the email. It is checked as soon as the sixth
 * digit is in (typed, pasted or filled by the browser) — no button to press.
 * A wrong code is cleared so the next attempt starts fresh; a new code can be
 * requested after a short wait.
 */
export function VerifyCodePanel({ email, onVerified, justSent = true }) {
  const { t, formatters } = useI18n();
  const { authClient } = useServices();
  const auth = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | error | success
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(justSent ? RESEND_COOLDOWN_SECONDS : 0);
  const [resent, setResent] = useState(null); // null | 'sent' | 'failed'
  const [sending, setSending] = useState(false);
  const input = useRef(null);
  const tried = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const check = useCallback(
    async (value) => {
      tried.current = value;
      setStatus('checking');
      setError(null);
      try {
        await auth.verifyEmailCode(email, value);
        setStatus('success');
        onVerified?.();
      } catch (failure) {
        setStatus('error');
        const left = failure?.details?.attemptsLeft;
        setError(
          failure?.code === 'VERIFICATION_CODE_INVALID' && left
            ? t('auth.verifyCode.wrong', { count: left })
            : errorMessage(t, failure),
        );
        setCode('');
        requestAnimationFrame(() => input.current?.focus());
      }
    },
    [auth, email, onVerified, t],
  );

  function change(value) {
    setCode(value);
    if (status === 'error') setStatus('idle');
    // Checked the moment the code is complete (a repeat of the same wrong code waits for a change).
    if (value.length === LENGTH && value !== tried.current && status !== 'checking') check(value);
  }

  async function resend() {
    setSending(true);
    try {
      await authClient.resendVerification(email);
      setResent('sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStatus('idle');
      setError(null);
      setCode('');
      tried.current = null;
      input.current?.focus();
    } catch {
      setResent('failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.verify}>
      <CodeInput
        ref={input}
        value={code}
        onChange={change}
        length={LENGTH}
        label={t('auth.verifyCode.label')}
        hint={status === 'checking' ? t('auth.verifyCode.checking') : status === 'success' ? t('auth.verifyCode.success') : t('auth.verifyCode.hint')}
        error={status === 'error' ? error : null}
        disabled={status === 'checking' || status === 'success'}
        state={status}
        autoFocus
      />
      {resent === 'sent' && <Alert tone="success">{t('auth.verifyCode.resent')}</Alert>}
      {resent === 'failed' && <Alert tone="danger">{t('errors.generic')}</Alert>}
      <div className={styles.verifyActions}>
        <Button variant="quiet" size="sm" onClick={resend} loading={sending} disabled={cooldown > 0 || status === 'success'}>
          {cooldown > 0 ? t('auth.verifyCode.resendIn', { seconds: formatters.integer(cooldown) }) : t('auth.verifyCode.resend')}
        </Button>
      </div>
    </div>
  );
}
