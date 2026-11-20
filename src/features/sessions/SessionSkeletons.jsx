import { useI18n } from '../../i18n/I18nProvider.jsx';
import { ButtonBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './Sessions.module.css';

export function SessionSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.page} label={t('sessions.loading')}>
      <Lines size="small" widths={['10rem']} />
      <span className={styles.header}>
        <Lines size="h1" widths={['55%']} />
        <Lines size="small" widths={['14rem']} />
      </span>
      <span className={styles.stage}>
        <Lines size="h2" widths={['14rem']} />
        <Lines size="small" widths={['18rem']} />
        <ButtonBone width="10rem" />
      </span>
    </SkeletonRegion>
  );
}
