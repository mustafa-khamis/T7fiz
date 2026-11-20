import { useI18n } from '../../i18n/I18nProvider.jsx';
import { ButtonBone, FieldBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './Applications.module.css';

export function ApplicationSkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.page} label={t('apply.loading')}>
      <Lines size="small" widths={['8rem']} />
      <Lines size="h1" widths={['70%']} />
      <ButtonBone size="sm" width="6rem" />
      <span className={styles.section}>
        <Lines size="h3" widths={['9rem']} />
        <FieldBone labelWidth="6rem" />
        <FieldBone labelWidth="8rem" />
      </span>
      <span className={styles.section}>
        <Lines size="h3" widths={['7rem']} />
        <FieldBone labelWidth="5rem" />
      </span>
    </SkeletonRegion>
  );
}
