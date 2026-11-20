import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useApiQuery } from '../../lib/useApi.js';
import { formatMoney } from '../../lib/money.js';
import { Alert } from '../../components/ui/Alert.jsx';
import { EmptyState, LoadError, StatusBadge } from '../../components/ui/Status.jsx';
import { Lines } from '../../components/ui/Skeleton.jsx';
import styles from './Manage.module.css';

/** The institution's subscription and manual payment history (managers only). */
export function BillingSection({ institutionId }) {
  const { t, formatters, locale } = useI18n();
  const query = useApiQuery(`/api/v1/institutions/${institutionId}/billing`);
  const data = query.data;
  const sub = data?.subscription;

  return (
    <section className={styles.section} aria-labelledby="inst-billing">
      <h2 id="inst-billing" className={styles.sectionTitle}>
        {t('billing.title')}
      </h2>
      {query.status === 'loading' && <Lines widths={['50%', '70%', '40%']} />}
      {query.status === 'error' && <LoadError error={query.error} onRetry={query.reload} />}
      {data && !data.billed && <p className={styles.muted}>{t('billing.notBilled')}</p>}
      {data?.billed && !sub && <EmptyState title={t('billing.noSubscription')} body={t('billing.noSubscriptionBody')} />}
      {data?.billed && sub && (
        <>
          {!data.inGoodStanding && <Alert tone="danger">{t('billing.inactive')}</Alert>}
          {sub.status === 'grace_period' && <Alert tone="warning">{t('billing.grace')}</Alert>}
          <dl className={styles.facts}>
            <div>
              <dt>{t('billing.plan')}</dt>
              <dd>
                {data.plan?.name[locale] ?? data.plan?.name.ar}
                {data.plan && <span className={styles.muted}> · {t('billing.price', { price: formatMoney(data.plan.monthlyPriceMinor, data.plan.currency, formatters.tag) })}</span>}
              </dd>
            </div>
            <div>
              <dt>{t('billing.status')}</dt>
              <dd>
                <StatusBadge status={sub.status} />
              </dd>
            </div>
            {sub.currentPeriodEnd && (
              <div>
                <dt>{t('billing.paidUntil')}</dt>
                <dd>{formatters.date(sub.currentPeriodEnd)}</dd>
              </div>
            )}
            {sub.graceUntil && (
              <div>
                <dt>{t('billing.graceUntil')}</dt>
                <dd>{formatters.date(sub.graceUntil)}</dd>
              </div>
            )}
          </dl>
          <h3 className={styles.sectionTitle}>{t('billing.payments')}</h3>
          {data.payments.length === 0 ? (
            <p className={styles.muted}>{t('billing.noPayments')}</p>
          ) : (
            <ul className={styles.rows}>
              {data.payments.map((p) => (
                <li key={p.id} className={styles.row}>
                  <span>
                    <strong>{formatMoney(p.amountMinor, p.currency, formatters.tag)}</strong> · {t('billing.months', { count: p.months })}
                    <span className={styles.muted}>
                      {' · '}
                      {formatters.date(p.paidOn)} · <bdi dir="ltr">{p.reference}</bdi> · {t('billing.recordedByAdmin')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
