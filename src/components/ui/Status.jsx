import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Button } from './Button.jsx';
import { Alert } from './Alert.jsx';
import { errorMessage } from '../../i18n/errors.js';
import styles from './Status.module.css';

const TONES = {
  active: 'success',
  approved: 'success',
  accepted: 'success',
  pending: 'warning',
  pending_review: 'warning',
  suspended: 'danger',
  rejected: 'danger',
  revoked: 'danger',
  closed: 'neutral',
  archived: 'neutral',
  left: 'neutral',
  removed: 'neutral',
  cancelled: 'neutral',
  draft: 'neutral',
  submitted: 'warning',
  under_review: 'warning',
  info_requested: 'warning',
  interview_scheduled: 'warning',
  withdrawn: 'neutral',
  paused: 'warning',
  live: 'success',
  scheduled: 'neutral',
  ended: 'neutral',
  present: 'success',
  late: 'warning',
  absent: 'danger',
  excused: 'neutral',
  declined: 'neutral',
  completed: 'success',
  expired: 'neutral',
};

/** A status word with a tone (and a dot, so meaning never relies on colour alone). */
export function StatusBadge({ status }) {
  const { t } = useI18n();
  return (
    <span className={`${styles.badge} ${styles[TONES[status] ?? 'neutral']}`}>
      <span className={styles.dot} aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}

/** A deliberate empty state: what is missing, why, and the next step. */
export function EmptyState({ title, body, action }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {body && <p className={styles.emptyBody}>{body}</p>}
      {action}
    </div>
  );
}

/** Error with a retry, for content that failed to load. */
export function LoadError({ error, onRetry, title }) {
  const { t } = useI18n();
  return (
    <Alert
      tone="danger"
      title={title ?? t('common.loadFailed')}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t('common.actions.retry')}
          </Button>
        )
      }
    >
      {errorMessage(t, error)}
    </Alert>
  );
}
