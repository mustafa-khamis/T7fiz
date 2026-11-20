import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useServices } from '../../app/services.jsx';
import { useAuth } from './AuthProvider.jsx';
import { useMe } from '../account/MeProvider.jsx';
import { AuthScreen } from './AuthScreen.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmailField } from '../../components/ui/Field.jsx';
import { useForm } from '../../lib/forms.js';
import { validateEmail } from './auth-helpers.js';
import { Bone, ButtonBone, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './auth.module.css';

/**
 * After a failed link: request a new one. Signed-in people get it for their
 * own address in one tap; others type the address. The answer is the same
 * whether or not the address is registered.
 */
function RequestNewLink() {
  const { t } = useI18n();
  const { authClient } = useServices();
  const auth = useAuth();
  const { me } = useMe();
  const [state, setState] = useState('idle'); // idle | sending | sent | failed
  const { formRef, field, handleSubmit } = useForm({ initial: { email: '' }, validate: (values) => ({ email: validateEmail(values.email) }), t });

  async function send(email) {
    setState('sending');
    try {
      await authClient.resendVerification(email);
      setState('sent');
    } catch {
      setState('failed');
    }
  }

  if (state === 'sent') return <Alert tone="success">{t('auth.verifyEmail.resent')}</Alert>;
  const signedInEmail = auth.status === 'signedIn' ? me?.email : null;
  return (
    <div className={styles.status}>
      <p className={styles.muted}>{t('auth.verifyEmail.requestHelp')}</p>
      {state === 'failed' && <Alert tone="danger">{t('errors.generic')}</Alert>}
      {signedInEmail ? (
        <Button onClick={() => send(signedInEmail)} loading={state === 'sending'}>
          {t('auth.verifyEmail.resendTo', { email: signedInEmail })}
        </Button>
      ) : (
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit((values) => send(values.email.trim()))} noValidate>
          <EmailField label={t('auth.email')} autoComplete="email" {...field('email', { transformOnBlur: (value) => value.trim() })} />
          <Button type="submit" block loading={state === 'sending'}>
            {t('auth.verifyEmail.resend')}
          </Button>
        </form>
      )}
    </div>
  );
}

/** Landing page for the link in the verification email (/verify-email?token=…). */
export function VerifyEmailPage() {
  const { t } = useI18n();
  const { authClient } = useServices();
  const auth = useAuth();
  const { reload } = useMe();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState(token ? { status: 'working' } : { status: 'failed', error: { code: 'TOKEN_INVALID' } });
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use; never submit twice (e.g. StrictMode double effects).
    if (!token || started.current) return;
    started.current = true;
    authClient
      .verifyEmail(token)
      .then(() => setState({ status: 'success' }))
      .catch((error) => setState({ status: 'failed', error }));
  }, [authClient, token]);

  useEffect(() => {
    if (state.status === 'success' && auth.status === 'signedIn') reload();
  }, [state.status, auth.status, reload]);

  return (
    <AuthScreen title={t('auth.verifyEmail.title')}>
      <div className={styles.status}>
        {state.status === 'working' && (
          <SkeletonRegion className={styles.status} label={t('auth.verifyEmail.working')}>
            <Bone height="3.25rem" radius="md" />
            <ButtonBone width="7rem" />
          </SkeletonRegion>
        )}
        {state.status === 'success' && (
          <>
            <Alert tone="success">{t('auth.verifyEmail.success')}</Alert>
            <Button to={auth.status === 'signedIn' ? '/account' : '/sign-in'}>{t('auth.verifyEmail.continue')}</Button>
          </>
        )}
        {state.status === 'failed' && (
          <>
            <Alert tone="danger">
              {state.error?.code === 'TOKEN_INVALID' ? t('auth.verifyEmail.failed') : errorMessage(t, state.error)}
            </Alert>
            <RequestNewLink />
          </>
        )}
      </div>
    </AuthScreen>
  );
}
