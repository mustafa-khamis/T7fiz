import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useServices } from '../../app/services.jsx';
import { useForm, useFocusWhen } from '../../lib/forms.js';
import { AuthScreen } from './AuthScreen.jsx';
import { PasswordField } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { validateNewPassword } from './auth-helpers.js';
import styles from './auth.module.css';

const validate = (values) => ({
  password: validateNewPassword(values.password),
  confirm: !values.confirm ? 'auth.validation.confirmRequired' : values.confirm !== values.password ? 'auth.validation.passwordMatch' : null,
});

/** Reached from the reset email (/reset-password?token=…). */
export function ResetPasswordPage() {
  const { t } = useI18n();
  const { authClient } = useServices();
  const [params] = useSearchParams();
  const token = params.get('token');
  const { formRef, field, handleSubmit, values: formValues } = useForm({ initial: { password: '', confirm: '' }, validate, t });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef(null);
  const doneRef = useRef(null);
  useFocusWhen(errorRef, error);
  useFocusWhen(doneRef, done);

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await authClient.resetPassword(token, values.password);
      setDone(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  });

  const confirm = field('confirm');
  const matches = formValues.confirm && formValues.confirm === formValues.password;

  let content;
  if (!token) {
    content = (
      <div className={styles.status}>
        <Alert tone="danger">{t('auth.reset.missingToken')}</Alert>
        <Button variant="secondary" to="/forgot-password">
          {t('auth.reset.requestNew')}
        </Button>
      </div>
    );
  } else if (done) {
    content = (
      <div className={styles.status}>
        <Alert ref={doneRef} tabIndex={-1} tone="success">
          {t('auth.reset.success')}
        </Alert>
        <Button to="/sign-in">{t('common.actions.signIn')}</Button>
      </div>
    );
  } else {
    content = (
      <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
        {error && (
          <Alert
            ref={errorRef}
            tabIndex={-1}
            tone="danger"
            action={error.code === 'TOKEN_INVALID' ? <Link to="/forgot-password">{t('auth.reset.requestNew')}</Link> : null}
          >
            {errorMessage(t, error)}
          </Alert>
        )}
        <PasswordField label={t('auth.reset.newPassword')} autoComplete="new-password" newPassword {...field('password')} />
        <PasswordField
          label={t('auth.reset.confirmPassword')}
          autoComplete="new-password"
          hint={!confirm.error && matches ? t('auth.reset.matches') : null}
          {...confirm}
        />
        <div className={styles.formActions}>
          <Button type="submit" block loading={submitting}>
            {t('auth.reset.submit')}
          </Button>
        </div>
      </form>
    );
  }

  return <AuthScreen title={t('auth.reset.title')}>{content}</AuthScreen>;
}
