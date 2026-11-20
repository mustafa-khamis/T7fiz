import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../i18n/errors.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useApiQuery } from '../../lib/useApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmptyState, LoadError } from '../../components/ui/Status.jsx';
import { SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import { CircleCard, CircleCardSkeleton } from '../circles/CircleCard.jsx';
import styles from './AccountPage.module.css';

function Invitation({ invitation, onDone }) {
  const { t, formatters } = useI18n();
  const { api } = useAuth();
  const [state, setState] = useState({ busy: null, error: null });
  async function respond(action) {
    setState({ busy: action, error: null });
    try {
      await api.post(`/api/v1/invitations/${invitation.id}/${action}`, {});
      onDone();
    } catch (error) {
      setState({ busy: null, error });
    }
  }
  return (
    <Alert
      tone="info"
      title={t(`account.invitation.${invitation.role}`, { place: invitation.place.name })}
      action={
        <span className={styles.inlineActions}>
          <Button size="sm" loading={state.busy === 'accept'} onClick={() => respond('accept')}>
            {t('account.invitation.accept')}
          </Button>
          <Button size="sm" variant="secondary" loading={state.busy === 'decline'} onClick={() => respond('decline')}>
            {t('account.invitation.decline')}
          </Button>
        </span>
      }
    >
      {t('account.invitation.from', { name: invitation.inviterName, date: formatters.date(invitation.expiresAt) })}
      {state.error && <p>{errorMessage(t, state.error)}</p>}
    </Alert>
  );
}

function CardsSkeleton() {
  return (
    <SkeletonRegion className={styles.cards}>
      <CircleCardSkeleton />
      <CircleCardSkeleton />
    </SkeletonRegion>
  );
}

/** The circles section of the account page: invitations, memberships, teaching. */
export function MyCircles() {
  const { t } = useI18n();
  const memberships = useApiQuery('/api/v1/me/memberships');
  const teaching = useApiQuery('/api/v1/me/teaching');
  const invitations = useApiQuery('/api/v1/me/invitations');
  const refresh = () => {
    invitations.reload();
    memberships.reload();
  };

  return (
    <section className={styles.panel} aria-labelledby="circles-heading">
      <h2 id="circles-heading" className={styles.panelTitle}>
        {t('account.circles')}
      </h2>

      {invitations.status === 'ready' && invitations.data.length > 0 && (
        <div className={styles.cards}>
          {invitations.data.map((invitation) => (
            <Invitation key={invitation.id} invitation={invitation} onDone={refresh} />
          ))}
        </div>
      )}

      {memberships.status === 'loading' && <CardsSkeleton />}
      {memberships.status === 'error' && <LoadError error={memberships.error} onRetry={memberships.reload} />}
      {memberships.status === 'ready' &&
        (memberships.data.length === 0 ? (
          <EmptyState
            title={t('account.noCircles')}
            body={t('account.noCirclesBody')}
            action={
              <Button to="/circles" size="sm">
                {t('account.findCircle')}
              </Button>
            }
          />
        ) : (
          <div className={styles.cards}>
            {memberships.data.map((circle) => (
              <CircleCard key={circle.id} circle={circle} membership={circle.membership} />
            ))}
          </div>
        ))}

      {teaching.status === 'ready' && teaching.data.length > 0 && (
        <>
          <h3 className={styles.subTitle}>{t('account.teaching')}</h3>
          <div className={styles.cards}>
            {teaching.data.map((circle) => (
              <CircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
