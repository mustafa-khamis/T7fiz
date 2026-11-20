import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useApiQuery, useLiveTopic } from '../../lib/useApi.js';
import { useMutation } from '../../lib/useMutation.js';
import { useMe } from '../account/MeProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmptyState, LoadError } from '../../components/ui/Status.jsx';
import styles from './Notifications.module.css';
import { NotificationsSkeleton } from './NotificationsSkeleton.jsx';
import { PushSettings } from '../push/PushSettings.jsx';
import { targetOf } from './links.js';

/** The people and places a notification is about (short labels stored with it). */
function detailOf(payload = {}) {
  const who = payload.studentName || payload.guestName || payload.requesterName || payload.inviteeName || payload.inviterName || payload.applicantName;
  const where = payload.circleName || payload.mainCircleName || payload.institutionName || payload.placeName;
  return [who, where].filter(Boolean).join(' · ');
}

export function NotificationsPage() {
  const { t, formatters } = useI18n();
  const { me } = useMe();
  const query = useApiQuery('/api/v1/me/notifications');
  useLiveTopic(me ? `user:${me.id}` : null, query.reload);
  const mark = useMutation();
  const unread = query.data?.filter((n) => !n.read).length ?? 0;

  async function markAll() {
    if (await mark.run('all', (api) => api.post('/api/v1/me/notifications/read', {}))) query.setData((rows) => rows.map((n) => ({ ...n, read: true })));
  }

  if (query.status === 'loading') return <NotificationsSkeleton />;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('notifications.title')}</h1>
        {unread > 0 && (
          <Button size="sm" variant="secondary" loading={mark.busy === 'all'} onClick={markAll}>
            {t('notifications.markAllRead')}
          </Button>
        )}
      </header>
      <PushSettings />
      {mark.error && <Alert tone="danger">{errorMessage(t, mark.error)}</Alert>}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {query.status === 'ready' && query.data.length === 0 && <EmptyState title={t('notifications.empty')} body={t('notifications.emptyBody')} />}
      {query.status === 'ready' && query.data.length > 0 && (
        <ul className={styles.list}>
          {query.data.map((n) => {
            const key = `notifications.kinds.${n.kind.replace(/\./g, '_')}`;
            const label = t(key) === key ? t('notifications.kinds.other') : t(key);
            const to = targetOf(n);
            return (
              <li key={n.id} className={styles.item} data-unread={!n.read}>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.text}>
                  <span className={styles.label}>{label}</span>
                  {detailOf(n.payload) && <span className={styles.detail}>{detailOf(n.payload)}</span>}
                  <time className={styles.time} dateTime={n.at}>
                    {formatters.dateTime(n.at)}
                  </time>
                </span>
                {to && (
                  <Button size="sm" variant="quiet" to={to}>
                    {t('notifications.view')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
