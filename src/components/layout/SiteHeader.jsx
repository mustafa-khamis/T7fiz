import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { useChangeLocale, useMe } from '../../features/account/MeProvider.jsx';
import { ButtonBone } from '../ui/Skeleton.jsx';
import { BrandLogo } from '../brand/BrandLogo.jsx';
import { Button } from '../ui/Button.jsx';
import { useApiQuery, useLiveTopic } from '../../lib/useApi.js';
import styles from './SiteHeader.module.css';

function ThemeIcon({ dark }) {
  // Not mirrored in RTL: sun and moon carry no direction.
  return dark ? (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand() {
  const { t } = useI18n();
  return (
    <Link to="/" className={styles.brand} aria-label={`${t('common.appName')} — ${t('common.actions.backHome')}`}>
      <BrandLogo height={38} decorative />
    </Link>
  );
}

/** Primary sections, next to the logo on wide screens. */
function PrimaryNav({ isStaffAdmin }) {
  const { t } = useI18n();
  const links = [
    { to: '/circles', label: t('common.nav.circles') },
    { to: '/manage', label: t('common.nav.manage') },
    ...(isStaffAdmin ? [{ to: '/admin', label: t('common.nav.admin') }] : []),
  ];
  return (
    <nav aria-label={t('common.nav.label')} className={styles.wideNav}>
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} className={styles.navLink}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Signed-in navigation. Wide screens: inline links and the account button.
 * Narrow screens: one menu button opening a panel with large targets; it closes
 * on navigation, Escape, or a click outside, and returns focus to the button.
 */
/** Bell with the unread count; refreshed by realtime hints on the user's own topic. */
function NotificationsLink() {
  const { t, formatters } = useI18n();
  const { me } = useMe();
  const query = useApiQuery('/api/v1/me/notifications/unread-count');
  useLiveTopic(me ? `user:${me.id}` : null, query.reload, { fallbackMs: 60_000 });
  const unread = query.data?.unread ?? 0;
  return (
    <NavLink
      to="/notifications"
      className={`${styles.toolButton} ${styles.iconButton} ${styles.bell}`}
      aria-label={unread ? t('notifications.openWithCount', { count: unread }) : t('notifications.open')}
    >
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6 2 7H4c.5-1 2-2.5 2-7Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      {unread > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {unread > 99 ? `${formatters.integer(99)}+` : formatters.integer(unread)}
        </span>
      )}
    </NavLink>
  );
}

function SignedInNav({ isStaffAdmin }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef(null);
  const wrapRef = useRef(null);
  const { pathname } = useLocation();
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const links = [
    { to: '/circles', label: t('common.nav.circles') },
    { to: '/manage', label: t('common.nav.manage') },
    ...(isStaffAdmin ? [{ to: '/admin', label: t('common.nav.admin') }] : []),
    { to: '/account', label: t('common.nav.account') },
  ];

  return (
    <div ref={wrapRef} className={styles.signedIn}>
      <NotificationsLink />
      <span className={styles.wideOnly}>
        <Button to="/account" variant="secondary" size="sm">
          {t('common.nav.account')}
        </Button>
      </span>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.toolButton} ${styles.iconButton} ${styles.menuButton}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t('common.nav.closeMenu') : t('common.nav.openMenu')}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav id={panelId} aria-label={t('common.nav.label')} className={styles.menuPanel}>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={styles.menuLink}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export function SiteHeader({ showSectionLinks = false }) {
  const { t, locale } = useI18n();
  const { resolved, setMode } = useTheme();
  const auth = useAuth();
  const changeLocale = useChangeLocale();
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const isDark = resolved === 'dark';
  const { me } = useMe();
  const isStaffAdmin = Boolean(me?.platformRoles?.some((role) => role === 'platform_admin' || role === 'sheikh_reviewer'));

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Brand />

        {auth.status === 'signedIn' && <PrimaryNav isStaffAdmin={isStaffAdmin} />}

        {showSectionLinks && auth.status !== 'signedIn' && (
          <nav aria-label={t('common.nav.label')} className={styles.sections}>
            <a href="#how">{t('common.nav.howItWorks')}</a>
            <a href="#paths">{t('common.nav.paths')}</a>
          </nav>
        )}

        <div className={styles.tools}>
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => changeLocale(otherLocale)}
            aria-label={t('common.language.switchToLabel')}
            lang={otherLocale}
          >
            {t('common.language.switchTo')}
          </button>
          <button
            type="button"
            className={`${styles.toolButton} ${styles.iconButton}`}
            onClick={() => setMode(isDark ? 'light' : 'dark')}
            aria-label={isDark ? t('common.theme.toLight') : t('common.theme.toDark')}
            title={isDark ? t('common.theme.toLight') : t('common.theme.toDark')}
          >
            <ThemeIcon dark={isDark} />
          </button>

          {auth.status === 'loading' ? (
            // Session still restoring: hold the slot without guessing signed-in or out.
            <span aria-hidden="true">
              <ButtonBone size="sm" width="5.5rem" />
            </span>
          ) : auth.status === 'signedIn' ? (
            <SignedInNav isStaffAdmin={isStaffAdmin} />
          ) : (
            <>
              <Button to="/sign-in" variant="quiet" size="sm">
                {t('common.actions.signIn')}
              </Button>
              <Button to="/sign-up" variant="primary" size="sm" className={styles.signUp}>
                {t('common.actions.signUp')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
