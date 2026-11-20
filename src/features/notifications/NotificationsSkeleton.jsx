import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Bone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './Notifications.module.css';

export function NotificationsSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.page} label={t('notifications.loading')}>
      <Lines size="h1" widths={['12rem']} />
      <span className={styles.list}>
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} height="4rem" radius="md" />
        ))}
      </span>
    </SkeletonRegion>
  );
}
