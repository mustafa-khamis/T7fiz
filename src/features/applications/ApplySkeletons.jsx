import { useI18n } from '../../i18n/I18nProvider.jsx';
import { ButtonBone, Lines, SkeletonRegion } from '../../components/ui/Skeleton.jsx';
import styles from './Applications.module.css';

export function ApplySkeleton() {
  const { t } = useI18n();
  return (
    <SkeletonRegion className={styles.page} label={t('apply.loading')}>
      <Lines size="h1" widths={['60%']} />
      <Lines widths={['100%', '80%']} />
      <ButtonBone width="10rem" />
      <span className={styles.list}>
        <Lines widths={['70%']} />
        <Lines widths={['55%']} />
      </span>
    </SkeletonRegion>
  );
}
