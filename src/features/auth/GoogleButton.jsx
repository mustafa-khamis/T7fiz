import { useI18n } from '../../i18n/I18nProvider.jsx';
import { config } from '../../config/env.js';
import { useAuth } from './AuthProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { GoogleIcon } from './AuthScreen.jsx';
import styles from './auth.module.css';

/**
 * Starts Google sign-in on the T7fiz API, which redirects to Google and back.
 * A full-page navigation (not fetch): the API sets the session cookie on return.
 */
export function GoogleButton({ returnTo }) {
  const { t } = useI18n();
  const auth = useAuth();
  if (!config.googleSignIn) return null;
  return (
    <>
      <Button variant="secondary" block href={auth.googleStartUrl(returnTo)}>
        <GoogleIcon />
        {t('auth.withGoogle')}
      </Button>
      <p className={styles.divider}>{t('auth.or')}</p>
    </>
  );
}
