import { Link, useNavigate, useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { useMe } from '../account/MeProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import styles from './Applications.module.css';
import { ApplySkeleton } from './ApplySkeletons.jsx';

/**
 * Apply to teach (SHK-1): to the platform (needed for an independent circle),
 * or to an institution through its link (?institutionId=…).
 */
export function ApplyPage() {
  const { t, formatters } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const institutionId = params.get('institutionId');
  const { me } = useMe();
  const mine = useApiQuery('/api/v1/me/sheikh-applications');
  const institution = useApiQuery(institutionId ? `/api/v1/institutions/${institutionId}` : null, { enabled: Boolean(institutionId) });
  const mutation = useMutation();

  if (mine.status === 'loading' || (institutionId && institution.status === 'loading')) return <ApplySkeleton />;
  const authorityName = institutionId ? institution.data?.name : t('apply.platform');
  const open = mine.data?.find(
    (a) => !['approved', 'rejected', 'withdrawn'].includes(a.status) && (institutionId ? a.authority.id === institutionId : a.authority.type === 'platform'),
  );

  async function start() {
    const created = await mutation.run('start', (api) =>
      api.post('/api/v1/sheikh-applications', {
        authorityType: institutionId ? 'institution' : 'platform',
        ...(institutionId ? { institutionId } : {}),
        fullName: me?.displayName?.length >= 2 ? me.displayName : '—',
      }),
    );
    if (created) navigate(`/apply/${created.id}`);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('apply.pageTitle')}</h1>
        <p className={styles.lead}>{institutionId ? t('apply.introInstitution', { name: authorityName ?? '' }) : t('apply.intro')}</p>
      </header>
      {institutionId && institution.status === 'error' && <LoadError error={institution.error} />}
      {mutation.error && <Alert tone="danger">{errorMessage(t, mutation.error)}</Alert>}
      <ol className={styles.steps}>
        {['write', 'record', 'review', 'decision'].map((step) => (
          <li key={step}>
            <strong>{t(`apply.steps.${step}.title`)}</strong>
            <span>{t(`apply.steps.${step}.body`)}</span>
          </li>
        ))}
      </ol>
      {open ? (
        <Alert tone="info" title={t('apply.openExists')} action={<Button size="sm" to={`/apply/${open.id}`}>{t('apply.continue')}</Button>}>
          {t('apply.openExistsBody', { authority: authorityName ?? '' })}
        </Alert>
      ) : (
        <div className={styles.actions}>
          <Button loading={mutation.busy === 'start'} onClick={start} disabled={Boolean(institutionId) && institution.status !== 'ready'}>
            {t('apply.start', { authority: authorityName ?? '' })}
          </Button>
        </div>
      )}

      <section className={styles.section} aria-labelledby="my-applications">
        <h2 id="my-applications" className={styles.sectionTitle}>
          {t('apply.myApplications')}
        </h2>
        {mine.status === 'error' && <LoadError error={mine.error} onRetry={mine.reload} />}
        {mine.status === 'ready' &&
          (mine.data.length === 0 ? (
            <EmptyState title={t('apply.none')} />
          ) : (
            <ul className={styles.rows}>
              {mine.data.map((a) => (
                <li key={a.id} className={styles.row}>
                  <Link to={`/apply/${a.id}`}>{a.authority.type === 'platform' ? t('apply.platform') : a.authority.name}</Link>
                  <span className={styles.actions}>
                    <span className={styles.hint}>{formatters.date(a.submittedAt ?? a.createdAt)}</span>
                    <StatusBadge status={a.status} />
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}
