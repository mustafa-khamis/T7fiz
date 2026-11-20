import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from './AuthProvider.jsx';
import { AuthScreen } from './AuthScreen.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { safeNextPath } from './auth-helpers.js';
import { ButtonBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './auth.module.css';

/**
 * Where the API sends the browser after Google sign-in. On success the API has
 * already set the refresh cookie; this page exchanges it for an access token.
 */
export function AuthCallbackPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const [params] = useSearchParams();
  const providerError = params.get('error');
  const [failed, setFailed] = useState(Boolean(providerError));
  const started = useRef(false);

  useEffect(() => {
    if (providerError || started.current || auth.status === 'loading') return;
    started.current = true;
    if (auth.status === 'signedIn') return;
    auth.completeRedirectSignIn().catch(() => setFailed(true));
  }, [providerError, auth]);

  if (!failed && auth.status === 'signedIn') {
    return <Navigate to={safeNextPath(params.get('returnTo'))} replace />;
  }

  const errorText = providerError ? t(`auth.oauthErrors.${providerError}`) : t('auth.callback.failed');
  return (
    <AuthScreen title={t('auth.signIn.title')}>
      {failed ? (
        <div className={styles.status}>
          <Alert tone="danger">{errorText.startsWith('auth.') ? t('auth.callback.failed') : errorText}</Alert>
          <Link to="/sign-in">{t('auth.forgot.back')}</Link>
        </div>
      ) : (
        <SkeletonRegion className={styles.status} label={t('auth.callback.working')}>
          <Lines widths={['80%']} />
          <ButtonBone block />
        </SkeletonRegion>
      )}
    </AuthScreen>
  );
}
