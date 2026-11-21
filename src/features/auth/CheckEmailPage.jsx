import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from './AuthProvider.jsx';
import { useMe } from '../account/MeProvider.jsx';
import { AuthScreen } from './AuthScreen.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmailField } from '../../components/ui/Field.jsx';
import { useForm } from '../../lib/forms.js';
import { validateEmail } from './auth-helpers.js';
import { VerifyCodePanel } from './VerifyCodePanel.jsx';
import styles from './auth.module.css';

const EMAIL_KEY = 't7fiz.verifyEmail';
const remembered = {
  get() {
    try {
      return sessionStorage.getItem(EMAIL_KEY);
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      if (value) sessionStorage.setItem(EMAIL_KEY, value);
      else sessionStorage.removeItem(EMAIL_KEY);
    } catch {
      // Private mode: the address is asked for again after a reload.
    }
  },
};

/** Which address to confirm when the page was opened without one. */
function AskEmail({ onEmail }) {
  const { t } = useI18n();
  const { formRef, field, handleSubmit } = useForm({ initial: { email: '' }, validate: (values) => ({ email: validateEmail(values.email) }), t });
  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit((values) => onEmail(values.email.trim().toLowerCase()))} noValidate>
      <EmailField label={t('auth.email')} autoComplete="email" {...field('email', { transformOnBlur: (value) => value.trim() })} />
      <Button type="submit" block>
        {t('auth.verifyCode.continue')}
      </Button>
    </form>
  );
}

/**
 * Email confirmation by 6-digit code: right after sign-up (the code also signs
 * the person in) and for signed-in people whose address is not confirmed yet.
 */
export function CheckEmailPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const { me, reload } = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const signedIn = auth.status === 'signedIn';
  const [email, setEmail] = useState(() => {
    const value = location.state?.email ?? remembered.get() ?? null;
    remembered.set(value);
    return value;
  });
  const address = email ?? (signedIn ? me?.email : null) ?? null;
  const returnTo = location.state?.returnTo;

  async function done() {
    remembered.set(null);
    if (signedIn) await reload();
    navigate(typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : signedIn ? '/account' : '/circles', { replace: true });
  }

  if (signedIn && me?.emailVerified) {
    return (
      <AuthScreen title={t('auth.verifyCode.title')}>
        <div className={styles.status}>
          <p>{t('auth.verifyCode.already')}</p>
          <Button to="/account">{t('auth.verifyEmail.continue')}</Button>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title={t('auth.verifyCode.title')}
      subtitle={address ? t('auth.verifyCode.body', { email: `⁨${address}⁩` }) : t('auth.verifyCode.askEmail')}
    >
      {address ? (
        <>
          <VerifyCodePanel email={address} onVerified={done} justSent={Boolean(location.state?.email)} />
          <p className={styles.muted}>{t('auth.verifyCode.spam')}</p>
        </>
      ) : (
        <AskEmail
          onEmail={(value) => {
            remembered.set(value);
            setEmail(value);
          }}
        />
      )}
      {!signedIn && (
        <p className={styles.muted}>
          {t('auth.verifyCode.wrongEmail')} <Link to="/sign-up">{t('auth.verifyCode.signUpAgain')}</Link>
        </p>
      )}
    </AuthScreen>
  );
}
