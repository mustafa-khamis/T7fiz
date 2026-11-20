import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { SiteHeader } from '../components/layout/SiteHeader.jsx';
import { SiteFooter } from '../components/layout/SiteFooter.jsx';
import { PushCenter } from '../features/push/PushCenter.jsx';
import styles from './layouts.module.css';

function SkipLink() {
  const { t } = useI18n();
  return (
    <a className="skip-link" href="#main">
      {t('common.skipToContent')}
    </a>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <SkipLink />
      <SiteHeader showSectionLinks={pathname === '/'} />
      <PushCenter />
      <main id="main" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </>
  );
}

/** Narrow centered column for sign-in, sign-up, and recovery screens. */
export function AuthLayout() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className={styles.authMain}>
        <div className={styles.authColumn}>
          <Outlet />
        </div>
      </main>
      <ScrollRestoration />
    </>
  );
}
