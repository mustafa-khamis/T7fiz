import { useEffect } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { LEGAL } from './content.js';
import styles from './LegalPage.module.css';

/**
 * Privacy policy and terms of use, in the active language. A table of
 * contents links to each section; while the texts are drafts, a notice says
 * so plainly.
 */
export function LegalPage({ document: kind }) {
  const { t, locale, formatters } = useI18n();
  const doc = LEGAL[kind];
  const text = doc[locale] ?? doc.ar;
  const other = kind === 'privacy' ? 'terms' : 'privacy';

  useEffect(() => {
    globalThis.document.title = `${text.title} · ${t('common.appName')}`;
  }, [text.title, t]);

  return (
    <article className={styles.page} aria-labelledby="legal-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>{t('legal.eyebrow')}</p>
        <h1 id="legal-title" className={styles.title}>
          {text.title}
        </h1>
        <p className={styles.updated}>{t('legal.updated', { date: formatters.date(new Date(`${doc.updated}T12:00:00Z`)) })}</p>
        <Alert tone="warning" title={t('legal.draftTitle')}>
          {t('legal.draftBody')}
        </Alert>
        <p className={styles.intro}>{text.intro}</p>
      </header>

      <nav className={styles.toc} aria-labelledby="legal-toc">
        <h2 id="legal-toc" className={styles.tocTitle}>
          {t('legal.contents')}
        </h2>
        <ol>
          {text.sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.body}>
        {text.sections.map((section) => (
          <section key={section.id} id={section.id} className={styles.section} aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`} className={styles.sectionTitle}>
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {section.list && (
              <ul className={styles.list}>
                {section.list.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className={styles.footer}>
        <Link to={`/${other}`}>{t(`legal.${other}Link`)}</Link>
      </footer>
    </article>
  );
}
