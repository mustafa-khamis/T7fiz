import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useServices } from '../../app/services.jsx';
import { useForm, useFocusWhen } from '../../lib/forms.js';
import { AuthScreen } from './AuthScreen.jsx';
import { EmailField } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { validateEmail } from './auth-helpers.js';
import styles from './auth.module.css';

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const { authClient } = useServices();
  const { formRef, field, handleSubmit } = useForm({ initial: { email: '' }, validate: (values) => ({ email: validateEmail(values.email) }), t });
  const [error, setError] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef(null);
  const sentRef = useRef(null);
  useFocusWhen(errorRef, error);
  useFocusWhen(sentRef, sentTo);

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      // The same confirmation is shown whether or not the email is registered.
      await authClient.forgotPassword(values.email.trim());
      setSentTo(values.email.trim());
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthScreen
      title={t('auth.forgot.title')}
      subtitle={sentTo ? null : t('auth.forgot.body')}
      footer={<Link to="/sign-in">{t('auth.forgot.back')}</Link>}
    >
      {sentTo ? (
        <div className={styles.status}>
          <Alert ref={sentRef} tabIndex={-1} tone="success" title={t('auth.forgot.sentTitle')}>
            {t('auth.forgot.sent')}
          </Alert>
          <p className={styles.muted}>{t('auth.forgot.sentHelp')}</p>
          <Button variant="secondary" onClick={() => setSentTo(null)}>
            {t('auth.forgot.tryAnother')}
          </Button>
        </div>
      ) : (
        <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
          {error && (
            <Alert ref={errorRef} tabIndex={-1} tone="danger">
              {errorMessage(t, error)}
            </Alert>
          )}
          <EmailField label={t('auth.email')} autoComplete="username" {...field('email', { transformOnBlur: (value) => value.trim() })} />
          <div className={styles.formActions}>
            <Button type="submit" block loading={submitting}>
              {t('auth.forgot.submit')}
            </Button>
          </div>
        </form>
      )}
    </AuthScreen>
  );
}
