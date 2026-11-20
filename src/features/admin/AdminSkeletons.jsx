import { useI18n } from '../../i18n/I18nProvider.jsx';
import { ButtonBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './AdminPage.module.css';

/** Card-shaped placeholders for a list of review items. */
export function ReviewListSkeleton({ rows = 3 }) {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.list} label={t('admin.loading')}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.cardHead}>
            <Lines size="h3" widths={['55%']} />
            <ButtonBone size="sm" width="5rem" />
          </div>
          <Lines size="small" widths={['80%', '45%']} />
          <div className={styles.cardActions}>
            <ButtonBone size="sm" width="6rem" />
            <ButtonBone size="sm" width="6rem" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function AdminSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.page} label={t('admin.loading')}>
      <Lines size="h1" widths={['10rem']} />
      <Lines widths={['70%']} />
      <ReviewListSkeleton />
    </SkeletonRegion>
  );
}
