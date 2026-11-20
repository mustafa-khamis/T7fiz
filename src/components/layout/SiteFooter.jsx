import { useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { BrandLogo } from '../brand/BrandLogo.jsx';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  const { t, formatters } = useI18n();
  const [year] = useState(() => new Date().getFullYear());
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <BrandLogo height={32} />
          <p>{t('footer.tagline')}</p>
        </div>
        <nav className={styles.links} aria-label={t('footer.legalNav')}>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
        </nav>
        <p className={styles.muted}>{t('footer.copyright', { year: formatters.integer(year) })}</p>
      </div>
    </footer>
  );
}
