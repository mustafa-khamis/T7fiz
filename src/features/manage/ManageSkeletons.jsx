import { useI18n } from '../../i18n/I18nProvider.jsx';
import { ButtonBone, FieldBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import { CircleCardSkeleton } from '../circles/CircleCard.jsx';
import styles from './Manage.module.css';

export function FormPageSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={`${styles.page} ${styles.narrow}`} label={t('manage.loading')}>
      <Lines size="h1" widths={['55%']} />
      <Lines widths={['90%']} />
      <FieldBone labelWidth="5rem" />
      <FieldBone labelWidth="7rem" />
      <FieldBone labelWidth="6rem" hint />
      <ButtonBone width="8rem" />
    </SkeletonRegion>
  );
}

export function ManageSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.page} label={t('manage.loading')}>
      <Lines size="h1" widths={['12rem']} />
      <Lines widths={['60%']} />
      <span className={styles.actions}>
        <ButtonBone width="9rem" />
        <ButtonBone width="11rem" />
      </span>
      <span className={styles.grid}>
        <CircleCardSkeleton />
        <CircleCardSkeleton />
      </span>
    </SkeletonRegion>
  );
}
