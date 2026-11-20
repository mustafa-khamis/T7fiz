import { Link } from 'react-router';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Bone, ButtonBone, Lines } from '../../components/ui/Skeleton.jsx';
import { StatusBadge } from '../../components/ui/Status.jsx';
import styles from './Circles.module.css';

/** Seats as words and a bar ("5 of 20 seats left"). */
export function Seats({ circle }) {
  const { t, formatters } = useI18n();
  if (circle.activeCount === null || circle.activeCount === undefined) return null;
  const taken = Math.min(circle.activeCount, circle.capacity);
  const full = taken >= circle.capacity;
  return (
    <div className={styles.seats}>
      <span className={styles.seatsText}>
        {full
          ? t('circles.full')
          : t('circles.seatsLeft', { left: formatters.integer(circle.capacity - taken), capacity: formatters.integer(circle.capacity) })}
      </span>
      <span
        className={styles.seatsBar}
        role="meter"
        aria-label={t('circles.seatsMeter')}
        aria-valuemin={0}
        aria-valuemax={circle.capacity}
        aria-valuenow={taken}
        data-full={full || undefined}
      >
        <span style={{ inlineSize: `${(taken / circle.capacity) * 100}%` }} />
      </span>
    </div>
  );
}

export function EnrollmentLabel({ circle }) {
  const { t } = useI18n();
  return <span className={styles.enrollment}>{t(`circles.enrollment.${circle.effectiveEnrollment}`)}</span>;
}

/** A circle in a list: what it is, who teaches, seats, and how to join. */
export function CircleCard({ circle, membership }) {
  const { t } = useI18n();
  const sheikh = circle.sheikhs.find((s) => s.role === 'primary') ?? circle.sheikhs[0];
  const place = circle.institution?.name ?? circle.mainCircle.name;
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          <Link to={`/circles/${circle.id}`} className={styles.cardLink}>
            {circle.name}
          </Link>
        </h3>
        {membership ? <StatusBadge status={membership.status} /> : <EnrollmentLabel circle={circle} />}
      </div>
      <p className={styles.meta}>
        {place}
        {circle.institution && ` · ${circle.mainCircle.name}`}
      </p>
      <p className={styles.meta}>{sheikh ? t('circles.sheikh', { name: sheikh.name }) : t('circles.noSheikh')}</p>
      <Seats circle={circle} />
    </article>
  );
}

/** Same footprint as CircleCard. */
export function CircleCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <Lines size="h3" widths={['60%']} />
        <ButtonBone size="sm" width="5.5rem" />
      </div>
      <Lines size="small" widths={['45%', '35%']} />
      <div className={styles.seats}>
        <Lines size="small" widths={['30%']} />
        <Bone height="6px" radius="pill" />
      </div>
    </div>
  );
}
