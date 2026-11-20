import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { browserTimeZone } from '../../i18n/format.js';
import { useServices } from '../../app/services.jsx';
import { useForm, useFocusWhen } from '../../lib/forms.js';
import { useAuth } from './AuthProvider.jsx';
import { AuthScreen } from './AuthScreen.jsx';
import { GoogleButton } from './GoogleButton.jsx';
import { GenderField } from './GenderField.jsx';
import { EmailField, PasswordField, TextField } from '../../components/ui/Field.jsx';
import { UserIcon } from '../../components/ui/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { validateDisplayName, validateEmail, validateNewPassword } from './auth-helpers.js';
import styles from './auth.module.css';

const validate = (values) => ({
  displayName: validateDisplayName(values.displayName),
  email: validateEmail(values.email),
  password: validateNewPassword(values.password),
  gender: values.gender ? null : 'auth.validation.genderRequired',
});

export function SignUpPage() {
  const { t, locale } = useI18n();
  const { authClient } = useServices();
  const auth = useAuth();
  const navigate = useNavigate();
  const { formRef, field, handleSubmit, values: formValues } = useForm({ initial: { displayName: '', email: '', password: '', gender: null }, validate, t });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef(null);
  useFocusWhen(errorRef, error);

  if (auth.status === 'signedIn') return <Navigate to="/account" replace />;

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    const email = values.email.trim();
    const timeZone = browserTimeZone();
    try {
      await authClient.register({
        email,
        password: values.password,
        displayName: values.displayName.trim(),
        gender: values.gender,
        locale,
        ...(timeZone ? { timeZone } : {}),
      });
      // The API answers the same way for new and existing emails.
      navigate('/check-email', { state: { email } });
    } catch (caught) {
      setError(caught);
      setSubmitting(false);
    }
  });

  const gender = field('gender');
  return (
    <AuthScreen
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
      footer={
        <p>
          {t('auth.signUp.haveAccount')} <Link to="/sign-in">{t('auth.signUp.signInLink')}</Link>
        </p>
      }
    >
      {error && (
        <Alert ref={errorRef} tabIndex={-1} tone="danger">
          {errorMessage(t, error)}
        </Alert>
      )}
      <GoogleButton returnTo="/account" />
      <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label={t('auth.signUp.displayName')}
          hint={t('auth.signUp.displayNameHint')}
          icon={UserIcon}
          autoComplete="name"
          maxLength={80}
          dir="auto"
          {...field('displayName', { transformOnBlur: (value) => value.replace(/\s+/g, ' ').trim() })}
        />
        <EmailField label={t('auth.email')} hint={t('auth.signUp.emailHint')} autoComplete="email" {...field('email', { transformOnBlur: (value) => value.trim() })} />
        <PasswordField
          label={t('auth.password')}
          autoComplete="new-password"
          newPassword
          context={{ email: formValues.email, name: formValues.displayName }}
          {...field('password')}
        />
        <GenderField value={gender.value} onChange={gender.onChange} error={gender.error} />
        <div className={styles.formActions}>
          <Button type="submit" block loading={submitting}>
            {submitting ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
          </Button>
          <p className={styles.muted}>
            {t('auth.signUp.terms')} <Link to="/terms">{t('footer.terms')}</Link> · <Link to="/privacy">{t('footer.privacy')}</Link>
          </p>
        </div>
      </form>
    </AuthScreen>
  );
}
