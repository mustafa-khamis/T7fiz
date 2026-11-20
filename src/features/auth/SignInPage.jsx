import { useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useForm, useFocusWhen } from '../../lib/forms.js';
import { useAuth } from './AuthProvider.jsx';
import { AuthScreen } from './AuthScreen.jsx';
import { GoogleButton } from './GoogleButton.jsx';
import { EmailField, PasswordField } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { safeNextPath, validateEmail } from './auth-helpers.js';
import styles from './auth.module.css';

const validate = (values) => ({
  email: validateEmail(values.email),
  password: values.password ? null : 'auth.validation.passwordRequired',
});

export function SignInPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const { formRef, field, handleSubmit } = useForm({ initial: { email: '', password: '' }, validate, t });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef(null);
  useFocusWhen(errorRef, error);

  if (auth.status === 'signedIn') return <Navigate to={next} replace />;

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await auth.signIn(values.email.trim(), values.password);
      // The session change re-renders this page and redirects.
    } catch (caught) {
      setError(caught);
      setSubmitting(false);
    }
  });

  return (
    <AuthScreen
      title={t('auth.signIn.title')}
      subtitle={t('auth.signIn.subtitle')}
      footer={
        <p>
          {t('auth.signIn.noAccount')} <Link to="/sign-up">{t('auth.signIn.createAccount')}</Link>
        </p>
      }
    >
      {error && (
        <Alert ref={errorRef} tabIndex={-1} tone="danger">
          {errorMessage(t, error)}
        </Alert>
      )}
      <GoogleButton returnTo={next} />
      <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
        <EmailField label={t('auth.email')} autoComplete="username" {...field('email', { transformOnBlur: (value) => value.trim() })} />
        <PasswordField
          label={t('auth.password')}
          autoComplete="current-password"
          labelAction={
            <Link to="/forgot-password" className={styles.labelLink}>
              {t('auth.signIn.forgot')}
            </Link>
          }
          {...field('password')}
        />
        <div className={styles.formActions}>
          <Button type="submit" block loading={submitting}>
            {submitting ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
          </Button>
        </div>
      </form>
    </AuthScreen>
  );
}
