import { useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useMe } from '../account/MeProvider.jsx';
import { useAuth } from './AuthProvider.jsx';
import { AuthScreen } from './AuthScreen.jsx';
import { GenderField } from './GenderField.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { useFocusWhen } from '../../lib/forms.js';
import { safeNextPath } from './auth-helpers.js';
import { Bone, ButtonBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './auth.module.css';

/** Required once for accounts created through Google, which does not provide gender. */
export function CompleteProfilePage() {
  const { t } = useI18n();
  const { status, me, error: loadError, setGender } = useMe();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [gender, setGenderValue] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);
  const errorRef = useRef(null);
  useFocusWhen(errorRef, error);

  const auth = useAuth();
  if (auth.status === 'signedOut') return <Navigate to="/sign-in" replace />;
  if (status === 'ready' && me.profileComplete) return <Navigate to={next} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!gender) {
      setFieldError('auth.validation.genderRequired');
      formRef.current?.elements.namedItem('gender')?.[0]?.focus();
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    setError(null);
    try {
      await setGender(gender);
    } catch (caught) {
      setError(caught);
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen title={t('auth.completeProfile.title')} subtitle={t('auth.completeProfile.body')}>
      {status === 'error' && <Alert tone="danger">{errorMessage(t, loadError)}</Alert>}
      {status !== 'ready' && status !== 'error' && (
        <SkeletonRegion className={styles.form}>
          <Lines size="small" widths={['3rem']} />
          <Lines size="small" widths={['100%', '60%']} />
          <span className={styles.choices}>
            <Bone height="3.5rem" radius="md" />
            <Bone height="3.5rem" radius="md" />
          </span>
          <ButtonBone block />
        </SkeletonRegion>
      )}
      {status === 'ready' && (
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && (
            <Alert ref={errorRef} tabIndex={-1} tone="danger">
              {errorMessage(t, error)}
            </Alert>
          )}
          <GenderField
            value={gender}
            onChange={(value) => {
              setGenderValue(value);
              setFieldError(null);
            }}
            error={fieldError && t(fieldError)}
          />
          <div className={styles.formActions}>
            <Button type="submit" block loading={submitting}>
              {t('auth.completeProfile.submit')}
            </Button>
          </div>
        </form>
      )}
    </AuthScreen>
  );
}
