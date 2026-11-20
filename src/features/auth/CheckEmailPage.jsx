import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useServices } from '../../app/services.jsx';
import { AuthScreen } from './AuthScreen.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import styles from './auth.module.css';

export function CheckEmailPage() {
  const { t } = useI18n();
  const { authClient } = useServices();
  const email = useLocation().state?.email ?? null;
  const [result, setResult] = useState(null); // { tone, text }
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      await authClient.resendVerification(email);
      setResult({ tone: 'success', text: t('auth.checkEmail.resent') });
    } catch (error) {
      setResult({ tone: 'danger', text: errorMessage(t, error) });
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthScreen title={t('auth.checkEmail.title')}>
      <div className={styles.status}>
        <p>{email ? t('auth.checkEmail.body', { email: `⁨${email}⁩` }) : t('auth.checkEmail.bodyGeneric')}</p>
        <p className={styles.muted}>{t('auth.checkEmail.hint')}</p>
        {result && <Alert tone={result.tone}>{result.text}</Alert>}
        {email && (
          <Button variant="secondary" onClick={resend} loading={sending}>
            {t('auth.checkEmail.resend')}
          </Button>
        )}
        <Link to="/sign-in">{t('auth.forgot.back')}</Link>
      </div>
    </AuthScreen>
  );
}
