import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import styles from './HomePage.module.css';

const WORKFLOW_STEPS = ['recite', 'revise', 'complete'];
const STRUCTURE_LEVELS = ['institution', 'mainCircle', 'circle', 'students'];
const PATHS = [
  { key: 'join', intent: 'join-circle', featured: true },
  { key: 'createCircle', intent: 'create-circle' },
  { key: 'freeInstitution', intent: 'free-institution' },
  { key: 'privateInstitution', intent: 'private-institution' },
];

function HorizonLine() {
  // A single low dune line — the only ornament on the page.
  return (
    <svg className={styles.horizon} viewBox="0 0 1200 48" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 40 C 180 40, 260 14, 420 16 S 690 42, 860 34 S 1080 10, 1200 18" fill="none" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function HomePage() {
  const { t, formatters } = useI18n();
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.container}>
          <h1 id="hero-title" className={styles.heroTitle}>
            {t('home.hero.title')}
          </h1>
          <p className={styles.lead}>{t('home.hero.lead')}</p>
          <div className={styles.heroActions}>
            <Button to={signedIn ? '/account' : '/sign-up'}>{t('home.hero.primaryCta')}</Button>
            <Button variant="secondary" href="#how">
              {t('home.hero.secondaryCta')}
            </Button>
          </div>
        </div>
        <HorizonLine />
      </section>

      <section id="how" tabIndex={-1} className={styles.section} aria-labelledby="how-title">
        <div className={styles.container}>
          <h2 id="how-title" className={styles.sectionTitle}>
            {t('home.workflow.title')}
          </h2>
          <p className={styles.sectionIntro}>{t('home.workflow.intro')}</p>
          <ol className={styles.steps}>
            {WORKFLOW_STEPS.map((step, index) => (
              <li key={step} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {formatters.integer(index + 1)}
                </span>
                <h3 className={styles.stepTitle}>{t(`home.workflow.${step}.title`)}</h3>
                <p className={styles.stepBody}>{t(`home.workflow.${step}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sunken}`} aria-labelledby="structure-title">
        <div className={`${styles.container} ${styles.split}`}>
          <div>
            <h2 id="structure-title" className={styles.sectionTitle}>
              {t('home.structure.title')}
            </h2>
            <p className={styles.sectionIntro}>{t('home.structure.intro')}</p>
          </div>
          <ol className={styles.tree}>
            {STRUCTURE_LEVELS.map((level, depth) => (
              <li key={level} className={styles.treeLevel} style={{ '--depth': depth }}>
                <p className={styles.treeName}>{t(`home.structure.${level}.name`)}</p>
                <p className={styles.treeBody}>{t(`home.structure.${level}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="paths" tabIndex={-1} className={styles.section} aria-labelledby="paths-title">
        <div className={styles.container}>
          <h2 id="paths-title" className={styles.sectionTitle}>
            {t('home.paths.title')}
          </h2>
          <p className={styles.sectionIntro}>{t('home.paths.intro')}</p>
          <ul className={styles.paths}>
            {PATHS.map(({ key, intent, featured }) => (
              <li key={key} className={`${styles.path} ${featured ? styles.pathFeatured : ''}`}>
                <p className={styles.pathAudience}>{t(`home.paths.${key}.audience`)}</p>
                <h3 className={styles.pathTitle}>{t(`home.paths.${key}.title`)}</h3>
                <p className={styles.pathBody}>{t(`home.paths.${key}.body`)}</p>
                <div className={styles.pathFooter}>
                  {signedIn ? (
                    <p className={styles.pathPending}>{t('home.paths.pending')}</p>
                  ) : (
                    <Button to={`/sign-up?intent=${intent}`} variant={featured ? 'primary' : 'secondary'}>
                      {t('home.paths.cta')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="sheikhs-title">
        <div className={`${styles.container} ${styles.split}`}>
          <h2 id="sheikhs-title" className={styles.sectionTitle}>
            {t('home.sheikhs.title')}
          </h2>
          <div className={styles.prose}>
            <p>{t('home.sheikhs.body')}</p>
            <p>{t('home.sheikhs.review')}</p>
          </div>
        </div>
      </section>
    </>
  );
}
