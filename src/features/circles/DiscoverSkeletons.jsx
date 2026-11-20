import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import { CircleCardSkeleton } from './CircleCard.jsx';
import styles from './Circles.module.css';

export function GridSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 6 }, (_, index) => (
        <CircleCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function DiscoverSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.page} label={t('circles.loading')}>
      <span className={styles.header}>
        <Lines size="h1" widths={['14rem']} />
        <Lines widths={['60%']} />
      </span>
      <GridSkeleton />
    </SkeletonRegion>
  );
}
