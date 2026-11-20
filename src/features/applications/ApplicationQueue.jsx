import { Link } from 'react-router';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useApiQuery } from '../../lib/useApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './Applications.module.css';

const FILTERS = ['submitted', 'under_review', 'info_requested', 'interview_scheduled', 'approved', 'rejected'];

/** Applications waiting for (or decided by) this authority, oldest first. */
export function ApplicationQueue({ path }) {
  const { t, formatters } = useI18n();
  const [status, setStatus] = useState('submitted');
  const query = useApiQuery(`${path}?status=${status}`);
  return (
    <div className={styles.form}>
      <div className={styles.actions} role="group" aria-label={t('admin.filterLabel')}>
        {FILTERS.map((value) => (
          <Button key={value} size="sm" variant={value === status ? 'primary' : 'secondary'} aria-pressed={value === status} onClick={() => setStatus(value)}>
            {t(`status.${value}`)}
          </Button>
        ))}
      </div>
      {query.status === 'loading' && (
        <SkeletonRegion className={styles.rows}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={styles.row}>
              <Lines widths={['12rem']} />
              <Lines size="small" widths={['6rem']} />
            </span>
          ))}
        </SkeletonRegion>
      )}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' &&
        (query.data.length === 0 ? (
          <EmptyState title={t('apply.queueEmpty')} />
        ) : (
          <ul className={styles.rows}>
            {query.data.map((a) => (
              <li key={a.id} className={styles.row}>
                <Link to={`/apply/${a.id}`}>
                  {a.applicant.name}
                  {a.applicant.gender && ` · ${t(`auth.gender.${a.applicant.gender}`)}`}
                </Link>
                <span className={styles.actions}>
                  <span className={styles.hint}>{a.submittedAt && formatters.date(a.submittedAt)}</span>
                  <StatusBadge status={a.status} />
                </span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
